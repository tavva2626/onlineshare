import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCode, formatCountdown } from '../utils/helpers';
import { useCountdown } from '../hooks/useShares';
import {
  createClipboard,
  getClipboard,
  updateClipboardContent,
  subscribeToClipboard,
  clipboardExists
} from '../services/clipboardService';
import { isFirebaseConfigured } from '../firebase';
import {
  FiClipboard,
  FiCopy,
  FiCheck,
  FiArrowLeft,
  FiTrash2,
  FiPlus,
  FiLink,
  FiInfo
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Clipboard() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  
  // Real-time editor states
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  // Refs for tracking changes and avoiding loops
  const lastSentValue = useRef('');
  const debounceTimer = useRef(null);
  
  const remaining = useCountdown(expiresAt);

  // Subscribe to changes once code is established and user joins
  useEffect(() => {
    if (!isInRoom || !code) return;

    const unsubscribe = subscribeToClipboard(code, (data) => {
      if (!data) {
        toast.error('Clipboard expired or deleted.');
        handleLeave();
        return;
      }
      
      setExpiresAt(data.expiresAt);

      // Only update local text if the remote content differs from our last sent value
      // and differs from current input (meaning it came from someone else)
      if (data.content !== lastSentValue.current && data.content !== content) {
        setContent(data.content || '');
        lastSentValue.current = data.content || '';
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [isInRoom, code]);

  // Handle local text changes
  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);

    // Debounce database write (500ms)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      try {
        lastSentValue.current = val;
        await updateClipboardContent(code, val);
      } catch (err) {
        console.error('Failed to sync clipboard:', err);
        toast.error('Sync failed. Reconnecting...');
      }
    }, 500);
  };

  // Create new room
  const handleCreate = async () => {
    setLoading(true);
    try {
      let newCode, attempts = 0;
      do {
        newCode = generateCode();
        const exists = await clipboardExists(newCode);
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        toast.error('Failed to generate unique code. Try again.');
        setLoading(false);
        return;
      }

      const res = await createClipboard(newCode);
      setCode(res.code);
      setExpiresAt(res.expiresAt);
      setContent('');
      lastSentValue.current = '';
      setIsInRoom(true);
      toast.success('Live Clipboard Created!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create clipboard.');
    } finally {
      setLoading(false);
    }
  };

  // Join existing room
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode || joinCode.length !== 4) {
      toast.error('Please enter a 4-digit code.');
      return;
    }

    setLoading(true);
    try {
      const exists = await clipboardExists(joinCode);
      if (!exists) {
        toast.error('Clipboard not found or expired.');
        setLoading(false);
        return;
      }

      const clip = await getClipboard(joinCode);
      if (clip) {
        setCode(joinCode);
        setExpiresAt(clip.expiresAt);
        setContent(clip.content || '');
        lastSentValue.current = clip.content || '';
        setIsInRoom(true);
        toast.success('Joined Live Clipboard!');
      } else {
        toast.error('Could not join clipboard.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error joining clipboard.');
    } finally {
      setLoading(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  // Copy textarea content
  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(true);
      toast.success('Clipboard content copied!');
      setTimeout(() => setCopiedContent(false), 2000);
    } catch {
      toast.error('Failed to copy content.');
    }
  };

  // Clear content
  const handleClear = async () => {
    setContent('');
    lastSentValue.current = '';
    try {
      await updateClipboardContent(code, '');
      toast.success('Clipboard cleared');
    } catch (err) {
      toast.error('Failed to clear clipboard');
    }
  };

  const handleLeave = () => {
    setIsInRoom(false);
    setCode('');
    setJoinCode('');
    setContent('');
    lastSentValue.current = '';
    setExpiresAt(null);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
            Live <span className="gradient-text">Clipboard</span> Sync
          </h1>
          <p className="mt-2 text-surface-500 dark:text-surface-400">
            Real-time synchronized clipboard. Copy on one device, paste on another instantly.
          </p>
        </div>

        {/* Demo banner */}
        {!isFirebaseConfigured() && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <FiInfo className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Demo Mode</strong> — Real-time updates only work across tabs in the same browser. Configure Firebase for cross-device sync.
            </p>
          </div>
        )}

        {isInRoom ? (
          /* ─── Sync Mode UI ─── */
          <div className="space-y-6 animate-scale-in">
            <div className="glass-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-surface-600 dark:text-surface-300">Connected</span>
                </div>
                <div className="h-4 w-px bg-surface-200 dark:bg-surface-700 hidden md:block" />
                <div className="text-sm text-surface-500 dark:text-surface-400">
                  Code: <strong className="font-mono text-brand-500 text-lg ml-1">{code}</strong>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition"
                  title="Copy room code"
                >
                  {copiedCode ? <FiCheck className="w-4 h-4 text-emerald-500" /> : <FiCopy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-4 justify-between md:justify-end">
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  Expires in: <span className="font-semibold text-brand-500">{formatCountdown(remaining)}</span>
                </div>
                <button
                  onClick={handleLeave}
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition"
                >
                  <FiArrowLeft className="w-4 h-4" /> Leave Room
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start typing or paste text here... Changes will sync instantly to all devices connected to this code."
                rows={12}
                className="w-full bg-transparent border-0 outline-none focus:ring-0 text-surface-900 dark:text-surface-100 resize-y min-h-[300px] placeholder-surface-400 dark:placeholder-surface-600 text-base leading-relaxed"
              />

              <div className="mt-4 pt-4 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between">
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  Character count: {content.length}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={handleClear}
                    disabled={!content}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 disabled:opacity-50 transition"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                  <button
                    onClick={handleCopyContent}
                    disabled={!content}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 transition"
                  >
                    {copiedContent ? (
                      <><FiCheck className="w-3.5 h-3.5" /> Copied</>
                    ) : (
                      <><FiCopy className="w-3.5 h-3.5" /> Copy Content</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Entry Mode UI (Join/Create) ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Create New Card */}
            <div className="glass-card p-8 flex flex-col justify-between text-center md:text-left">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white mb-6 mx-auto md:mx-0 shadow-lg shadow-brand-500/25">
                  <FiPlus className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Create Sync Room</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                  Start a new live synchronization session. A unique 4-digit code will be generated.
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            {/* Join Existing Card */}
            <div className="glass-card p-8 flex flex-col justify-between text-center md:text-left">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-brand-500 flex items-center justify-center text-white mb-6 mx-auto md:mx-0 shadow-lg shadow-accent-500/25">
                  <FiLink className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Join Sync Room</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                  Enter an existing 4-digit code to connect to another device's active clipboard.
                </p>
              </div>
              
              <form onSubmit={handleJoin} className="space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit code"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 text-center font-mono text-xl tracking-widest outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={loading || joinCode.length !== 4}
                  className="btn-secondary w-full py-3"
                >
                  {loading ? 'Joining...' : 'Join Room'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
