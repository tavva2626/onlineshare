/**
 * Share service — handles creating and retrieving shares.
 * 
 * Strategy:
 * - Text/code: stored in Firestore (works cross-browser)
 * - Multiple files supported: each file is chunked into Firestore subcollection
 * - Files ≤ 700KB base64: stored inline in main doc
 * - Files > 700KB base64: split into 700KB chunks in subcollection
 * - ALL files work cross-browser/cross-device
 * - Firebase Storage is NOT used (requires Blaze plan)
 *
 * Data model:
 *   shares/{code} = { message, codeContent, codeLanguage, files: [{ name, type, size, chunkStart, chunkCount }], totalChunks, ... }
 *   shares/{code}/chunks/{index} = { data: "base64...", index }
 */
import { db, isFirebaseConfigured } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, increment, Timestamp,
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { isExpired } from '../utils/helpers';

/* ─── Constants ─── */
const CHUNK_SIZE = 700 * 1024; // 700KB per chunk
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

function splitIntoChunks(base64String) {
  const chunks = [];
  for (let i = 0; i < base64String.length; i += CHUNK_SIZE) {
    chunks.push(base64String.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

async function writeChunks(code, chunks, startIndex) {
  for (let i = 0; i < chunks.length; i++) {
    const globalIndex = startIndex + i;
    await setDoc(doc(db, 'shares', code, 'chunks', String(globalIndex)), {
      data: chunks[i],
      index: globalIndex,
    });
  }
}

async function readChunks(code, chunkStart, chunkCount) {
  const pieces = [];
  for (let i = 0; i < chunkCount; i++) {
    const snap = await getDoc(doc(db, 'shares', code, 'chunks', String(chunkStart + i)));
    if (snap.exists()) {
      pieces.push({ index: snap.data().index, data: snap.data().data });
    }
  }
  pieces.sort((a, b) => a.index - b.index);
  return pieces.map(c => c.data).join('');
}

async function deleteAllChunks(code, totalChunks) {
  for (let i = 0; i < totalChunks; i++) {
    try { await deleteDoc(doc(db, 'shares', code, 'chunks', String(i))); }
    catch { /* ignore */ }
  }
}

/* ─── Public API ─── */

export async function codeExists(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    return snap.exists();
  }
  return !!getDemoShares()[code];
}

/**
 * Create a new share with multiple files support.
 * @param {object} shareData - { code, contentType, message, codeContent, codeLanguage, oneTimeView, passwordProtected, password }
 * @param {File[]} files - array of File objects
 * @param {function} onProgress - called with 0-100
 */
export async function createShare(shareData, files = [], onProgress) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const fileMeta = []; // { name, type, size, chunkStart, chunkCount }
  let totalChunks = 0;
  let chunkCursor = 0;

  onProgress?.(5);

  if (isFirebaseConfigured()) {
    // Process each file — convert to base64 and chunk
    for (let f = 0; f < files.length; f++) {
      const file = files[f];
      const base64 = await fileToBase64(file);
      const chunks = splitIntoChunks(base64);

      fileMeta.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        chunkStart: chunkCursor,
        chunkCount: chunks.length,
      });

      // Write chunks to Firestore
      await writeChunks(shareData.code, chunks, chunkCursor);
      chunkCursor += chunks.length;

      // Progress: 10-85% range across all files
      onProgress?.(10 + Math.round(((f + 1) / files.length) * 75));
    }

    totalChunks = chunkCursor;

    const docData = {
      ...shareData,
      files: fileMeta,
      totalChunks,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
      downloadCount: 0,
    };

    await setDoc(doc(db, 'shares', shareData.code), docData);
    onProgress?.(100);
    return { code: shareData.code, expiresAt: docData.expiresAt };
  }

  /* Demo mode — store base64 inline in localStorage */
  const demoFiles = [];
  for (const file of files) {
    const base64 = await fileToBase64(file);
    demoFiles.push({ name: file.name, type: file.type, size: file.size, dataUrl: base64 });
  }

  const docData = {
    ...shareData,
    files: demoFiles,
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
 * Reassembles multi-file chunks. Returns files array with dataUrl for each.
 */
export async function retrieveShare(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    if (!snap.exists()) return { status: 'not_found' };
    const data = snap.data();

    if (isExpired(data.expiresAt)) {
      try {
        if (data.totalChunks > 0) await deleteAllChunks(code, data.totalChunks);
        await deleteDoc(doc(db, 'shares', code));
      } catch (e) { console.warn('Cleanup failed:', e); }
      return { status: 'expired' };
    }

    // Backward compat: old single-file format
    if (data.fileName && !data.files) {
      data.files = [{
        name: data.fileName,
        type: data.fileType,
        size: 0,
      }];
      // Reconstruct file URL from old format
      if (data.fileUrl === 'firestore-embedded' && data.fileData) {
        data.files[0].dataUrl = data.fileData;
      } else if (data.fileUrl === 'firestore-chunked' && data.fileChunks > 0) {
        try { data.files[0].dataUrl = await readChunks(code, 0, data.fileChunks); }
        catch { data.files[0].dataUrl = ''; }
      }
      return { status: 'ok', data };
    }

    // New multi-file format: reassemble each file from chunks
    if (data.files && data.files.length > 0 && data.totalChunks > 0) {
      for (const fileMeta of data.files) {
        try {
          fileMeta.dataUrl = await readChunks(code, fileMeta.chunkStart, fileMeta.chunkCount);
        } catch (e) {
          console.error('Failed to read chunks for', fileMeta.name, e);
          fileMeta.dataUrl = '';
        }
      }
    }

    // Demo files that already have dataUrl
    if (data.files) {
      data.files = data.files.map(f => ({ ...f }));
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

export async function deleteShare(code) {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'shares', code));
      if (snap.exists() && snap.data().totalChunks > 0) {
        await deleteAllChunks(code, snap.data().totalChunks);
      }
    } catch { /* ignore */ }
    await deleteDoc(doc(db, 'shares', code));
    return;
  }
  const shares = getDemoShares();
  delete shares[code];
  saveDemoShares(shares);
}

export async function cleanupExpiredShares() {
  if (!isFirebaseConfigured()) {
    const shares = getDemoShares();
    let changed = false;
    for (const code in shares) {
      if (isExpired(shares[code].expiresAt)) { delete shares[code]; changed = true; }
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
        if (data.totalChunks > 0) await deleteAllChunks(docSnap.id, data.totalChunks);
        await deleteDoc(doc(db, 'shares', docSnap.id));
        deleted++;
      } catch (e) { console.warn('Cleanup failed:', docSnap.id, e); }
    }
    if (deleted > 0) console.log(`🧹 Cleaned up ${deleted} expired share(s)`);
  } catch (e) { console.warn('Cleanup sweep failed:', e); }
}
