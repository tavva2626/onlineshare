import { Link } from 'react-router-dom';
import { FiSend, FiDownload, FiLock, FiClock, FiZap, FiShield, FiCode, FiFile, FiImage, FiClipboard, FiMessageCircle } from 'react-icons/fi';
import { HiOutlineLightningBolt } from 'react-icons/hi';

const features = [
  {
    icon: FiZap,
    title: 'Instant Online Share',
    desc: 'Generate a 4-digit code and share anything online in seconds. No signup needed — the fastest online share tool.',
    color: 'from-brand-500 to-brand-600',
  },
  {
    icon: FiClipboard,
    title: 'Online Clipboard',
    desc: 'Use it as a free online clipboard — copy text on one device, paste it anywhere using your 4-digit code.',
    color: 'from-accent-500 to-accent-600',
  },
  {
    icon: FiClock,
    title: 'Auto-Expiry in 24h',
    desc: 'All online shares expire after 24 hours. Nothing lingers — your files and text stay private.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: FiCode,
    title: 'Code Share Online',
    desc: 'Share code snippets online with syntax highlighting. Supports 20+ programming languages.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: FiFile,
    title: 'File Share Online',
    desc: 'Online file sharing for PDFs, PPTs, DOCX, ZIPs, videos and all file types. Upload multiple files at once.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: FiImage,
    title: 'Image Share Online',
    desc: 'Share images online instantly — PNG, JPG, GIF, WebP. Preview images before downloading.',
    color: 'from-emerald-500 to-emerald-600',
  },
];

const steps = [
  { num: '01', title: 'Drop Your Content', desc: 'Paste text to online clipboard, upload files, or write code to share online.' },
  { num: '02', title: 'Get Your 4-Digit Code', desc: 'Receive a unique 4-digit access code for your online share instantly.' },
  { num: '03', title: 'Share the Code', desc: 'Tell the code to anyone — they enter it to retrieve your file or text online.' },
];

