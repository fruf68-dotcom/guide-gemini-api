
import React, { useState, useCallback } from 'react';
import { ClipboardCopy, Check } from './Icons';

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="bg-gray-900/70 rounded-lg overflow-hidden border border-gray-700/50 relative group">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800/50">
        <span className="text-xs font-sans text-brand-text-secondary uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm text-brand-text-secondary hover:text-white transition-colors p-1 rounded-md"
        >
          {isCopied ? (
            <>
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-green-400">Copié !</span>
            </>
          ) : (
            <>
              <ClipboardCopy className="h-4 w-4" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto">
        <code className={`language-${language} text-cyan-300`}>
          {code.trim()}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
