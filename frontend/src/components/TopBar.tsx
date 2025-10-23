import React from 'react';

interface TopBarProps {
  runId?: string;
  baseUrl?: string;
  onExportSeed?: () => void;
  onBack?: () => void;
  saving?: boolean;
}

export function TopBar({ runId, baseUrl, onExportSeed, onBack, saving }: TopBarProps) {
  return (
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold">
              {runId ? `Confirmation - Run ${runId}` : 'Universal Site Extractor'}
            </h1>
            {baseUrl && (
              <p className="text-sm text-gray-600 mt-1">{baseUrl}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {onExportSeed && (
            <button
              onClick={onExportSeed}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Exporting...' : 'Export Seed'}
            </button>
          )}
          <div className="text-sm text-gray-500">
            <a href="http://localhost:5051/docs" target="_blank" className="underline">
              API Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}