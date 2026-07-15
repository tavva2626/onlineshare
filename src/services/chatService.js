import { db, isFirebaseConfigured } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, onSnapshot, arrayUnion
} from 'firebase/firestore';
import { isExpired } from '../utils/helpers';

const DEMO_KEY = 'quickshare24-demo-chatrooms';

/* ─── localStorage helpers (demo mode) ─── */
function getDemoRooms() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); }
  catch { return {}; }
}

function saveDemoRooms(rooms) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(rooms));
}

/* ─── Public API (using shares collection for security rules compatibility) ─── */

export async function chatRoomExists(code) {
  if (isFirebaseConfigured()) {
    const snap = await getDoc(doc(db, 'shares', code));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (data.contentType !== 'chatroom') return false;
    if (isExpired(data.expiresAt)) {
      try { await deleteDoc(doc(db, 'shares', code)); } catch {}
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
      contentType: 'chatroom',
      messages: [],
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
    };
    // Saved in the 'shares' collection to utilize existing security rules
    await setDoc(doc(db, 'shares', code), docData);
    return { code, expiresAt: docData.expiresAt };
  }

  const docData = {
    messages: [],
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
    const snap = await getDoc(doc(db, 'shares', code));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.contentType !== 'chatroom') return null;
    if (isExpired(data.expiresAt)) {
      try { await deleteDoc(doc(db, 'shares', code)); } catch {}
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
  const messageData = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    sender,
    senderColor,
    createdAt: now.toISOString(),
  };

  if (isFirebaseConfigured()) {
    await updateDoc(doc(db, 'shares', code), {
      messages: arrayUnion(messageData)
    });
    return;
  }

  const rooms = getDemoRooms();
  if (rooms[code]) {
    rooms[code].messages.push(messageData);
    saveDemoRooms(rooms);
    window.dispatchEvent(new Event('storage'));
  }
}

export function subscribeToMessages(code, callback) {
  if (isFirebaseConfigured()) {
    return onSnapshot(doc(db, 'shares', code), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.contentType === 'chatroom' && !isExpired(data.expiresAt)) {
          // Map ISO string dates back to Date objects for the UI
          const msgs = (data.messages || []).map(m => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }));
          callback(msgs);
          return;
        }
      }
      callback([]);
    });
  }

  // Demo mode
  const checkUpdate = () => {
    const rooms = getDemoRooms();
    const room = rooms[code];
    if (room && !isExpired(room.expiresAt)) {
      const msgs = (room.messages || []).map(m => ({
        ...m,
        createdAt: new Date(m.createdAt)
      }));
      callback(msgs);
    } else {
      callback([]);
    }
  };

  window.addEventListener('storage', checkUpdate);
  const interval = setInterval(checkUpdate, 1000);
  checkUpdate();

  return () => {
    window.removeEventListener('storage', checkUpdate);
    clearInterval(interval);
  };
}

export async function deleteChatRoom(code) {
  if (isFirebaseConfigured()) {
    await deleteDoc(doc(db, 'shares', code));
    return;
  }

  const rooms = getDemoRooms();
  delete rooms[code];
  saveDemoRooms(rooms);
}
