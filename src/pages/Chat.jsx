import { useState, useEffect, useRef } from 'react';
import { generateCode, formatCountdown } from '../utils/helpers';
import { useCountdown } from '../hooks/useShares';
import {
  createChatRoom,
  chatRoomExists,
  sendMessage,
  subscribeToMessages,
  getChatRoom
} from '../services/chatService';
import { isFirebaseConfigured } from '../firebase';
import {
  FiMessageCircle,
  FiSend,
  FiCopy,
  FiCheck,
  FiLogOut,
  FiPlus,
  FiUsers,
  FiInfo
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export default function Chat() {
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('quickshare24-chat-nickname') || '';
  });
  const [userColor, setUserColor] = useState('');
  const [isInChat, setIsInChat] = useState(false);
  
  // Chat messaging states
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const messagesEndRef = useRef(null);
  const remaining = useCountdown(expiresAt);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isInChat) {
      scrollToBottom();
    }
  }, [messages, isInChat]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!isInChat || !code) return;

    const unsubscribe = subscribeToMessages(code, (msgs) => {
      setMessages(msgs);
    });

    // Check expiration timer
    const checkExpiry = async () => {
      try {
        const room = await getChatRoom(code);
        if (!room) {
          toast.error('Chat room expired or deleted.');
          handleLeave();
        } else {
          setExpiresAt(room.expiresAt);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkExpiry();

    return () => {
      unsubscribe();
    };
  }, [isInChat, code]);

  // Handle message submission
  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    try {
      await sendMessage(code, {
        text,
        sender: nickname || 'Anonymous',
        senderColor: userColor,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message.');
    }
  };

  // Create new chat room
  const handleCreate = async () => {
    const nick = nickname.trim();
    if (!nick) {
      toast.error('Please enter a nickname.');
      return;
    }
    localStorage.setItem('quickshare24-chat-nickname', nick);
    
    setLoading(true);
    try {
      let newCode, attempts = 0;
      do {
        newCode = generateCode();
        const exists = await chatRoomExists(newCode);
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        toast.error('Failed to generate unique code. Try again.');
        setLoading(false);
        return;
      }

      await createChatRoom(newCode);
      
      // Setup user identity
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      setUserColor(randomColor);
      setCode(newCode);
      setMessages([]);
      setIsInChat(true);
      
      toast.success('Temp Chat Room Created!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create chat room.');
    } finally {
      setLoading(false);
    }
  };

  // Join existing chat room
  const handleJoin = async (e) => {
    e.preventDefault();
    const nick = nickname.trim();
    if (!nick) {
      toast.error('Please enter a nickname.');
      return;
    }
    if (!joinCode || joinCode.length !== 4) {
      toast.error('Please enter a 4-digit room code.');
      return;
    }
    localStorage.setItem('quickshare24-chat-nickname', nick);

    setLoading(true);
    try {
      const exists = await chatRoomExists(joinCode);
      if (!exists) {
        toast.error('Chat room not found or expired.');
        setLoading(false);
        return;
      }

      const room = await getChatRoom(joinCode);
      if (room) {
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setUserColor(randomColor);
        setCode(joinCode);
        setExpiresAt(room.expiresAt);
        setMessages([]);
        setIsInChat(true);
        toast.success('Joined Chat Room!');
      } else {
        toast.error('Could not join chat room.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error joining chat room.');
    } finally {
      setLoading(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Room code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  const handleLeave = () => {
    setIsInChat(false);
    setCode('');
    setJoinCode('');
    setMessages([]);
    setExpiresAt(null);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 flex flex-col justify-between">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        
        {/* Header section (only before joining chat) */}
        {!isInChat && (
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
              Temporary <span className="gradient-text">Chat</span> Room
            </h1>
            <p className="mt-2 text-surface-500 dark:text-surface-400">
              Create an instant, secure, and auto-expiring group chatroom without registration.
            </p>
          </div>
        )}

        {/* Demo banner */}
        {!isInChat && !isFirebaseConfigured() && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <FiInfo className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Demo Mode</strong> — Real-time chat messaging only works across tabs in the same browser. Configure Firebase for multi-user chat.
            </p>
          </div>
        )}

        {isInChat ? (
          /* ─── Chat Interface UI ─── */
          <div className="flex-1 flex flex-col glass-card h-[600px] md:h-[650px] overflow-hidden animate-scale-in">
            {/* Header bar */}
            <div className="px-6 py-4 border-b border-surface-200/50 dark:border-surface-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-50/50 dark:bg-surface-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white shadow-md">
                  <FiUsers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">ROOM CODE</span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-brand-500 transition"
                      title="Copy room code"
                    >
                      {copiedCode ? <FiCheck className="w-3.5 h-3.5 text-emerald-500" /> : <FiCopy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-xl font-bold text-surface-900 dark:text-surface-100 leading-none mt-0.5">
                    {code}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-surface-400 dark:text-surface-500">Expires in</div>
                  <div className="text-sm font-semibold text-brand-500">{formatCountdown(remaining)}</div>
                </div>

                <button
                  onClick={handleLeave}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition"
                >
                  <FiLogOut className="w-4 h-4" /> Leave
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <FiMessageCircle className="w-12 h-12 text-surface-300 dark:text-surface-700 mb-3" />
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    No messages yet. Send a message to start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender === nickname && msg.senderColor === userColor;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                    >
                      {/* Name of sender */}
                      {!isOwn && (
                        <span
                          style={{ color: msg.senderColor }}
                          className="text-xs font-semibold mb-1 ml-1"
                        >
                          {msg.sender}
                        </span>
                      )}
                      
                      {/* Bubble */}
                      <div className="max-w-[75%] flex items-end gap-2">
                        {isOwn && (
                          <span className="text-[10px] text-surface-400 mb-1 select-none">
                            {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm break-words leading-relaxed shadow-sm ${
                            isOwn
                              ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-tr-none'
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {!isOwn && (
                          <span className="text-[10px] text-surface-400 mb-1 select-none">
                            {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input message form */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-surface-200/50 dark:border-surface-800/50 flex gap-2 bg-surface-50/30 dark:bg-surface-900/30"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="btn-primary p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* ─── Entry state (Join/Create setup) ─── */
          <div className="space-y-6 max-w-xl mx-auto w-full animate-fade-in">
            <div className="glass-card p-8">
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-4 text-center md:text-left">
                1. Set Your Nickname
              </h2>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname (e.g. Alex)"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Card */}
              <div className="glass-card p-8 flex flex-col justify-between text-center md:text-left">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white mb-6 mx-auto md:mx-0 shadow-lg shadow-brand-500/25">
                    <FiPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">Create New Chat</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mb-6">
                    Create a new temporary room. You'll receive a code that others can enter to join.
                  </p>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={loading || !nickname.trim()}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Chat'}
                </button>
              </div>

              {/* Join Card */}
              <div className="glass-card p-8 flex flex-col justify-between text-center md:text-left">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-brand-500 flex items-center justify-center text-white mb-6 mx-auto md:mx-0 shadow-lg shadow-accent-500/25">
                    <FiMessageCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">Join Existing Chat</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mb-6">
                    Enter the room code shared by a friend to connect instantly.
                  </p>
                </div>
                
                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    type="text"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-digit code"
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 text-center font-mono tracking-widest text-lg outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || joinCode.length !== 4 || !nickname.trim()}
                    className="btn-secondary w-full py-3 disabled:opacity-50"
                  >
                    {loading ? 'Joining...' : 'Join Chat'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
