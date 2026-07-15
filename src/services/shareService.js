/**
 * Share service — handles creating and retrieving shares.
 * 
 * Strategy:
 * - Text/code: stored in Firestore (works cross-browser)
 * - Multiple files supported: each file is chunked into Firestore subcollection
 * - Files split into 950KB chunks in subcollection
 * - ALL files work cross-browser/cross-device
 * - Firebase Storage is NOT used (requires Blaze plan)
 *
 * Performance optimizations (v2):
 * - All files converted to Base64 in PARALLEL
 * - Chunk uploads run 6 at a time (was 1 at a time)
 * - Chunk downloads run ALL at once in parallel
 * - Chunk size increased to 950KB (fewer network requests)
 * - Cleanup and delete operations run in parallel
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
const CHUNK_SIZE = 950 * 1024;  // 950KB per chunk (was 700KB — fewer chunks = fewer network calls)
const UPLOAD_BATCH = 6;         // upload 6 chunks simultaneously
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

/* ─── Chunk helpers (OPTIMIZED) ─── */

function splitIntoChunks(base64String) {
  const chunks = [];
  for (let i = 0; i < base64String.length; i += CHUNK_SIZE) {
    chunks.push(base64String.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Upload chunks in parallel batches of UPLOAD_BATCH.
 * @param {string} code - share code
 * @param {{ globalIndex: number, data: string }[]} allChunks - flat array of all chunks across all files
 * @param {function} onBatchDone - called after each batch completes with (chunksCompleted, totalChunks)
 */
async function writeChunksParallel(code, allChunks, onBatchDone) {
  for (let i = 0; i < allChunks.length; i += UPLOAD_BATCH) {
    const batch = allChunks.slice(i, i + UPLOAD_BATCH);
    await Promise.all(
      batch.map(chunk =>
        setDoc(doc(db, 'shares', code, 'chunks', String(chunk.globalIndex)), {
          data: chunk.data,
          index: chunk.globalIndex,
        })
      )
    );
    onBatchDone?.(Math.min(i + UPLOAD_BATCH, allChunks.length), allChunks.length);
  }
}

/**
 * Download ALL chunks for a file in parallel (single Promise.all burst).
 * This is the #1 speed improvement — was sequential, now all at once.
 */
async function readChunksParallel(code, chunkStart, chunkCount) {
  if (chunkCount === 0) return '';

  // Fire ALL reads simultaneously
  const promises = Array.from({ length: chunkCount }, (_, i) =>
    getDoc(doc(db, 'shares', code, 'chunks', String(chunkStart + i)))
  );

  const snaps = await Promise.all(promises);
  return snaps
    .filter(s => s.exists())
    .map(s => s.data())
    .sort((a, b) => a.index - b.index)
    .map(c => c.data)
    .join('');
}

/**
 * Delete chunks in parallel batches.
 */
async function deleteChunksParallel(code, totalChunks) {
  const DELETE_BATCH = 10;
  for (let i = 0; i < totalChunks; i += DELETE_BATCH) {
    const batch = Array.from(
      { length: Math.min(DELETE_BATCH, totalChunks - i) },
      (_, j) => deleteDoc(doc(db, 'shares', code, 'chunks', String(i + j))).catch(() => {})
    );
    await Promise.all(batch);
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
 * OPTIMIZED: parallel file reading + parallel chunk uploads.
 * @param {object} shareData - { code, contentType, message, codeContent, codeLanguage, oneTimeView, passwordProtected, password }
 * @param {File[]} files - array of File objects
 * @param {function} onProgress - called with 0-100
 */
export async function createShare(shareData, files = [], onProgress) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  onProgress?.(5);

  if (isFirebaseConfigured()) {
    // ── Step 1: Convert ALL files to Base64 in PARALLEL ──
    const base64Array = files.length > 0
      ? await Promise.all(files.map(f => fileToBase64(f)))
      : [];

    onProgress?.(20);

    // ── Step 2: Build all chunks for all files at once ──
    const fileMeta = [];
    const allChunks = [];  // flat array: { globalIndex, data }
    let chunkCursor = 0;

    for (let f = 0; f < files.length; f++) {
      const chunks = splitIntoChunks(base64Array[f]);
      fileMeta.push({
        name: files[f].name,
        type: files[f].type || 'application/octet-stream',
        size: files[f].size,
        chunkStart: chunkCursor,
        chunkCount: chunks.length,
      });
      for (let i = 0; i < chunks.length; i++) {
        allChunks.push({ globalIndex: chunkCursor + i, data: chunks[i] });
      }
      chunkCursor += chunks.length;
    }

    // ── Step 3: Upload ALL chunks in parallel batches ──
    if (allChunks.length > 0) {
      await writeChunksParallel(shareData.code, allChunks, (done, total) => {
        // Progress: 25% to 85% during chunk uploads
        onProgress?.(25 + Math.round((done / total) * 60));
      });
    }

    onProgress?.(90);

    // ── Step 4: Write main document ──
    const docData = {
      ...shareData,
      files: fileMeta,
      totalChunks: chunkCursor,
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
 * OPTIMIZED: reads ALL chunks across ALL files in parallel.
 */
export async function retrieveShare(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    if (!snap.exists()) return { status: 'not_found' };
    const data = snap.data();

    if (isExpired(data.expiresAt)) {
      try {
        if (data.totalChunks > 0) await deleteChunksParallel(code, data.totalChunks);
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
        try { data.files[0].dataUrl = await readChunksParallel(code, 0, data.fileChunks); }
        catch { data.files[0].dataUrl = ''; }
      }
      return { status: 'ok', data };
    }

    // New multi-file format: read ALL files' chunks in PARALLEL
    if (data.files && data.files.length > 0 && data.totalChunks > 0) {
      const results = await Promise.all(
        data.files.map(async (fileMeta) => {
          try {
            return await readChunksParallel(code, fileMeta.chunkStart, fileMeta.chunkCount);
          } catch (e) {
            console.error('Failed to read chunks for', fileMeta.name, e);
            return '';
          }
        })
      );
      // Assign reassembled data to each file
      data.files.forEach((fileMeta, i) => { fileMeta.dataUrl = results[i]; });
    }

    // Shallow copy files array
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
        await deleteChunksParallel(code, snap.data().totalChunks);
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

    // Delete all expired shares in parallel
    let deleted = 0;
    await Promise.all(snapshot.docs.map(async (docSnap) => {
      try {
        const data = docSnap.data();
        if (data.totalChunks > 0) await deleteChunksParallel(docSnap.id, data.totalChunks);
        await deleteDoc(doc(db, 'shares', docSnap.id));
        deleted++;
      } catch (e) { console.warn('Cleanup failed:', docSnap.id, e); }
    }));
    if (deleted > 0) console.log(`🧹 Cleaned up ${deleted} expired share(s)`);
  } catch (e) { console.warn('Cleanup sweep failed:', e); }
}
