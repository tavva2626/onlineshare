import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { retrieveShare, incrementDownload, deleteShare } from '../services/shareService';
import { isFirebaseConfigured } from '../firebase';
import { isExpired, getFileCategory, formatCountdown, formatBytes } from '../utils/helpers';
import { useCountdown } from '../hooks/useShares';
import CodeEditor from '../components/ui/CodeEditor';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  FiDownload, FiSearch, FiAlertTriangle, FiClock, FiCopy, FiCheck,
  FiLock, FiFile, FiImage, FiFileText, FiInfo, FiCode,
} from 'react-icons/fi';

/**
 * Convert a data URL to a Blob and trigger download (works on mobile + desktop).
 */
function downloadDataUrl(dataUrl, fileName) {
  try {
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 500);
  } catch (err) {
    console.error('Download failed:', err);
    window.open(dataUrl, '_blank');
  }
}

function FileIcon({ type }) {
  const cat = getFileCategory(type);
  if (cat === 'image') return <FiImage className="w-5 h-5 text-brand-500" />;
  if (cat === 'pdf') return <FiFileText className="w-5 h-5 text-red-500" />;
  return <FiFile className="w-5 h-5 text-brand-500" />;
}

export default function Receive() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [share, setShare] = useState(null);
  const [error, setError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const remaining = useCountdown(share?.expiresAt);

  useEffect(() => {
    const paramCode = searchParams.get('code');
    if (paramCode) { setCode(paramCode); handleRetrieve(paramCode); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetrieve = async (overrideCode) => {
    const c = (overrideCode || code).trim().toUpperCase();
    if (!c || c.length < 4) { toast.error('Enter a valid share code.'); return; }
    setLoading(true); setError(''); setShare(null); setUnlocked(false);

    try {
      const result = await retrieveShare(c);
      if (result.status === 'not_found') { setError('not_found'); setLoading(false); return; }
      if (result.status === 'expired') { setError('expired'); setLoading(false); return; }

      const data = result.data;
      if (data.passwordProtected && data.password) {
        setShare(data); setLoading(false); return;
      }

      setShare(data); setUnlocked(true);
      await incrementDownload(c);
      if (data.oneTimeView) {
        await deleteShare(c);
        toast('This was a one-time share. It has been deleted.', { icon: '🔥' });
      }
    } catch (err) {
      console.error(err);
      setError('error');
    } finally { setLoading(false); }
  };

  const handlePasswordSubmit = async () => {
    if (!share) return;
    if (passwordInput === share.password) {
      setUnlocked(true);
      await incrementDownload(share.code);
      if (share.oneTimeView) {
        await deleteShare(share.code);
        toast('This was a one-time share. It has been deleted.', { icon: '🔥' });
      }
      toast.success('Access granted!');
    } else {
      toast.error('Wrong password.');
    }
  };

  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy.'); }
  };

  const handleCopyCode = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCodeCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { toast.error('Failed to copy.'); }
  };

  // Determine what content exists
  const hasMessage = share?.message;
  const hasCode = share?.codeContent;
  const hasFiles = share?.files && share.files.length > 0;

  // Backward compat: old format had `message` for code too
  const hasOldCodeMessage = share?.contentType === 'code' && share?.message && !share?.codeContent;

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
            <span className="gradient-text">Receive</span> Content
          </h1>
          <p className="mt-2 text-surface-500 dark:text-surface-400">Enter the 6-character code to retrieve shared content.</p>
        </div>

        {/* Demo mode banner */}
        {!isFirebaseConfigured() && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-fade-in">
            <FiInfo className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Demo Mode</strong> — Retrieving from localStorage. Same browser only.
            </p>
          </div>
        )}

        {/* Code Input */}
        <div className="glass-card p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleRetrieve()} placeholder="Enter access code" maxLength={6} className="input-field text-center font-mono text-2xl tracking-[0.2em] uppercase flex-1" id="code-input" />
            <button onClick={() => handleRetrieve()} disabled={loading || !code.trim()} className="btn-primary px-8" id="retrieve-btn">
              {loading ? <Spinner size="sm" /> : <><FiSearch className="w-5 h-5" />Retrieve</>}
            </button>
          </div>
        </div>

        {/* Error: Not found */}
        {error === 'not_found' && (
          <div className="glass-card p-8 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><FiAlertTriangle className="w-8 h-8 text-red-500" /></div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Code Not Found</h2>
            <p className="text-surface-500 dark:text-surface-400">No share exists with this code. Please check and try again.</p>
          </div>
        )}

        {/* Error: Expired */}
        {error === 'expired' && (
          <div className="glass-card p-8 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><FiClock className="w-8 h-8 text-amber-500" /></div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">This Share Has Expired</h2>
            <p className="text-surface-500 dark:text-surface-400">Shares are only available for 24 hours after creation.</p>
          </div>
        )}

        {/* Error: Generic */}
        {error === 'error' && (
          <div className="glass-card p-8 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><FiAlertTriangle className="w-8 h-8 text-red-500" /></div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Something Went Wrong</h2>
            <p className="text-surface-500 dark:text-surface-400">An error occurred. Please try again.</p>
          </div>
        )}

        {/* Password Gate */}
        {share && share.passwordProtected && !unlocked && (
          <div className="glass-card p-8 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center"><FiLock className="w-8 h-8 text-brand-500" /></div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Password Protected</h2>
            <p className="text-surface-500 dark:text-surface-400 mb-6">Enter the password to access this share.</p>
            <div className="max-w-xs mx-auto flex flex-col gap-3">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} placeholder="Enter password" className="input-field text-center" id="password-unlock-input" />
              <button onClick={handlePasswordSubmit} className="btn-primary" id="unlock-btn"><FiLock className="w-4 h-4" />Unlock</button>
            </div>
          </div>
        )}

        {/* Content Display */}
        {share && unlocked && (
          <div className="space-y-6 animate-fade-in">
            {/* Expiry */}
            <div className="flex items-center justify-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <FiClock className="w-4 h-4" />
              <span>Expires in: <strong className="text-brand-500">{formatCountdown(remaining)}</strong></span>
            </div>

            {/* ─── Text Message ─── */}
            {hasMessage && !hasOldCodeMessage && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                    <FiFileText className="inline w-4 h-4 mr-1.5 -mt-0.5" />Message
                  </h3>
                  <button onClick={() => handleCopyText(share.message)} className="flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-brand-500 transition-colors" id="copy-text-btn">
                    {copied ? <><FiCheck className="w-3.5 h-3.5 text-green-500" />Copied</> : <><FiCopy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap break-words leading-relaxed">{share.message}</div>
              </div>
            )}

            {/* ─── Code Snippet ─── */}
            {(hasCode || hasOldCodeMessage) && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                    <FiCode className="inline w-4 h-4 mr-1.5 -mt-0.5" />Code Snippet
                  </h3>
                  <button onClick={() => handleCopyCode(hasCode ? share.codeContent : share.message)} className="flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-brand-500 transition-colors" id="copy-code-btn">
                    {codeCopied ? <><FiCheck className="w-3.5 h-3.5 text-green-500" />Copied</> : <><FiCopy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                </div>
                <CodeEditor value={hasCode ? share.codeContent : share.message} readOnly language={share.codeLanguage || 'javascript'} />
              </div>
            )}

            {/* ─── Files ─── */}
            {hasFiles && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">
                  <FiFile className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  {share.files.length === 1 ? 'Attached File' : `${share.files.length} Files`}
                </h3>

                <div className="space-y-3">
                  {share.files.map((file, idx) => {
                    const cat = getFileCategory(file.type);
                    const hasData = file.dataUrl && file.dataUrl.length > 0;

                    return (
                      <div key={`${file.name}-${idx}`} className="rounded-xl bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
                        {/* File info row */}
                        <div className="flex items-center gap-3 p-4">
                          {/* Thumbnail for images */}
                          {cat === 'image' && hasData ? (
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-200 dark:bg-surface-700 flex-shrink-0">
                              <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                              <FileIcon type={file.type} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{file.name}</p>
                            <p className="text-xs text-surface-400">{file.type || 'Unknown'}{file.size ? ` · ${formatBytes(file.size)}` : ''}</p>
                          </div>
                          {hasData && (
                            <button
                              onClick={() => downloadDataUrl(file.dataUrl, file.name)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors shadow-sm"
                            >
                              <FiDownload className="w-4 h-4" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          )}
                        </div>

                        {/* Image full preview */}
                        {cat === 'image' && hasData && (
                          <div className="px-4 pb-4">
                            <div className="rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
                              <img src={file.dataUrl} alt={file.name} className="max-w-full max-h-80 mx-auto object-contain" />
                            </div>
                          </div>
                        )}

                        {/* PDF preview */}
                        {cat === 'pdf' && hasData && (
                          <div className="px-4 pb-4">
                            <div className="rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
                              <iframe src={file.dataUrl} title={file.name} className="w-full h-80 border-0" />
                            </div>
                          </div>
                        )}

                        {/* No data warning */}
                        {!hasData && (
                          <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <FiAlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-300">File data could not be retrieved.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Download all button */}
                {share.files.length > 1 && share.files.every(f => f.dataUrl) && (
                  <button
                    onClick={() => share.files.forEach(f => downloadDataUrl(f.dataUrl, f.name))}
                    className="btn-accent w-full mt-4"
                    id="download-all-btn"
                  >
                    <FiDownload className="w-5 h-5" />Download All ({share.files.length} files)
                  </button>
                )}
              </div>
            )}

            {/* ─── Old single-file backward compat ─── */}
            {!hasFiles && share.fileName && share.fileUrl && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Attached File</h3>
                <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <FileIcon type={share.fileType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{share.fileName}</p>
                    <p className="text-xs text-surface-400">{share.fileType}</p>
                  </div>
                </div>
                <button onClick={() => downloadDataUrl(share.fileUrl, share.fileName)} className="btn-accent w-full" id="download-btn">
                  <FiDownload className="w-5 h-5" />Download {share.fileName}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
