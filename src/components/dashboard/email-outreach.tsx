'use client';

import { useState } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Mail,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  X,
  AlertCircle,
  Users,
} from 'lucide-react';

interface EmailOutreachProps {
  playerName: string;
  playerUrl: string;
}

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

const MAX_EMAILS = 10;

/**
 * Email outreach component for player dashboard
 * Allows players to send fundraiser emails to potential supporters
 */
export function EmailOutreach({ playerName, playerUrl }: EmailOutreachProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addEmailField = () => {
    if (emails.length < MAX_EMAILS) {
      setEmails([...emails, '']);
    }
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getValidEmails = (): string[] => {
    return emails.filter(email => email.trim() && validateEmail(email.trim()));
  };

  const handleSend = async () => {
    const validEmails = getValidEmails();

    if (validEmails.length === 0) {
      setError('Please enter at least one valid email address');
      return;
    }

    if (!message.trim() || message === '<p></p>') {
      setError('Please write a message to include in the email');
      return;
    }

    setIsSending(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/player/send-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: validEmails,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setResults(data.results);

      // Clear successfully sent emails from the list
      const failedEmails = data.results
        .filter((r: SendResult) => !r.success)
        .map((r: SendResult) => r.email);

      if (failedEmails.length === 0) {
        // All sent successfully - reset form
        setEmails(['']);
        setMessage('');
      } else {
        // Keep only failed emails for retry
        setEmails(failedEmails.length > 0 ? failedEmails : ['']);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const validEmailCount = getValidEmails().length;
  const hasMessage = message.trim() && message !== '<p></p>';

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-primary-pink" />
        <h2 className="text-xl font-bold text-gray-900">Invite Supporters</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Send an email to friends and family inviting them to support your fundraiser.
        You can send up to {MAX_EMAILS} emails at a time.
      </p>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">
              Sent {results.filter(r => r.success).length} of {results.length} emails
            </span>
          </div>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{result.email}</span>
                {result.error && (
                  <span className="text-red-500 text-xs">({result.error})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Addresses */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Addresses
        </label>
        <div className="space-y-2">
          {emails.map((email, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
                placeholder="friend@example.com"
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent ${
                  email && !validateEmail(email)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {emails.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEmailField(index)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove email"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {emails.length < MAX_EMAILS && (
          <button
            type="button"
            onClick={addEmailField}
            className="mt-2 flex items-center gap-1 text-sm text-primary-pink hover:text-primary-pink-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another email
          </button>
        )}

        <p className="mt-1 text-sm text-gray-500">
          {validEmailCount} of {MAX_EMAILS} emails entered
        </p>
      </div>

      {/* Message */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Message
        </label>
        <RichTextEditor
          content={message}
          onChange={setMessage}
          placeholder="Write a personal message to your supporters..."
        />
        <p className="mt-1 text-sm text-gray-500">
          This message will be included in the email along with a link to your fundraiser page.
        </p>
      </div>

      {/* Preview */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">Email Preview:</div>
        <div className="text-sm">
          <div className="font-medium text-gray-900 mb-1">
            Subject: {playerName} is fundraising for their Panhandle Powerhouse Volleyball Club
          </div>
          <div className="text-gray-600">
            Your message will appear above a button linking to:{' '}
            <span className="text-primary-pink">{playerUrl}</span>
          </div>
        </div>
      </div>

      {/* Send Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={isSending || validEmailCount === 0 || !hasMessage}
          className="flex items-center gap-2 px-6 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send {validEmailCount > 0 ? `${validEmailCount} Email${validEmailCount > 1 ? 's' : ''}` : 'Emails'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
