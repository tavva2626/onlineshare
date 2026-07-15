import { db, isFirebaseConfigured } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, onSnapshot,
  collection, addDoc, query, orderBy, limit, getDocs
} from 'firebase/firestore';
import { isExpired } from '../utils/helpers';

const DEMO_KEY = 'quickshare24-demo-chatrooms';
const DEMO_MSG_KEY = 'quickshare24-demo-chatmessages';

/* ─── localStorage helpers (demo mode) ─── */
function getDemoRooms() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); }
  catch { return {}; }
}

function saveDemoRooms(rooms) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(rooms));
}

function getDemoMessages(code) {
  try {
    const allMsgs = JSON.parse(localStorage.getItem(DEMO_MSG_KEY) || '{}');
    return allMsgs[code] || [];
  } catch {
    return [];
  }
}

function saveDemoMessage(code, message) {
  try {
    const allMsgs = JSON.parse(localStorage.getItem(DEMO_MSG_KEY) || '{}');
    if (!allMsgs[code]) allMsgs[code] = [];
    allMsgs[code].push(message);
    localStorage.setItem(DEMO_MSG_KEY, JSON.stringify(allMsgs));
    window.dispatchEvent(new Event('storage')); // trigger update
  } catch (err) {
    console.error(err);
  }
}

/* ─── Public API ─── */

export async function chatRoomExists(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'chatrooms', code));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (isExpired(data.expiresAt)) {
      try { await deleteChatRoom(code); } catch {}
      return false;
    }
    return true;
  }
  const rooms = getDemoRooms();
  const room = rooms[code];
  if (!room) return false;
  if (isExpired(room.expiresAt)) {
    delete rooms[code];
    saveDemoRooms(rooms);
    return false;
  }
  return true;
}

export async function createChatRoom(code) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  if (isFirebaseConfigured()) {
    const docData = {
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
    };
    await setDoc(doc(db, 'chatrooms', code), docData);
    return { code, expiresAt: docData.expiresAt };
  }

  const docData = {
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  const rooms = getDemoRooms();
  rooms[code] = docData;
  saveDemoRooms(rooms);
  return { code, expiresAt: expires.toISOString() };
}

export async function getChatRoom(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'chatrooms', code));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (isExpired(data.expiresAt)) {
      try { await deleteChatRoom(code); } catch {}
      return null;
    }
    return data;
  }

  const rooms = getDemoRooms();
  const room = rooms[code];
  if (!room) return null;
  if (isExpired(room.expiresAt)) {
    delete rooms[code];
    saveDemoRooms(rooms);
    return null;
  }
  return room;
}

export async function sendMessage(code, { text, sender, senderColor }) {
  const now = new Date();
  if (isFirebaseConfigured()) {
    await addDoc(collection(db, 'chatrooms', code, 'messages'), {
      text,
      sender,
      senderColor,
      createdAt: Timestamp.fromDate(now),
    });
    return;
  }

  const message = {
    id: String(Math.random()),
    text,
    sender,
    senderColor,
    createdAt: now.toISOString(),
  };
  saveDemoMessage(code, message);
}

export function subscribeToMessages(code, callback) {
  if (isFirebaseConfigured()) {
    const q = query(
      collection(db, 'chatrooms', code, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );
    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        };
      });
      callback(messages);
    });
  }

  // Demo mode listener
  const checkUpdate = () => {
    const msgs = getDemoMessages(code).map(m => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
    callback(msgs);
  };

  window.addEventListener('storage', checkUpdate);
  const interval = setInterval(checkUpdate, 1000);

  // Initial load
  checkUpdate();

  return () => {
    window.removeEventListener('storage', checkUpdate);
    clearInterval(interval);
  };
}

export async function deleteChatRoom(code) {
  if (isFirebaseConfigured()) {
    // Delete all messages first (Firestore requires manual subcollection deletion)
    try {
      const q = query(collection(db, 'chatrooms', code, 'messages'));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Failed to delete messages subcollection:', err);
    }
    await deleteDoc(doc(db, 'chatrooms', code));
    return;
  }

  const rooms = getDemoRooms();
  delete rooms[code];
  saveDemoRooms(rooms);

  try {
    const allMsgs = JSON.parse(localStorage.getItem(DEMO_MSG_KEY) || '{}');
    delete allMsgs[code];
    localStorage.setItem(DEMO_MSG_KEY, JSON.stringify(allMsgs));
  } catch {}
}
