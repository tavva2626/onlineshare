/**
 * Share service — handles creating and retrieving shares.
 * 
 * Strategy:
 * - Text/code: stored in Firestore (works cross-browser)
 * - Files ≤ 700KB: stored as base64 in main Firestore document
 * - Files > 700KB: split into 700KB chunks in Firestore subcollection
 * - ALL files work cross-browser/cross-device — no localStorage dependency
 * - Firebase Storage is NOT used (requires Blaze plan)
 */
import { db, isFirebaseConfigured } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, increment, Timestamp,
  collection, query, where, getDocs, writeBatch,
} from 'firebase/firestore';
import { isExpired } from '../utils/helpers';

/* ─── Constants ─── */
const CHUNK_SIZE = 700 * 1024; // 700KB per chunk (safe for Firestore 1MiB doc limit)
const DEMO_KEY = 'quickshare24-demo-shares';

/* ─── localStorage helpers (demo mode only) ─── */
function getDemoShares() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); }
  catch { return {}; }
}

function saveDemoShares(shares) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(shares));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* ─── Chunk helpers ─── */

/**
 * Split a base64 string into chunks of CHUNK_SIZE characters.
 */
function splitIntoChunks(base64String) {
  const chunks = [];
  for (let i = 0; i < base64String.length; i += CHUNK_SIZE) {
    chunks.push(base64String.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Write file chunks to Firestore subcollection: shares/{code}/chunks/{index}
 */
async function writeFileChunks(code, base64String, onProgress) {
  const chunks = splitIntoChunks(base64String);
  const totalChunks = chunks.length;

  for (let i = 0; i < totalChunks; i++) {
    await setDoc(doc(db, 'shares', code, 'chunks', String(i)), {
      data: chunks[i],
      index: i,
    });
    // Progress: 60-95% range for chunk uploads
    onProgress?.(60 + Math.round((i + 1) / totalChunks * 35));
  }

  return totalChunks;
}

/**
 * Read and reassemble file chunks from Firestore.
 */
async function readFileChunks(code, totalChunks) {
  const chunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkSnap = await getDoc(doc(db, 'shares', code, 'chunks', String(i)));
    if (chunkSnap.exists()) {
      chunks.push({ index: chunkSnap.data().index, data: chunkSnap.data().data });
    }
  }
  // Sort by index and reassemble
  chunks.sort((a, b) => a.index - b.index);
  return chunks.map(c => c.data).join('');
}

/**
 * Delete file chunks from Firestore.
 */
async function deleteFileChunks(code, totalChunks) {
  for (let i = 0; i < totalChunks; i++) {
    try {
      await deleteDoc(doc(db, 'shares', code, 'chunks', String(i)));
    } catch (e) { /* ignore */ }
  }
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
 * Files are stored entirely in Firestore — small files inline, large files chunked.
 */
export async function createShare(shareData, file, onProgress) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let fileName = '';
  let fileType = '';
  let fileUrl = '';
  let fileData = '';
  let fileChunks = 0;

  // Process file if present
  if (file) {
    onProgress?.(10);
    const base64 = await fileToBase64(file);
    fileName = file.name;
    fileType = file.type;
    onProgress?.(40);

    if (isFirebaseConfigured()) {
      if (base64.length <= CHUNK_SIZE) {
        // Small file → store inline in main document
        fileData = base64;
        fileUrl = 'firestore-embedded';
        onProgress?.(80);
      } else {
        // Large file → split into chunks in subcollection
        fileUrl = 'firestore-chunked';
        fileChunks = await writeFileChunks(shareData.code, base64, onProgress);
      }
    } else {
      // Demo mode — store everything inline
      fileData = base64;
      fileUrl = 'demo-embedded';
    }

    onProgress?.(95);
  }

  if (isFirebaseConfigured()) {
    const docData = {
      ...shareData,
      fileUrl,
      fileName,
      fileType,
      fileData, // base64 for small files, empty for chunked/none
      fileChunks, // number of chunks (0 if inline or no file)
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
      downloadCount: 0,
    };

    await setDoc(doc(db, 'shares', shareData.code), docData);
    onProgress?.(100);
    return { code: shareData.code, expiresAt: docData.expiresAt };
  }

  /* Full demo mode — everything in localStorage */
  const docData = {
    ...shareData,
    fileUrl: fileData || '',
    fileName,
    fileType,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    downloadCount: 0,
  };

  const shares = getDemoShares();
  shares[shareData.code] = docData;
  saveDemoShares(shares);
  onProgress?.(100);

  return { code: shareData.code, expiresAt: expires.toISOString() };
}

/**
 * Retrieve a share by code.
 * Reassembles chunked files automatically.
 */
export async function retrieveShare(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    if (!snap.exists()) return { status: 'not_found' };
    const data = snap.data();

    if (isExpired(data.expiresAt)) {
      // Auto-delete expired share + chunks from Firestore
      try {
        if (data.fileChunks > 0) await deleteFileChunks(code, data.fileChunks);
        await deleteDoc(doc(db, 'shares', code));
      } catch (e) { console.warn('Cleanup failed:', e); }
      return { status: 'expired' };
    }

    // Reconstruct file URL
    if (data.fileUrl === 'firestore-embedded' && data.fileData) {
      // Small file — inline base64
      data.fileUrl = data.fileData;
    } else if (data.fileUrl === 'firestore-chunked' && data.fileChunks > 0) {
      // Large file — reassemble from chunks
      try {
        data.fileUrl = await readFileChunks(code, data.fileChunks);
      } catch (e) {
        console.error('Failed to read file chunks:', e);
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
    // Read main doc to get chunk count
    try {
      const snap = await getDoc(doc(db, 'shares', code));
      if (snap.exists() && snap.data().fileChunks > 0) {
        await deleteFileChunks(code, snap.data().fileChunks);
      }
    } catch (e) { /* ignore */ }
    await deleteDoc(doc(db, 'shares', code));
    return;
  }
  const shares = getDemoShares();
  delete shares[code];
  saveDemoShares(shares);
}

/**
 * Cleanup expired shares from Firestore.
 * Runs on app load — deletes all expired shares and their chunks.
 */
export async function cleanupExpiredShares() {
  if (!isFirebaseConfigured()) {
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
        const data = docSnap.data();
        if (data.fileChunks > 0) {
          await deleteFileChunks(docSnap.id, data.fileChunks);
        }
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
