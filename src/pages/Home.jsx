import { Link } from 'react-router-dom';
import { FiSend, FiDownload, FiLock, FiClock, FiZap, FiShield, FiCode, FiFile } from 'react-icons/fi';
import { HiOutlineLightningBolt } from 'react-icons/hi';

const features = [
  {
    icon: FiZap,
    title: 'Instant Sharing',
    desc: 'Generate a 4-digit code and share anything in seconds. No signup needed.',
    color: 'from-brand-500 to-brand-600',
  },
  {
    icon: FiLock,
    title: 'Secure by Default',
    desc: 'Optional password protection and one-time view. Your data stays private.',
    color: 'from-accent-500 to-accent-600',
  },
  {
    icon: FiClock,
    title: 'Auto-Expiry',
    desc: 'All shares expire after 24 hours. Nothing lingers on our servers.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: FiCode,
    title: 'Code Snippets',
    desc: 'Syntax-highlighted code editor with 20+ language support built in.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: FiFile,
    title: 'File Support',
    desc: 'Upload multiple files at once — PDFs, PPTs, images, videos, ZIPs, and more with drag & drop.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: FiShield,
    title: 'No Tracking',
    desc: 'No accounts, no cookies, no analytics. Just pure, clean sharing.',
    color: 'from-emerald-500 to-emerald-600',
  },
];

const steps = [
  { num: '01', title: 'Drop Your Content', desc: 'Paste text, write code, or upload a file.' },
  { num: '02', title: 'Get Your Code', desc: 'Receive a unique 4-digit access code instantly.' },
  { num: '03', title: 'Share the Code', desc: 'Tell the code to anyone — they enter it to retrieve your content.' },
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
              Instant · Secure · Temporary
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-balance animate-slide-up">
            Share anything with a{' '}
            <span className="gradient-text">4-digit code</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto animate-slide-up text-balance" style={{ animationDelay: '0.1s' }}>
            Drop text, code snippets, or files — get a unique access code.
            No signup, no email. Content auto-expires in 24 hours.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/send" className="btn-primary text-lg px-8 py-4" id="hero-send-btn">
              <FiSend className="w-5 h-5" />
              Start Sharing
            </Link>
            <Link to="/receive" className="btn-secondary text-lg px-8 py-4" id="hero-receive-btn">
              <FiDownload className="w-5 h-5" />
              Retrieve Content
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="py-20 md:py-28 bg-surface-50 dark:bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100">
              How it <span className="gradient-text">works</span>
            </h2>
            <p className="mt-3 text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
              Three simple steps to share content securely with anyone.
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
              Everything you need to <span className="gradient-text">share securely</span>
            </h2>
            <p className="mt-3 text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
              Packed with features that make sharing effortless and safe.
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

      {/* ─── CTA Banner ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 p-10 md:p-16 text-center shadow-2xl shadow-brand-500/25">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to share something?
              </h2>
              <p className="text-brand-100 text-lg mb-8 max-w-md mx-auto">
                Start sharing in seconds. No account required.
              </p>
              <Link to="/send" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-600 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300" id="cta-send-btn">
                <FiSend className="w-5 h-5" />
                Share Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
