import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import { FiCopy, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const languages = [
  'javascript', 'python', 'java', 'cpp', 'c', 'html', 'css', 'json',
  'typescript', 'jsx', 'sql', 'bash', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'dart', 'markdown', 'yaml', 'xml',
];

export default function CodeEditor({ value, onChange, readOnly = false, language: propLang }) {
  const { dark } = useTheme();
  const [language, setLanguage] = useState(propLang || 'javascript');
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(readOnly);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy.');
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-800/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="ml-3 text-xs font-mono bg-transparent text-surface-500 dark:text-surface-400 border-none focus:outline-none cursor-pointer"
            disabled={readOnly}
          >
            {languages.map((lang) => (
              <option key={lang} value={lang} className="bg-white dark:bg-surface-800">
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-brand-500 transition-colors px-2 py-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              {isPreview ? 'Edit' : 'Preview'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-brand-500 transition-all duration-200"
            aria-label="Copy code"
          >
            {copied ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {isPreview && value ? (
        <div className="syntax-highlighter-wrapper max-h-96 overflow-auto scrollbar-thin">
          <SyntaxHighlighter
            language={language}
            style={dark ? oneDark : oneLight}
            showLineNumbers
            wrapLines
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '0.875rem',
              background: 'transparent',
            }}
          >
            {value}
          </SyntaxHighlighter>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder="Paste your code here..."
          spellCheck={false}
          className="w-full min-h-[200px] max-h-96 p-4 bg-transparent text-sm font-mono text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none resize-y scrollbar-thin"
        />
      )}
    </div>
  );
}
