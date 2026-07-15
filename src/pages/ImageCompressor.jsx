import { useState, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FiImage, FiDownload, FiTrash2, FiX, FiUploadCloud, FiCheck, FiSliders,
} from 'react-icons/fi';

/* ───────── Helpers ───────── */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function compressImage(file, quality, format) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        `image/${format}`,
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

function getCompressionColor(pct) {
  if (pct >= 50) return { text: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Excellent' };
  if (pct >= 20) return { text: 'text-amber-500', bg: 'bg-amber-500', label: 'Moderate' };
  return { text: 'text-red-500', bg: 'bg-red-500', label: 'Low' };
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGES = 10;
const FORMAT_OPTIONS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];

/* ───────── Component ───────── */
export default function ImageCompressor() {
  const [images, setImages] = useState([]); // { id, file, name, originalSize, compressedBlob, compressedSize }
  const [quality, setQuality] = useState(0.7);
  const [format, setFormat] = useState('jpeg');
  const [compressing, setCompressing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const idCounter = useRef(0);

  /* ── Add images ── */
  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList).filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (incoming.length === 0) {
      toast.error('Only PNG, JPEG, and WebP images are accepted.');
      return;
    }
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
    const toAdd = incoming.slice(0, slots);
    if (incoming.length > slots) {
      toast(`Only ${slots} more image(s) can be added.`, { icon: '⚠️' });
    }
    const newImages = toAdd.map((f) => ({
      id: ++idCounter.current,
      file: f,
      name: f.name,
      originalSize: f.size,
      compressedBlob: null,
      compressedSize: null,
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, [images.length]);

  /* ── Drag & drop handlers ── */
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragActive(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragActive(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);
  const handleBrowse = () => fileInputRef.current?.click();
  const handleFileChange = (e) => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ''; };

  /* ── Remove / clear ── */
  const removeImage = (id) => setImages((prev) => prev.filter((img) => img.id !== id));
  const clearAll = () => { setImages([]); toast.success('All images cleared.'); };

  /* ── Compress ── */
  const handleCompress = async () => {
    if (images.length === 0) return;
    setCompressing(true);
    const toastId = toast.loading(`Compressing ${images.length} image(s)...`);
    try {
      const results = await Promise.all(
        images.map(async (img) => {
          try {
            const blob = await compressImage(img.file, quality, format);
            return { ...img, compressedBlob: blob, compressedSize: blob.size };
          } catch {
            return { ...img, compressedBlob: null, compressedSize: null };
          }
        }),
      );
      setImages(results);
      const failed = results.filter((r) => !r.compressedBlob).length;
      if (failed > 0) toast.error(`${failed} image(s) failed to compress.`, { id: toastId });
      else toast.success('Compression complete!', { id: toastId });
    } catch {
      toast.error('Compression failed.', { id: toastId });
    } finally {
      setCompressing(false);
    }
  };

  /* ── Download ── */
  const downloadOne = (img) => {
    if (!img.compressedBlob) return;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const baseName = img.name.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(img.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}-compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const compressed = images.filter((img) => img.compressedBlob);
    if (compressed.length === 0) return;
    compressed.forEach((img, i) => setTimeout(() => downloadOne(img), i * 200));
    toast.success(`Downloading ${compressed.length} image(s)...`);
  };

  /* ── Derived data ── */
  const hasCompressed = images.some((img) => img.compressedBlob);
  const totalOriginal = useMemo(() => images.reduce((s, img) => s + img.originalSize, 0), [images]);
  const totalCompressed = useMemo(
    () => images.reduce((s, img) => s + (img.compressedSize || 0), 0),
    [images],
  );
  const totalSaved = hasCompressed ? totalOriginal - totalCompressed : 0;
  const totalPct = hasCompressed && totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

  /* ───────── RENDER ───────── */
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
            <span className="gradient-text">Image Compressor</span>
          </h1>
          <p className="mt-2 text-surface-500 dark:text-surface-400">
            Compress images right in your browser — fast, private, no uploads.
          </p>
        </div>

        <div className="space-y-6 animate-fade-in">
          {/* ─── Upload Zone ─── */}
          {images.length < MAX_IMAGES && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowse}
              className={`drop-zone flex flex-col items-center gap-3 text-center ${isDragActive ? 'drop-zone-active' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 dark:from-brand-500/20 dark:to-accent-500/20 flex items-center justify-center">
                <FiUploadCloud className={`w-7 h-7 text-brand-500 transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  {isDragActive ? 'Drop images here...' : 'Drag & drop images, or click to browse'}
                </p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                  PNG, JPEG, WebP · Up to {MAX_IMAGES} images
                </p>
              </div>
            </div>
          )}

          {/* ─── Controls ─── */}
          {images.length > 0 && (
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-5">
                <FiSliders className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Compression Settings</span>
              </div>

              {/* Quality slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-surface-600 dark:text-surface-300">Quality</label>
                  <span className="text-sm font-bold text-brand-500">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-200 dark:bg-surface-700 accent-brand-500"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-surface-400 dark:text-surface-500">Low Quality (smallest)</span>
                  <span className="text-xs text-surface-400 dark:text-surface-500">High Quality (largest)</span>
                </div>
              </div>

              {/* Format selector */}
              <div className="mb-5">
                <label className="block text-sm text-surface-600 dark:text-surface-300 mb-2">Output Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormat(opt.value)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                        format === opt.value
                          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25'
                          : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCompress}
                  disabled={compressing}
                  className="btn-primary flex-1 min-w-[160px]"
                >
                  {compressing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Compressing...
                    </>
                  ) : (
                    <>
                      <FiImage className="w-5 h-5" />
                      Compress All
                    </>
                  )}
                </button>
                {hasCompressed && (
                  <button onClick={downloadAll} className="btn-primary flex-1 min-w-[160px]">
                    <FiDownload className="w-5 h-5" />
                    Download All
                  </button>
                )}
                <button onClick={clearAll} className="btn-secondary">
                  <FiTrash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* ─── Total Summary ─── */}
          {hasCompressed && totalSaved > 0 && (
            <div className="glass-card p-5 animate-scale-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <FiCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Total Saved</p>
                    <p className="text-xs text-surface-400 dark:text-surface-500">
                      {formatBytes(totalOriginal)} → {formatBytes(totalCompressed)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${getCompressionColor(totalPct).text}`}>{totalPct}%</p>
                  <p className="text-xs text-surface-400 dark:text-surface-500">smaller</p>
                </div>
              </div>
              {/* Total bar */}
              <div className="mt-4 h-3 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getCompressionColor(totalPct).bg}`}
                  style={{ width: `${Math.max(totalPct, 2)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-surface-400">Saved {formatBytes(totalSaved)}</span>
                <span className="text-xs text-surface-400">{images.filter(i => i.compressedBlob).length} image(s)</span>
              </div>
            </div>
          )}

          {/* ─── Image Cards ─── */}
          {images.length > 0 && (
            <div className="space-y-3">
              {images.map((img) => {
                const pct =
                  img.compressedSize != null && img.originalSize > 0
                    ? Math.round(((img.originalSize - img.compressedSize) / img.originalSize) * 100)
                    : null;
                const color = pct != null ? getCompressionColor(pct) : null;
                const originalBarPct = 100;
                const compressedBarPct =
                  img.compressedSize != null && img.originalSize > 0
                    ? Math.round((img.compressedSize / img.originalSize) * 100)
                    : 0;

                return (
                  <div key={img.id} className="glass-card p-4 animate-scale-in group">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-200 dark:bg-surface-700 flex-shrink-0">
                        <img
                          src={URL.createObjectURL(img.file)}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                              {img.name}
                            </p>
                            <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                              Original: {formatBytes(img.originalSize)}
                              {img.compressedSize != null && (
                                <> → Compressed: <strong className="text-surface-600 dark:text-surface-300">{formatBytes(img.compressedSize)}</strong></>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {img.compressedBlob && (
                              <button
                                onClick={() => downloadOne(img)}
                                className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-surface-400 hover:text-brand-500 transition-all"
                                title="Download"
                              >
                                <FiDownload className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(img.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-all"
                              title="Remove"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Compression bar */}
                        {pct != null && (
                          <div className="mt-3">
                            {/* Original bar */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-medium text-surface-400 w-16 text-right">Original</span>
                              <div className="flex-1 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-surface-400 dark:bg-surface-500 transition-all duration-500"
                                  style={{ width: `${originalBarPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-surface-400 w-14 text-right">{formatBytes(img.originalSize)}</span>
                            </div>
                            {/* Compressed bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-surface-400 w-16 text-right">Compressed</span>
                              <div className="flex-1 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${color.bg}`}
                                  style={{ width: `${Math.max(compressedBarPct, 2)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-surface-400 w-14 text-right">{formatBytes(img.compressedSize)}</span>
                            </div>
                            {/* Badge */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                pct >= 50
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                  : pct >= 20
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              }`}>
                                {pct > 0 ? (
                                  <><FiCheck className="w-3 h-3" />{pct}% smaller</>
                                ) : (
                                  <>{Math.abs(pct)}% larger</>
                                )}
                              </span>
                              <span className="text-[10px] text-surface-400">{color.label}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Add More button ─── */}
          {images.length > 0 && images.length < MAX_IMAGES && (
            <div className="text-center">
              <button onClick={handleBrowse} className="btn-secondary text-sm">
                <FiUploadCloud className="w-4 h-4" />
                Add More Images ({images.length}/{MAX_IMAGES})
              </button>
            </div>
          )}

          {/* ─── Empty State ─── */}
          {images.length === 0 && (
            <div className="glass-card p-8 text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 dark:from-brand-500/20 dark:to-accent-500/20 flex items-center justify-center">
                <FiImage className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
                No images added yet
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 max-w-md mx-auto">
                Drop your images above or click to browse. All compression happens locally in your browser — your images never leave your device.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {['100% Private', 'No Upload', 'Instant Results'].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 text-xs font-medium text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
