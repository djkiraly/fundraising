'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ShareLinkProps {
  url: string;
  playerSlug: string;
}

export function ShareLink({ url, playerSlug }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={url}
        readOnly
        className="input-field flex-1"
      />
      <button
        onClick={handleCopy}
        className="btn-secondary"
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      </button>
      <Link href={`/player/${playerSlug}`} target="_blank" className="btn-secondary">
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
}
