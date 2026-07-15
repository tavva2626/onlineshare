import { db, isFirebaseConfigured } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, onSnapshot
} from 'firebase/firestore';
import { isExpired } from '../utils/helpers';

const DEMO_KEY = 'quickshare24-demo-clipboards';

/* ─── localStorage helpers (demo mode) ─── */
function getDemoClipboards() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); }
  catch { return {}; }
}

function saveDemoClipboards(clips) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(clips));
}

/* ─── Public API ─── */

export async function clipboardExists(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'clipboards', code));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (isExpired(data.expiresAt)) {
      try { await deleteDoc(doc(db, 'clipboards', code)); } catch {}
      return false;
    }
    return true;
  }
  const clips = getDemoClipboards();
  const clip = clips[code];
  if (!clip) return false;
  if (isExpired(clip.expiresAt)) {
    delete clips[code];
    saveDemoClipboards(clips);
    return false;
  }
  return true;
}

export async function createClipboard(code) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  if (isFirebaseConfigured()) {
    const docData = {
      content: '',
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
      lastUpdated: Timestamp.fromDate(now),
    };
    await setDoc(doc(db, 'clipboards', code), docData);
    return { code, expiresAt: docData.expiresAt };
  }

  const docData = {
    content: '',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    lastUpdated: now.toISOString(),
  };
  const clips = getDemoClipboards();
  clips[code] = docData;
  saveDemoClipboards(clips);
  return { code, expiresAt: expires.toISOString() };
}

export async function getClipboard(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'clipboards', code));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (isExpired(data.expiresAt)) {
      try { await deleteDoc(doc(db, 'clipboards', code)); } catch {}
      return null;
    }
    return data;
  }

  const clips = getDemoClipboards();
  const clip = clips[code];
  if (!clip) return null;
  if (isExpired(clip.expiresAt)) {
    delete clips[code];
    saveDemoClipboards(clips);
    return null;
  }
  return clip;
}

export async function updateClipboardContent(code, content) {
  const now = new Date();
  if (isFirebaseConfigured()) {
    await updateDoc(doc(db, 'clipboards', code), {
      content,
      lastUpdated: Timestamp.fromDate(now),
    });
    return;
  }

  const clips = getDemoClipboards();
  if (clips[code]) {
    clips[code].content = content;
    clips[code].lastUpdated = now.toISOString();
    saveDemoClipboards(clips);
    // Dispatch storage event manually for same-tab triggers if needed
    window.dispatchEvent(new Event('storage'));
  }
}

export function subscribeToClipboard(code, callback) {
  if (isFirebaseConfigured()) {
    return onSnapshot(doc(db, 'clipboards', code), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!isExpired(data.expiresAt)) {
          callback(data);
          return;
        }
      }
      callback(null);
    });
  }

  // Demo mode: poll / storage listener combo
  const checkUpdate = () => {
    const clips = getDemoClipboards();
    const clip = clips[code];
    if (clip && !isExpired(clip.expiresAt)) {
      callback(clip);
    } else {
      callback(null);
    }
  };

  window.addEventListener('storage', checkUpdate);
  // Also poll slightly for local changes in same tab
  const interval = setInterval(checkUpdate, 1000);

  // Initial call
  checkUpdate();

  return () => {
    window.removeEventListener('storage', checkUpdate);
    clearInterval(interval);
  };
}
