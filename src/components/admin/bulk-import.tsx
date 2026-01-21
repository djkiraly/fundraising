'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, RefreshCw, Download, Info } from 'lucide-react';

interface ImportResult {
  success: boolean;
  row: number;
  name: string;
  email: string;
  error?: string;
  playerId?: string;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
}

const SAMPLE_DATA = `name\temail\tpassword\tphotoUrl\tparentEmail\tgoal\tisActive\tgenerateSquares
John Smith\tjohn@example.com\t\t\tjohn.parent@example.com\t150\ttrue\ttrue
Jane Doe\tjane@example.com\tpassword123\thttps://example.com/jane.jpg\t\t200\ttrue\ttrue
Mike Johnson\tmike@example.com\t\t\tmike.parent@example.com\t100\ttrue\ttrue`;

/**
 * Bulk import component for players
 */
export function BulkImport() {
  const router = useRouter();
  const [data, setData] = useState('');
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const handleImport = async () => {
    if (!data.trim()) {
      setError('Please enter data to import');
      return;
    }

    setImporting(true);
    setError(null);
    setSummary(null);
    setResults([]);

    try {
      const response = await fetch('/api/admin/players/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setSummary(result.summary);
      setResults(result.results);

      if (result.summary.successful > 0) {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleLoadSample = () => {
    setData(SAMPLE_DATA);
    setError(null);
    setSummary(null);
    setResults([]);
  };

  const handleClear = () => {
    setData('');
    setError(null);
    setSummary(null);
    setResults([]);
  };

  const lineCount = data.trim() ? data.trim().split('\n').length - 1 : 0; // -1 for header

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-pink" />
            <h3 className="text-lg font-semibold text-gray-900">Bulk Import Players</h3>
          </div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Info className="w-4 h-4" />
            {showInstructions ? 'Hide' : 'Show'} Instructions
          </button>
        </div>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Instructions</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p>Paste tab-delimited data below. The first row must be headers.</p>
            <div className="bg-white rounded p-3 border border-blue-200">
              <p className="font-medium mb-1">Required columns:</p>
              <ul className="list-disc list-inside text-blue-600">
                <li><code className="bg-blue-100 px-1 rounded">name</code> - Player&apos;s full name</li>
                <li><code className="bg-blue-100 px-1 rounded">email</code> - Login email address (must be unique)</li>
              </ul>
            </div>
            <div className="bg-white rounded p-3 border border-blue-200">
              <p className="font-medium mb-1">Optional columns:</p>
              <ul className="list-disc list-inside text-blue-600">
                <li><code className="bg-blue-100 px-1 rounded">password</code> - If blank, auto-generated</li>
                <li><code className="bg-blue-100 px-1 rounded">photoUrl</code> - URL to profile photo</li>
                <li><code className="bg-blue-100 px-1 rounded">parentEmail</code> - Parent/guardian email</li>
                <li><code className="bg-blue-100 px-1 rounded">goal</code> - Fundraising goal (default: 100)</li>
                <li><code className="bg-blue-100 px-1 rounded">isActive</code> - true/false (default: true)</li>
                <li><code className="bg-blue-100 px-1 rounded">generateSquares</code> - true/false (default: true)</li>
              </ul>
            </div>
            <p className="text-blue-600">
              <strong>Tip:</strong> Copy data from Excel or Google Sheets - it&apos;s automatically tab-delimited!
            </p>
            <p className="text-blue-600">
              <strong>Limit:</strong> Maximum 100 players per import.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Summary display */}
        {summary && (
          <div className={`p-4 rounded-lg border ${
            summary.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {summary.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Info className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-medium">
                Import Complete: {summary.successful} of {summary.total} players imported
              </span>
            </div>
            {summary.failed > 0 && (
              <p className="text-sm text-yellow-700">
                {summary.failed} row(s) failed. See details below.
              </p>
            )}
          </div>
        )}

        {/* Results table */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className={result.success ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm text-gray-900">{result.row}</td>
                      <td className="px-4 py-2">
                        {result.success ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                            <XCircle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{result.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{result.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {result.error || (result.playerId ? `ID: ${result.playerId.slice(0, 8)}...` : '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Textarea for data input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="importData" className="block text-sm font-medium text-gray-700">
              Tab-Delimited Data
            </label>
            <span className="text-sm text-gray-500">
              {lineCount} player{lineCount !== 1 ? 's' : ''} {lineCount > 100 && <span className="text-red-600">(max 100)</span>}
            </span>
          </div>
          <textarea
            id="importData"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-pink focus:border-transparent"
            placeholder={`name\temail\tpassword\tphotoUrl\tparentEmail\tgoal\tisActive\tgenerateSquares
John Smith\tjohn@example.com\t\t\tjohn.parent@example.com\t150\ttrue\ttrue
Jane Doe\tjane@example.com\tpassword123\t\t\t200\ttrue\ttrue`}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Load Sample
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
          <button
            onClick={handleImport}
            disabled={importing || !data.trim() || lineCount > 100}
            className="px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Players
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
