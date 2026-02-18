
import { useState, useRef, useEffect } from 'react';
import type { ExportOptions } from '../lib/api';

interface TopBarProps {
  runId?: string;
  baseUrl?: string;
  onExport?: (options: ExportOptions) => void;
  onBack?: () => void;
  saving?: boolean;
}

export function TopBar({ runId, baseUrl, onExport, onBack, saving }: TopBarProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [format, setFormat] = useState<'both' | 'markdown' | 'json'>('both');
  const [downloadAssets, setDownloadAssets] = useState<'none' | 'images'>('none');
  const [assetsScope, setAssetsScope] = useState<'same-origin' | 'include-cdn' | 'all'>('same-origin');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptions]);

  const handleExport = () => {
    if (!onExport) return;
    onExport({
      format,
      download_assets: downloadAssets,
      assets_scope: assetsScope,
    });
    setShowOptions(false);
  };

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
              {runId ? `Extraction Review — Run ${runId}` : 'Site Extractor'}
            </h1>
            {baseUrl && (
              <p className="text-sm text-gray-600 mt-1">{baseUrl}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {onExport && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowOptions(!showOptions)}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-full text-sm hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
              >
                <span>{saving ? 'Exporting...' : 'Export Bundle'}</span>
                {!saving && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {showOptions && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Export Options</h3>

                    {/* Format */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Format
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as 'both' | 'markdown' | 'json')}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="both">JSON + Markdown</option>
                        <option value="markdown">Markdown only</option>
                        <option value="json">JSON only</option>
                      </select>
                    </div>

                    {/* Download Assets */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Download Assets
                      </label>
                      <select
                        value={downloadAssets}
                        onChange={(e) => setDownloadAssets(e.target.value as 'none' | 'images')}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="none">None (lightweight)</option>
                        <option value="images">Download Images</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Images will be saved locally and Markdown links rewritten.
                      </p>
                    </div>

                    {/* Scope — only visible when downloading */}
                    {downloadAssets !== 'none' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Asset Scope
                        </label>
                        <select
                          value={assetsScope}
                          onChange={(e) => setAssetsScope(e.target.value as 'same-origin' | 'include-cdn' | 'all')}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="same-origin">Same origin only</option>
                          <option value="include-cdn">Include CDN subdomains</option>
                          <option value="all">All domains</option>
                        </select>
                      </div>
                    )}

                    {/* Export button */}
                    <button
                      onClick={handleExport}
                      disabled={saving}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Exporting...' : 'Download'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}