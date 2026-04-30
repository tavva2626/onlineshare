export default function Privacy() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-100 mb-2">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-surface-500 dark:text-surface-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="glass-card p-8 md:p-10 space-y-8">
          {[
            { title: '1. Data Collection', content: 'CodeDrop does not collect personal data. We do not require accounts, emails, or any form of registration. The only data stored is the content you explicitly choose to share (messages, code, files) along with metadata like creation time and expiry time.' },
            { title: '2. Data Storage', content: 'Shared content is stored in Firebase Firestore and Firebase Cloud Storage. All content is automatically deleted after 24 hours. One-time view shares are deleted immediately after the first retrieval.' },
            { title: '3. Cookies & Tracking', content: 'CodeDrop does not use cookies, analytics, or tracking scripts. Your recent shares list is stored only in your browser\'s local storage and never sent to any server.' },
            { title: '4. File Uploads', content: 'Uploaded files are stored temporarily in Firebase Cloud Storage. They are associated with the share code and are deleted when the share expires. We do not scan, analyze, or access your files.' },
            { title: '5. Password Protection', content: 'If you set a password on a share, it is stored alongside the share data. We recommend not using sensitive or reused passwords for share protection.' },
            { title: '6. Third-Party Services', content: 'CodeDrop uses Firebase (by Google) for data storage and file hosting. Please refer to Google\'s privacy policy for information about how Firebase handles data.' },
            { title: '7. Security', content: 'We implement security best practices including input sanitization, file type validation, upload size limits, and rate limiting. However, no system is perfectly secure — please do not share extremely sensitive information.' },
            { title: '8. Contact', content: 'If you have questions about this privacy policy, you can reach out through the project\'s GitHub repository.' },
          ].map((section, idx) => (
            <div key={idx}>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">{section.title}</h2>
              <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
