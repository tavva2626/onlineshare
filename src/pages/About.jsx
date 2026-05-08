import { FiZap, FiShield, FiGlobe, FiHeart, FiCode, FiUsers } from 'react-icons/fi';

const values = [
  { icon: FiZap, title: 'Speed First', desc: 'No signup, no friction. Share in under 5 seconds.' },
  { icon: FiShield, title: 'Privacy Focused', desc: 'No tracking, no analytics, no stored user data. Ever.' },
  { icon: FiGlobe, title: 'Open & Accessible', desc: 'Works on any device, any browser, anywhere in the world.' },
  { icon: FiHeart, title: 'Community Driven', desc: 'Built for developers, students, and teams who just need to share.' },
  { icon: FiCode, title: 'Developer Friendly', desc: 'Syntax highlighting, code preview, and developer-first features.' },
  { icon: FiUsers, title: 'For Everyone', desc: 'From sharing notes to code reviews — it works for all use cases.' },
];

export default function About() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-bold text-surface-900 dark:text-surface-100 mb-4">
            About <span className="gradient-text">QuickShare24</span>
          </h1>
          <p className="text-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed">
            QuickShare24 is a fast, secure, and temporary content sharing platform. Share text, code, and files using a simple 4-digit access code — no accounts, no emails, no hassle.
          </p>
        </div>

        <div className="glass-card p-8 md:p-10 mb-12">
          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-4">Our Mission</h2>
          <p className="text-surface-600 dark:text-surface-300 leading-relaxed mb-4">
            We believe sharing should be instant and ephemeral. Too many tools require accounts, subscriptions, or complex setups just to send a snippet of code or a quick file.
          </p>
          <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
            QuickShare24 strips away the complexity. You drop your content, get a code, and share it. The recipient enters the code and gets the content. After 24 hours, everything is automatically cleaned up. Simple, secure, and private.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-8 text-center">What We <span className="gradient-text">Stand For</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {values.map((v, i) => (
            <div key={i} className="glass-card p-6 group hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-500 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <v.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">{v.title}</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-8 md:p-10 text-center">
          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-3">Tech Stack</h2>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Built with modern, battle-tested technologies.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['React', 'Vite', 'Tailwind CSS', 'Firebase', 'Firestore', 'Cloud Storage'].map((tech) => (
              <span key={tech} className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm font-medium text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
