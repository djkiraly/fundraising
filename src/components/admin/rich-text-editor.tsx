'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Simple rich text editor with basic formatting options
 * Supports: Bold, Italic, Underline, Font Size
 */
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);
  const onChangeRef = useRef(onChange);
  const [fontSize, setFontSize] = useState<string>('16');

  // Keep onChange ref current to avoid stale closures
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync innerHTML from prop only when value changes externally
  useEffect(() => {
    if (editorRef.current && value !== lastHtml.current) {
      editorRef.current.innerHTML = value || '';
      lastHtml.current = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtml.current = html;
      onChangeRef.current(html);
    }
  }, []);

  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    emitChange();
    editorRef.current?.focus();
  }, [emitChange]);

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleAlignLeft = () => execCommand('justifyLeft');
  const handleAlignCenter = () => execCommand('justifyCenter');
  const handleAlignRight = () => execCommand('justifyRight');

  const handleFontSize = (size: string) => {
    setFontSize(size);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement('span');
        span.style.fontSize = `${size}px`;
        try {
          range.surroundContents(span);
          emitChange();
        } catch {
          execCommand('fontSize', '7');
          if (editorRef.current) {
            const fonts = editorRef.current.querySelectorAll('font[size="7"]');
            fonts.forEach(font => {
              const newSpan = document.createElement('span');
              newSpan.style.fontSize = `${size}px`;
              newSpan.innerHTML = font.innerHTML;
              font.parentNode?.replaceChild(newSpan, font);
            });
            emitChange();
          }
        }
      }
    }
    editorRef.current?.focus();
  };

  const handleInput = () => {
    emitChange();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300">
        <button
          type="button"
          onClick={handleBold}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleUnderline}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-1">
          <Type className="w-4 h-4 text-gray-500" />
          <select
            value={fontSize}
            onChange={(e) => handleFontSize(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            title="Font Size"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="28">28px</option>
            <option value="32">32px</option>
          </select>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={handleAlignLeft}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleAlignCenter}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleAlignRight}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[120px] p-3 focus:outline-none focus:ring-2 focus:ring-primary-pink focus:ring-inset text-left"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Placeholder styling */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
}
