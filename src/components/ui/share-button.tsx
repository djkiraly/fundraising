'use client';

import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  playerName: string;
}

export function ShareButton({ playerName }: ShareButtonProps) {
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Support ${playerName}`,
        text: `Help ${playerName} reach their fundraising goal!`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="btn-secondary inline-flex items-center gap-2"
    >
      <Share2 className="w-4 h-4" />
      Share This Fundraiser
    </button>
  );
}
