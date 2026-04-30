/**
 * Generate a cryptographically random 6-character alphanumeric code.
 */
export function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (v) => chars[v % chars.length]).join('');
}

/**
 * Format bytes to a human-readable string.
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a remaining-time duration to a readable countdown string.
 */
export function formatCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Validate allowed file types.
 */
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/csv',
  'application/json',
  'application/javascript',
  'text/html',
  'text/css',
  'text/markdown',
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.zip', '.docx', '.doc', '.txt', '.csv', '.json', '.js',
  '.html', '.css', '.md', '.py', '.java', '.cpp', '.c', '.ts', '.tsx', '.jsx',
];

export function isFileAllowed(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Get the maximum file size in bytes from env (default 50MB).
 */
export function getMaxFileSize() {
  const mb = parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '50', 10);
  return mb * 1024 * 1024;
}

/**
 * Sanitize text input (basic XSS prevention).
 */
export function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Check if a share is expired.
 */
export function isExpired(expiresAt) {
  if (!expiresAt) return true;
  const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return Date.now() > expiry.getTime();
}

/**
 * Detect file type category for preview.
 */
export function getFileCategory(fileType) {
  if (!fileType) return 'unknown';
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/javascript') return 'text';
  if (fileType.includes('zip')) return 'archive';
  if (fileType.includes('word') || fileType.includes('document')) return 'document';
  return 'other';
}
