import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { retrieveShare, incrementDownload, deleteShare } from '../services/shareService';
import { isFirebaseConfigured } from '../firebase';
import { isExpired, getFileCategory, formatCountdown } from '../utils/helpers';
import { useCountdown } from '../hooks/useShares';
import CodeEditor from '../components/ui/CodeEditor';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiDownload, FiSearch, FiAlertTriangle, FiClock, FiCopy, FiCheck, FiLock, FiFile, FiImage, FiFileText, FiInfo } from 'react-icons/fi';

export default function Receive() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [share, setShare] = useState(null);
  const [error, setError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);

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

      // If password protected, show password gate first
      if (data.passwordProtected && data.password) {
        setShare(data);
        setLoading(false);
        return;
      }

      // No password — unlock immediately
      setShare(data);
      setUnlocked(true);
      await incrementDownload(c);

      if (data.oneTimeView) {
        await deleteShare(c);
        toast('This was a one-time share. It has been deleted.', { icon: '🔥' });
      }
    } catch (err) {
      console.error(err);
      setError('error');
    } finally {
      setLoading(false);
    }
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(share.message);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy.'); }
  };

  const handleDownload = () => {
    if (!share?.fileUrl) return;

    try {
      if (share.fileUrl.startsWith('data:')) {
        // Convert data URL to Blob for reliable downloads on ALL devices (including mobile)
        const [header, base64Data] = share.fileUrl.split(',');
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
        link.download = share.fileName || 'download';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Cleanup after short delay
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 500);
      } else {
        // External URL — open in new tab
        window.open(share.fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open data URL directly
      window.open(share.fileUrl, '_blank');
    }
  };

  const fileCategory = share ? getFileCategory(share.fileType) : null;

  const FileIcon = () => {
    if (fileCategory === 'image') return <FiImage className="w-6 h-6 text-brand-500" />;
    if (fileCategory === 'pdf') return <FiFileText className="w-6 h-6 text-red-500" />;
    return <FiFile className="w-6 h-6 text-brand-500" />;
  };

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
              <strong>Demo Mode</strong> — Retrieving shares from localStorage. Works only in the same browser that created the share.
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

            {/* Message / Code */}
            {share.message && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">{share.contentType === 'code' ? 'Code Snippet' : 'Message'}</h3>
                  <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-brand-500 transition-colors" id="copy-content-btn">
                    {copied ? <><FiCheck className="w-3.5 h-3.5 text-green-500" />Copied</> : <><FiCopy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                </div>
                {share.contentType === 'code' ? (
                  <CodeEditor value={share.message} readOnly language="javascript" />
                ) : (
                  <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap break-words leading-relaxed">{share.message}</div>
                )}
              </div>
            )}

            {/* File */}
            {share.fileName && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Attached File</h3>
                <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0"><FileIcon /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{share.fileName}</p>
                    <p className="text-xs text-surface-400">{share.fileType}</p>
                  </div>
                </div>

                {/* File unavailable warning */}
                {share.fileUnavailable && (
                  <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <FiAlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      This file was uploaded from a different browser and cannot be downloaded here. Ask the sender to share it again from their browser.
                    </p>
                  </div>
                )}

                {/* Image Preview */}
                {fileCategory === 'image' && share.fileUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
                    <img src={share.fileUrl} alt={share.fileName} className="max-w-full max-h-96 mx-auto object-contain" />
                  </div>
                )}

                {/* PDF Preview */}
                {fileCategory === 'pdf' && share.fileUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
                    <iframe src={share.fileUrl} title={share.fileName} className="w-full h-96 border-0" />
                  </div>
                )}

                {share.fileUrl && !share.fileUnavailable && (
                  <button onClick={handleDownload} className="btn-accent w-full" id="download-btn">
                    <FiDownload className="w-5 h-5" />Download {share.fileName}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
