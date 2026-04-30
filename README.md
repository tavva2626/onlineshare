# CodeDrop — Instant Secure Sharing

> Share text, code snippets, and files using a temporary 6-character access code. No signup, no email — just drop and share.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Firebase project (free tier works)

### 1. Clone & Install

```bash
cd onlineshare
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Firestore Database** (start in test mode for dev)
4. Enable **Storage** (start in test mode for dev)
5. Go to Project Settings → General → Your apps → Add a **Web app**
6. Copy the Firebase config values

### 3. Set Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Then fill in your Firebase values:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_MAX_FILE_SIZE_MB=50
```

### 4. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`.

## 🏗️ Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   └── ui/
│       ├── CodeEditor.jsx
│       ├── FileUpload.jsx
│       ├── QRCode.jsx
│       └── Spinner.jsx
├── context/
│   └── ThemeContext.jsx
├── hooks/
│   └── useShares.js
├── pages/
│   ├── Home.jsx
│   ├── Send.jsx
│   ├── Receive.jsx
│   ├── About.jsx
│   └── Privacy.jsx
├── utils/
│   └── helpers.js
├── App.jsx
├── firebase.js
├── index.css
└── main.jsx
```

## 🔥 Firebase Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shares/{code} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['code', 'message', 'createdAt', 'expiresAt']);
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['downloadCount']);
      allow delete: if true;
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /shares/{code}/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 50 * 1024 * 1024;
    }
  }
}
```

## ✨ Features

- **6-character access codes** with collision prevention
- **Syntax-highlighted** code editor (20+ languages)
- **Drag & drop** file uploads (PDF, images, docs, ZIP, code files)
- **Password protection** for sensitive shares
- **One-time view** — content deleted after first retrieval
- **QR code** generation for easy mobile sharing
- **24-hour auto-expiry** on all shares
- **Dark mode / light mode** toggle
- **Recent shares** history (local browser storage only)
- **Responsive design** for mobile and desktop
- **Toast notifications** for user feedback
- **File preview** for images and PDFs
- **Copy to clipboard** for codes and content

## 📦 Production Build

```bash
npm run build
```

Output will be in the `dist/` folder, ready for Firebase Hosting or any static host.

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select dist as public dir, configure as SPA
firebase deploy
```

## 📄 License

MIT — free for personal and commercial use.
