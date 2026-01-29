'use client';

import { useState, useEffect } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MessageSquare, Save, Loader2, Check, AlertCircle } from 'lucide-react';

interface MessageEditorProps {
  initialMessage: string | null;
}

/**
 * Message editor component for player dashboard
 * Allows players to write a custom message for their fundraising page
 */
export function MessageEditor({ initialMessage }: MessageEditorProps) {
  const [message, setMessage] = useState(initialMessage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const currentMessage = message || '';
    const original = initialMessage || '';
    setHasChanges(currentMessage !== original);
  }, [message, initialMessage]);

  // Clear save status after delay
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/player/message', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save message');
      }

      setSaveStatus('saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving message:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-pink" />
          <h2 className="text-xl font-bold text-gray-900">Personal Message</h2>
        </div>
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            Failed to save
          </span>
        )}
      </div>

      <p className="text-gray-600 mb-4">
        Add a personal message to your fundraising page. This will be displayed to visitors
        and can help tell your story.
      </p>

      <RichTextEditor
        content={message}
        onChange={setMessage}
        placeholder="Write a message to your supporters..."
      />

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Tip: Use formatting to make your message stand out!
        </p>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Message
            </>
          )}
        </button>
      </div>
    </div>
  );
}