const useCases = [
  { emoji: '📄', label: 'Share PDF Online' },
  { emoji: '📊', label: 'Share PPT Online' },
  { emoji: '🖼️', label: 'Share Images Online' },
  { emoji: '💻', label: 'Share Code Online' },
  { emoji: '📝', label: 'Online Clipboard' },
  { emoji: '🎵', label: 'Share Audio Online' },
  { emoji: '🎬', label: 'Share Video Online' },
  { emoji: '📦', label: 'Share ZIP Online' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ─── Hero ─── */}
      <section className="relative hero-gradient overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Decorative orbs */}
        <div className="gradient-orb w-72 h-72 bg-brand-400 top-10 -left-20" />
        <div className="gradient-orb w-96 h-96 bg-accent-400 -top-20 right-0 animation-delay-2000" style={{ animationDelay: '2s' }} />
        <div className="gradient-orb w-64 h-64 bg-purple-400 bottom-0 left-1/3" style={{ animationDelay: '4s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 mb-8 animate-fade-in">
            <HiOutlineLightningBolt className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
              Free · Instant · Secure · No Login
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-balance animate-slide-up">
            Free Online File Share &{' '}
            <span className="gradient-text">Online Clipboard</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto animate-slide-up text-balance" style={{ animationDelay: '0.1s' }}>
            The easiest online share tool — share files, images, text and code online using a simple <strong>4-digit code</strong>.
            No signup, no email. Works as a free online clipboard. Auto-expires in 24 hours.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/send" className="btn-primary text-lg px-8 py-4" id="hero-send-btn">
              <FiSend className="w-5 h-5" />
              Share Online Now
            </Link>
            <Link to="/receive" className="btn-secondary text-lg px-8 py-4" id="hero-receive-btn">
              <FiDownload className="w-5 h-5" />
              Retrieve Content
            </Link>
          </div>

          {/* Use case tags */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {useCases.map((uc) => (
              <span key={uc.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 dark:bg-white/5 border border-white/20 text-xs font-medium text-surface-700 dark:text-surface-300 backdrop-blur-sm">
                {uc.emoji} {uc.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quick Tools Section ─── */}
      <section className="py-12 bg-white/50 dark:bg-surface-900/50 backdrop-blur-sm border-y border-surface-200/30 dark:border-surface-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-100">
              ⚡ Explore <span className="gradient-text">Interactive Tools</span>
            </h2>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              Snappy, instant, and real-time utilities for modern productivity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Live Clipboard */}
            <Link to="/clipboard" className="glass-card p-6 flex flex-col justify-between group hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1">
              <div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mb-4 text-white shadow-md">
                  <FiClipboard className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 group-hover:text-brand-500 transition-colors">Live Clipboard</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
                  Sync text in real-time between devices. Copy on mobile, paste on laptop instantly.
                </p>
              </div>
              <div className="mt-4 text-xs font-semibold text-brand-500 flex items-center gap-1">
                Open Clipboard &rarr;
              </div>
            </Link>

            {/* Temp Chat */}
            <Link to="/chat" className="glass-card p-6 flex flex-col justify-between group hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1">
              <div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500 to-brand-500 flex items-center justify-center mb-4 text-white shadow-md">
                  <FiMessageCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 group-hover:text-accent-500 transition-colors">Temp Chat Room</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
                  Create secure, temporary group chatrooms without signup. Auto-deletes in 24 hours.
                </p>
              </div>
              <div className="mt-4 text-xs font-semibold text-accent-500 flex items-center gap-1">
                Start Chatting &rarr;
              </div>
            </Link>

            {/* Image Compressor */}
            <Link to="/tools/image-compressor" className="glass-card p-6 flex flex-col justify-between group hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1">
              <div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-4 text-white shadow-md">
                  <FiImage className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 group-hover:text-purple-500 transition-colors">Image Compressor</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
                  Compress images in-browser to reduce size before sharing. 100% private & client-side.
                </p>
              </div>
              <div className="mt-4 text-xs font-semibold text-purple-500 flex items-center gap-1">
                Compress Images &rarr;
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="py-20 md:py-28 bg-surface-50 dark:bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
              How Online File Sharing <span className="gradient-text">Works</span>
            </h2>
            <p className="mt-3 text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
              Three simple steps to share files, text or code online with anyone — no account needed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative group">
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-brand-300 to-transparent dark:from-brand-600" />
                )}
                <div className="glass-card p-8 text-center hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-500 group-hover:-translate-y-1">
                  <div className="text-5xl font-black gradient-text mb-4">{step.num}</div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">{step.title}</h3>
                  <p className="text-sm text-surface-500 dark:text-surface-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
              The Best Free <span className="gradient-text">Online Share Tool</span>
            </h2>
            <p className="mt-3 text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
              Online clipboard, file share, image share, code share — all in one free tool.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="glass-card p-6 group hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-500 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">{f.title}</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEO Text Section ─── */}
      <section className="py-16 bg-surface-50 dark:bg-surface-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-100 mb-6 text-center">
              Why Use QuickShare24 for <span className="gradient-text">Online Sharing?</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-2">🌐 Free Online Clipboard</h3>
                <p>QuickShare24 works as a free online clipboard. Copy something on your laptop, get a 4-digit code, and paste it on your phone — instantly. No cables, no apps, no login required.</p>
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-2">📁 Online File Share</h3>
                <p>Share any file online — PDFs, PowerPoints, Word documents, images, videos and more. Upload once, share the code, anyone can download. The simplest online file sharing tool.</p>
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-2">🔒 Private & Secure</h3>
                <p>All online shares are temporary and auto-delete after 24 hours. Add password protection for extra security. No accounts means no data collection — your privacy is protected.</p>
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-2">📱 Works on All Devices</h3>
                <p>Share online from your laptop, phone or tablet. QuickShare24 is fully mobile-friendly. Share files between Android, iPhone, Windows and Mac with ease.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 p-10 md:p-16 text-center shadow-2xl shadow-brand-500/25">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start Sharing Online for Free
              </h2>
              <p className="text-brand-100 text-lg mb-8 max-w-md mx-auto">
                Free online file share, online clipboard and code share — no account needed.
              </p>
              <Link to="/send" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-600 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300" id="cta-send-btn">
                <FiSend className="w-5 h-5" />
                Share Now — It's Free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
