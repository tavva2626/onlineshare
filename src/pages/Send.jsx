import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { generateCode, formatBytes, formatCountdown, getMaxFileSize } from '../utils/helpers';
import { useRecentShares, useCountdown } from '../hooks/useShares';
import { createShare, codeExists } from '../services/shareService';
import { isFirebaseConfigured } from '../firebase';
import CodeEditor from '../components/ui/CodeEditor';
import QRCode from '../components/ui/QRCode';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  FiSend, FiCopy, FiCheck, FiLock, FiEye, FiTrash2, FiClock, FiArrowRight,
  FiCode, FiFileText, FiImage, FiFolder, FiPackage, FiX, FiUploadCloud, FiFile, FiInfo,
} from 'react-icons/fi';

const MODES = [
  { id: 'text', label: 'Text', icon: FiFileText, desc: 'Messages & notes' },
  { id: 'images', label: 'Images', icon: FiImage, desc: 'Photos & images' },
  { id: 'files', label: 'Files', icon: FiFolder, desc: 'Any file type' },
  { id: 'code', label: 'Code', icon: FiCode, desc: 'Code snippets' },
  { id: 'everything', label: 'Everything', icon: FiPackage, desc: 'Combine all' },
];

const MAX_FILES = 10;

export default function Send() {
  const [mode, setMode] = useState('text');
  const [message, setMessage] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [oneTimeView, setOneTimeView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const { shares, addShare, removeShare, clearAll } = useRecentShares();
  const remaining = useCountdown(expiresAt);
  const maxSize = getMaxFileSize();

  // File drop handler
  const onDrop = useCallback((accepted, rejected) => {
    if (rejected?.length) {
      toast.error(`Some files rejected. Max size: ${formatBytes(maxSize)}`);
    }
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_FILES} files allowed.`); return; }

    let toAdd = accepted.slice(0, remaining);
    if (mode === 'images') {
      toAdd = toAdd.filter(f => f.type.startsWith('image/'));
      if (toAdd.length < accepted.length) toast('Non-image files were filtered out.', { icon: '🖼️' });
    }
    setFiles(prev => [...prev, ...toAdd]);
  }, [files.length, mode, maxSize]);

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    multiple: true,
    accept: mode === 'images' ? { 'image/*': [] } : undefined,
  });

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
    const hasText = message.trim();
    const hasCode = codeContent.trim();
    const hasFiles = files.length > 0;

    // Validate per mode
    if (mode === 'text' && !hasText) { toast.error('Enter a message.'); return; }
    if (mode === 'images' && !hasFiles) { toast.error('Add at least one image.'); return; }
    if (mode === 'files' && !hasFiles) { toast.error('Add at least one file.'); return; }
    if (mode === 'code' && !hasCode) { toast.error('Enter some code.'); return; }
    if (mode === 'everything' && !hasText && !hasCode && !hasFiles) { toast.error('Add something to share.'); return; }

    setLoading(true); setProgress(0);
    try {
      let code, attempts = 0;
      do {
        code = generateCode();
        const exists = await codeExists(code);
        if (!exists) break;
        attempts++;
      } while (attempts < 10);
      if (attempts >= 10) { toast.error('Unable to generate unique code.'); setLoading(false); return; }

      const shareData = {
        code,
        contentType: mode,
        message: (mode === 'text' || mode === 'everything') ? message.trim() : '',
        codeContent: (mode === 'code' || mode === 'everything') ? codeContent.trim() : '',
        codeLanguage: (mode === 'code' || mode === 'everything') ? codeLanguage : '',
        oneTimeView,
        passwordProtected: !!password,
        password: password || '',
      };

      const filesToUpload = (mode === 'images' || mode === 'files' || mode === 'everything') ? files : [];
      const result = await createShare(shareData, filesToUpload, setProgress);

      setGeneratedCode(result.code);
      setExpiresAt(result.expiresAt);
      addShare({
        code: result.code,
        type: mode,
        name: hasText ? message.slice(0, 40) : hasFiles ? `${files.length} file(s)` : 'Code snippet',
        createdAt: new Date().toISOString(),
      });
      toast.success('Share created!');
    } catch (error) {
      console.error('Share creation error:', error);
      toast.error('Failed: ' + (error?.message || 'Unknown error'));
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setMessage(''); setCodeContent(''); setFiles([]); setPassword('');
    setOneTimeView(false); setGeneratedCode(null); setExpiresAt(null);
    setProgress(0); setCopied(false);
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0) + new Blob([message, codeContent]).size;
  const showText = mode === 'text' || mode === 'everything';
  const showFiles = mode === 'images' || mode === 'files' || mode === 'everything';
  const showCode = mode === 'code' || mode === 'everything';
  const canSubmit = !loading && (message.trim() || codeContent.trim() || files.length > 0);

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
            <span className="gradient-text">Send</span> Content
          </h1>
          <p className="mt-2 text-surface-500 dark:text-surface-400">
            Choose what you want to share, then generate a code.
          </p>
        </div>

        {/* Demo mode banner */}
        {!isFirebaseConfigured() && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-fade-in">
            <FiInfo className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Demo Mode</strong> — Data stored in localStorage only.
            </p>
          </div>
        )}

        {generatedCode ? (
          /* ─── Success State ─── */
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
          /* ─── Input State ─── */
          <div className="space-y-6 animate-fade-in">
            {/* ─── Mode Selector ─── */}
            <div className="glass-card p-2">
              <div className="grid grid-cols-5 gap-1">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setFiles([]); }}
                    id={`mode-${m.id}`}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-medium transition-all duration-300 ${
                      mode === m.id
                        ? 'bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                        : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    <m.icon className="w-5 h-5" />
                    <span className="hidden sm:block">{m.label}</span>
                    <span className="sm:hidden">{m.label.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode description */}
            <div className="text-center">
              <span className="text-xs text-surface-400 dark:text-surface-500">
                {MODES.find(m => m.id === mode)?.desc}
              </span>
            </div>

            {/* ─── Text Section ─── */}
            {showText && (
              <div className="glass-card p-6 animate-fade-in">
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
                  <FiFileText className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Message / Text
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message, paste notes, or leave empty..."
                  rows={5}
                  className="input-field resize-y min-h-[120px]"
                  id="message-input"
                />
              </div>
            )}

            {/* ─── Files / Images Section ─── */}
            {showFiles && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                    {mode === 'images' ? (
                      <><FiImage className="inline w-4 h-4 mr-1.5 -mt-0.5" />Images</>
                    ) : (
                      <><FiFolder className="inline w-4 h-4 mr-1.5 -mt-0.5" />Files</>
                    )}
                  </label>
                  <span className="text-xs text-surface-400">
                    {files.length}/{MAX_FILES} files
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  {...getRootProps()}
                  id="file-drop-zone"
                  className={`drop-zone flex flex-col items-center gap-3 text-center mb-4 ${isDragActive ? 'drop-zone-active' : ''}`}
                >
                  <input {...getInputProps()} />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 dark:from-brand-500/20 dark:to-accent-500/20 flex items-center justify-center">
                    <FiUploadCloud className={`w-7 h-7 text-brand-500 transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to browse'}
                    </p>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                      {mode === 'images' ? 'PNG, JPG, GIF, WebP, SVG' : 'All file types supported'} · Max {formatBytes(maxSize)} each · Up to {MAX_FILES} files
                    </p>
                  </div>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 group animate-scale-in">
                        {/* Image preview thumbnail */}
                        {f.type?.startsWith('image/') ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-200 dark:bg-surface-700 flex-shrink-0">
                            <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                            <FiFile className="w-5 h-5 text-brand-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{f.name}</p>
                          <p className="text-xs text-surface-400">{formatBytes(f.size)}</p>
                        </div>
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-all"
                          aria-label="Remove file"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {/* Total size bar */}
                    <div className="flex items-center justify-between px-1 pt-1">
                      <span className="text-xs text-surface-400">Total: <strong>{formatBytes(files.reduce((s, f) => s + f.size, 0))}</strong></span>
                      <button onClick={() => setFiles([])} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear all</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Code Section ─── */}
            {showCode && (
              <div className="glass-card p-6 animate-fade-in">
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
                  <FiCode className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Code Snippet
                </label>
                <CodeEditor value={codeContent} onChange={setCodeContent} language={codeLanguage} />
              </div>
            )}

            {/* ─── Share Options ─── */}
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

            {/* ─── Progress ─── */}
            {loading && progress > 0 && progress < 100 && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-600 dark:text-surface-300">Uploading...</span>
                  <span className="text-sm font-bold text-brand-500">{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            {/* ─── Submit ─── */}
            <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary w-full py-4 text-lg" id="generate-code-btn">
              {loading ? <><Spinner size="sm" />Generating...</> : <><FiSend className="w-5 h-5" />Generate Share Code</>}
            </button>

            {/* Total size */}
            {totalSize > 0 && (
              <div className="text-center">
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  Total share size: <strong>{formatBytes(totalSize)}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ─── Recent Shares ─── */}
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
