'use client';

import DOMPurify from 'isomorphic-dompurify';

interface PlayerMessageProps {
  message: string | null;
  className?: string;
}

// Configure DOMPurify to allow style attribute with text-align
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'style') {
    // Only allow text-align styles
    const style = data.attrValue;
    const textAlignMatch = style.match(/text-align:\s*(left|center|right|justify)/i);
    if (textAlignMatch) {
      data.attrValue = `text-align: ${textAlignMatch[1]}`;
    } else {
      data.attrValue = '';
    }
  }
});

/**
 * Renders a player's rich text message safely
 * Sanitizes HTML to prevent XSS attacks
 */
export function PlayerMessage({ message, className = '' }: PlayerMessageProps) {
  if (!message || message === '<p></p>') {
    return null;
  }

  // Sanitize the HTML to prevent XSS
  const sanitizedHtml = DOMPurify.sanitize(message, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'br'],
    ALLOWED_ATTR: ['style'],
  });

  return (
    <div
      className={`prose prose-pink max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
