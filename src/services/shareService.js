/**
 * Share service — handles creating and retrieving shares.
 * 
 * Strategy:
 * - Text/code: always stored in Firestore (works cross-browser)
 * - Files ≤ 700KB: stored as base64 in Firestore (works cross-browser)
 * - Files > 700KB: stored in localStorage (same browser only)
 * - Firebase Storage is NOT used (requires Blaze plan)
 */
import { db, isFirebaseConfigured } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, increment, Timestamp,
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { isExpired } from '../utils/helpers';

/* ─── Constants ─── */
const FIRESTORE_FILE_LIMIT = 700 * 1024; // 700KB — safe limit for Firestore docs (1MiB max after base64)
const DEMO_KEY = 'codedrop-demo-shares';
const FILE_KEY = 'codedrop-file-cache';

/* ─── localStorage helpers ─── */
function getDemoShares() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); }
  catch { return {}; }
}

function saveDemoShares(shares) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(shares));
}

function getFileCache() {
  try { return JSON.parse(localStorage.getItem(FILE_KEY) || '{}'); }
  catch { return {}; }
}

function saveFileCache(cache) {
  try { localStorage.setItem(FILE_KEY, JSON.stringify(cache)); }
  catch (e) {
    console.warn('localStorage full, clearing old file cache');
    localStorage.removeItem(FILE_KEY);
    localStorage.setItem(FILE_KEY, JSON.stringify(cache));
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* ─── Public API ─── */

/**
 * Check if a share code already exists.
 */
export async function codeExists(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    return snap.exists();
  }
  return !!getDemoShares()[code];
}

/**
 * Create a new share.
 * @param {object} shareData - { code, message, contentType, oneTimeView, passwordProtected, password }
 * @param {File|null} file
 * @param {function} onProgress - called with 0-100
 * @returns {Promise<{ code, expiresAt, fileStorageMode }>}
 */
export async function createShare(shareData, file, onProgress) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let fileUrl = '';
  let fileName = '';
  let fileType = '';
  let fileData = ''; // base64 data for Firestore storage
  let fileStorageMode = 'none'; // 'firestore' | 'local' | 'none'

  // Process file if present
  if (file) {
    onProgress?.(20);
    const base64 = await fileToBase64(file);
    fileName = file.name;
    fileType = file.type;
    onProgress?.(60);

    if (file.size <= FIRESTORE_FILE_LIMIT) {
      // Small file → store base64 in Firestore (works cross-browser)
      fileData = base64;
      fileUrl = 'firestore-embedded';
      fileStorageMode = 'firestore';
    } else {
      // Large file → store in localStorage (same browser only)
      fileUrl = `local:${shareData.code}`;
      fileStorageMode = 'local';

      const cache = getFileCache();
      cache[shareData.code] = { dataUrl: base64, fileName, fileType };
      saveFileCache(cache);
    }
    onProgress?.(80);
  }

  if (isFirebaseConfigured()) {
    const docData = {
      ...shareData,
      fileUrl,
      fileName,
      fileType,
      fileData, // base64 for small files, empty string for large/none
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
      downloadCount: 0,
    };

    await setDoc(doc(db, 'shares', shareData.code), docData);
    onProgress?.(100);
    return { code: shareData.code, expiresAt: docData.expiresAt, fileStorageMode };
  }

  /* Full demo mode — everything in localStorage */
  const docData = {
    ...shareData,
    fileUrl: file ? (fileStorageMode === 'firestore' ? fileData : fileUrl) : '',
    fileName,
    fileType,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    downloadCount: 0,
  };

  // In demo mode, always embed the base64 directly
  if (file) {
    const base64 = await fileToBase64(file);
    docData.fileUrl = base64;
  }

  const shares = getDemoShares();
  shares[shareData.code] = docData;
  saveDemoShares(shares);
  onProgress?.(100);

  return { code: shareData.code, expiresAt: expires.toISOString(), fileStorageMode };
}

/**
 * Retrieve a share by code.
 * @returns {{ status: 'ok'|'not_found'|'expired', data?: object }}
 */
export async function retrieveShare(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    if (!snap.exists()) return { status: 'not_found' };
    const data = snap.data();
    if (isExpired(data.expiresAt)) {
      // Auto-delete expired share from Firestore
      try { await deleteDoc(doc(db, 'shares', code)); } catch (e) { console.warn('Cleanup failed:', e); }
      return { status: 'expired' };
    }

    // Reconstruct file URL from embedded data or local cache
    if (data.fileUrl === 'firestore-embedded' && data.fileData) {
      // File was stored as base64 in Firestore
      data.fileUrl = data.fileData;
    } else if (data.fileUrl && data.fileUrl.startsWith('local:')) {
      // File was stored in localStorage — try to retrieve
      const cache = getFileCache();
      const cached = cache[code];
      if (cached) {
        data.fileUrl = cached.dataUrl;
        data.fileName = cached.fileName || data.fileName;
        data.fileType = cached.fileType || data.fileType;
      } else {
        // File was stored on a different browser — not available
        data.fileUrl = '';
        data.fileUnavailable = true;
      }
    }

    return { status: 'ok', data };
  }

  /* Demo mode */
  const shares = getDemoShares();
  const data = shares[code];
  if (!data) return { status: 'not_found' };
  if (isExpired(data.expiresAt)) {
    delete shares[code];
    saveDemoShares(shares);
    return { status: 'expired' };
  }
  return { status: 'ok', data };
}

/**
 * Increment download count.
 */
export async function incrementDownload(code) {
  if (isFirebaseConfigured()) {
    await updateDoc(doc(db, 'shares', code), { downloadCount: increment(1) });
    return;
  }
  const shares = getDemoShares();
  if (shares[code]) {
    shares[code].downloadCount = (shares[code].downloadCount || 0) + 1;
    saveDemoShares(shares);
  }
}

/**
 * Delete a share (one-time view).
 */
export async function deleteShare(code) {
  if (isFirebaseConfigured()) {
    await deleteDoc(doc(db, 'shares', code));
    // Also clean up local file cache
    const cache = getFileCache();
    delete cache[code];
    saveFileCache(cache);
    return;
  }
  const shares = getDemoShares();
  delete shares[code];
  saveDemoShares(shares);
}

/**
 * Cleanup expired shares from Firestore.
 * Call this on app load — it runs silently in the background.
 * Deletes all documents where expiresAt < now.
 */
export async function cleanupExpiredShares() {
  if (!isFirebaseConfigured()) {
    // Demo mode: clean up localStorage
    const shares = getDemoShares();
    let changed = false;
    for (const code in shares) {
      if (isExpired(shares[code].expiresAt)) {
        delete shares[code];
        changed = true;
      }
    }
    if (changed) saveDemoShares(shares);
    return;
  }

  try {
    const now = Timestamp.now();
    const sharesRef = collection(db, 'shares');
    const expiredQuery = query(sharesRef, where('expiresAt', '<', now));
    const snapshot = await getDocs(expiredQuery);

    if (snapshot.empty) return;

    let deleted = 0;
    for (const docSnap of snapshot.docs) {
      try {
        await deleteDoc(doc(db, 'shares', docSnap.id));
        deleted++;
      } catch (e) {
        console.warn('Failed to delete expired share:', docSnap.id, e);
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} expired share(s) from Firestore`);
    }
  } catch (e) {
    console.warn('Cleanup sweep failed:', e);
  }
}
