import { useState } from 'react';
import { generateCode, formatBytes, formatCountdown } from '../utils/helpers';
import { useRecentShares, useCountdown } from '../hooks/useShares';
import { createShare, codeExists } from '../services/shareService';
import { isFirebaseConfigured } from '../firebase';
import FileUpload from '../components/ui/FileUpload';
import CodeEditor from '../components/ui/CodeEditor';
import QRCode from '../components/ui/QRCode';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiSend, FiCopy, FiCheck, FiLock, FiEye, FiTrash2, FiClock, FiArrowRight, FiCode, FiFileText, FiInfo } from 'react-icons/fi';

export default function Send() {
  const [mode, setMode] = useState('text');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [oneTimeView, setOneTimeView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const { shares, addShare, removeShare, clearAll } = useRecentShares();
  const remaining = useCountdown(expiresAt);

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy.'); }
  };

  const handleSubmit = async () => {
    if (!message.trim() && !file) { toast.error('Please enter a message or upload a file.'); return; }
    setLoading(true); setProgress(0);
    try {
      // Generate unique code with collision check
      let code, attempts = 0;
      do {
        code = generateCode();
        const exists = await codeExists(code);
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) { toast.error('Unable to generate unique code. Try again.'); setLoading(false); return; }

      const shareData = {
        code,
        message: message.trim(),
        contentType: mode,
        oneTimeView,
        passwordProtected: !!password,
        password: password || '',
      };

      const result = await createShare(shareData, file, setProgress);

      setGeneratedCode(result.code);
      setExpiresAt(result.expiresAt);

      addShare({
        code: result.code,
        type: file ? 'file' : 'text',
        name: file ? file.name : message.slice(0, 40),
        createdAt: new Date().toISOString(),
      });

      toast.success('Share created successfully!');
      if (result.fileStorageMode === 'local') {
        toast('Large file stored locally — retrievable on this browser only.', { icon: '📁', duration: 5000 });
      }
    } catch (error) {
      console.error('Share creation error:', error);
      const errMsg = error?.message || error?.code || 'Unknown error';
      toast.error('Failed to create share: ' + errMsg);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setMessage(''); setFile(null); setPassword(''); setOneTimeView(false);
    setGeneratedCode(null); setExpiresAt(null); setProgress(0); setCopied(false);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
            <span className="gradient-text">Send</span> Content
          </h1>
          <p className="mt-2 text-surface-500 dark:text-surface-400">
            Drop a message, code snippet, or file to generate a share code.
          </p>
        </div>

        {/* Demo mode banner */}
        {!isFirebaseConfigured() && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-fade-in">
            <FiInfo className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Demo Mode</strong> — Data is stored in your browser's localStorage. Add Firebase credentials to <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">.env</code> for real cloud storage.
            </p>
          </div>
        )}

        {generatedCode ? (
          <div className="animate-scale-in">
            <div className="glass-card p-8 md:p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                <FiCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">Share Created!</h2>
              <p className="text-surface-500 dark:text-surface-400 mb-8">Share this code with anyone to let them access your content.</p>

              <div className="mb-6">
                <div className="code-display mb-4">{generatedCode}</div>
                <button onClick={handleCopyCode} id="copy-code-btn" className="btn-primary">
                  {copied ? <><FiCheck className="w-5 h-5" />Copied!</> : <><FiCopy className="w-5 h-5" />Copy Code</>}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-surface-500 dark:text-surface-400 mb-8">
                <FiClock className="w-4 h-4" />
                <span>Expires in: <strong className="text-brand-500">{formatCountdown(remaining)}</strong></span>
              </div>

              <QRCode value={generatedCode} />

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {oneTimeView && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    <FiEye className="w-3 h-3" />One-time view
                  </span>
                )}
                {password && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400">
                    <FiLock className="w-3 h-3" />Password protected
                  </span>
                )}
              </div>

              <button onClick={handleReset} className="mt-8 btn-secondary" id="create-another-btn">
                Create Another Share <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Mode toggle */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-100 dark:bg-surface-800 w-fit mx-auto">
              <button onClick={() => setMode('text')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'text' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-surface-500 dark:text-surface-400'}`}>
                <FiFileText className="w-4 h-4" />Text / Message
              </button>
              <button onClick={() => setMode('code')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'code' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-surface-500 dark:text-surface-400'}`}>
                <FiCode className="w-4 h-4" />Code Snippet
              </button>
            </div>

            {/* Content input */}
            <div className="glass-card p-6">
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
                {mode === 'code' ? 'Code Snippet' : 'Message / Text'}
              </label>
              {mode === 'code' ? (
                <CodeEditor value={message} onChange={setMessage} />
              ) : (
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message, paste text, or leave empty if uploading a file..." rows={6} className="input-field resize-y min-h-[150px]" id="message-input" />
              )}
            </div>

            {/* File upload */}
            <div className="glass-card p-6">
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
                File Upload <span className="font-normal text-surface-400">(optional)</span>
              </label>
              <FileUpload file={file} onFileSelect={setFile} onFileClear={() => setFile(null)} />
            </div>

            {/* Share options */}
            <div className="glass-card p-6">
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Share Options</label>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FiLock className="w-4 h-4 text-surface-400" />
                    <span className="text-sm text-surface-600 dark:text-surface-300">Password Protection</span>
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for no password" className="input-field" id="password-input" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer" id="one-time-toggle">
                  <div className="relative">
                    <input type="checkbox" checked={oneTimeView} onChange={(e) => setOneTimeView(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 rounded-full bg-surface-200 dark:bg-surface-700 peer-checked:bg-brand-500 transition-colors duration-300" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 peer-checked:translate-x-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">One-time view</span>
                    <p className="text-xs text-surface-400 dark:text-surface-500">Content is deleted after first retrieval</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Upload progress */}
            {loading && progress > 0 && progress < 100 && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-600 dark:text-surface-300">Uploading...</span>
                  <span className="text-sm font-bold text-brand-500">{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading || (!message.trim() && !file)} className="btn-primary w-full py-4 text-lg" id="generate-code-btn">
              {loading ? <><Spinner size="sm" />Generating...</> : <><FiSend className="w-5 h-5" />Generate Share Code</>}
            </button>

            {/* File size indicator */}
            {file && (
              <div className="text-center">
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  Total share size: <strong>{formatBytes(file.size + new Blob([message]).size)}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recent shares */}
        {shares.length > 0 && (
          <div className="mt-12 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Recent Shares</h2>
              <button onClick={clearAll} className="text-xs text-surface-400 hover:text-red-500 transition-colors" id="clear-recent-btn">Clear all</button>
            </div>
            <div className="space-y-2">
              {shares.map((s) => (
                <div key={s.code} className="glass-card p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-brand-500 text-sm">{s.code}</span>
                    <span className="text-sm text-surface-500 dark:text-surface-400 truncate">{s.name || s.type}</span>
                  </div>
                  <button onClick={() => removeShare(s.code)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-all" aria-label="Remove">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
