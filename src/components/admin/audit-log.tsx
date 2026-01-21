'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, History, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  settingKey: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/settings/audit?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs when expanded for the first time
  useEffect(() => {
    if (isExpanded && logs.length === 0 && !loading) {
      fetchLogs();
    }
  }, [isExpanded, logs.length, loading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-xl font-bold text-gray-900">Audit Log</h3>
          {!isExpanded && logs.length > 0 && (
            <span className="text-sm text-gray-500">({logs.length} entries)</span>
          )}
        </div>
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchLogs();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchLogs}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Retry
              </button>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No audit log entries yet.</p>
          ) : (
            <div className="space-y-3 mt-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {log.settingKey}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    {log.action === 'create' && (
                      <span>
                        Set to:{' '}
                        <span className="font-mono bg-gray-100 px-1 rounded">
                          {log.newValue || '(empty)'}
                        </span>
                      </span>
                    )}
                    {log.action === 'update' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono bg-gray-100 px-1 rounded text-xs">
                          {log.oldValue || '(empty)'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="font-mono bg-gray-100 px-1 rounded text-xs">
                          {log.newValue || '(empty)'}
                        </span>
                      </div>
                    )}
                    {log.action === 'delete' && (
                      <span className="text-red-600">Setting deleted</span>
                    )}
                  </div>

                  {log.user && (
                    <div className="text-xs text-gray-500">
                      by {log.user.name} ({log.user.email})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
