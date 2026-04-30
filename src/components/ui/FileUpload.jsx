import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi';
import { formatBytes, isFileAllowed, getMaxFileSize } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function FileUpload({ file, onFileSelect, onFileClear }) {
  const maxSize = getMaxFileSize();

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles?.length) {
        toast.error('File rejected. Check type or size limit.');
        return;
      }
      if (acceptedFiles.length > 0) {
        const f = acceptedFiles[0];
        if (!isFileAllowed(f)) {
          toast.error('File type not allowed.');
          return;
        }
        if (f.size > maxSize) {
          toast.error(`File exceeds ${formatBytes(maxSize)} limit.`);
          return;
        }
        onFileSelect(f);
      }
    },
    [maxSize, onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize,
    multiple: false,
  });

  if (file) {
    return (
      <div className="glass-card p-4 flex items-center gap-4 animate-scale-in">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
          <FiFile className="w-6 h-6 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
            {file.name}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            {formatBytes(file.size)} · {file.type || 'Unknown type'}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFileClear();
          }}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500 transition-all duration-200"
          aria-label="Remove file"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      id="file-drop-zone"
      className={`drop-zone flex flex-col items-center gap-3 text-center ${
        isDragActive ? 'drop-zone-active' : ''
      }`}
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 dark:from-brand-500/20 dark:to-accent-500/20 flex items-center justify-center">
        <FiUploadCloud className={`w-8 h-8 text-brand-500 transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {isDragActive ? 'Drop your file here...' : 'Drag & drop a file, or click to browse'}
        </p>
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          All file types supported (PDF, PPT, DOCX, images, videos, code, etc.) · Max {formatBytes(maxSize)}
        </p>
      </div>
    </div>
  );
}
