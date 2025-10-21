import { useState } from 'react';
import { Globe, Download, Settings, Play, Clipboard, Check } from 'lucide-react';

interface ExtractionFormProps {
  onExtractionComplete: (runId: string, url: string, options: any) => void;
  isExtracting: boolean;
  setIsExtracting: (extracting: boolean) => void;
}

export function ExtractionForm({ onExtractionComplete, isExtracting, setIsExtracting }: ExtractionFormProps) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(20);
  const [timeout, setTimeout] = useState(10);
  const [usePlaywright, setUsePlaywright] = useState(true);
  const [pasted, setPasted] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) return;

    setIsExtracting(true);
    try {
      const options = {
        maxPages,
        timeout,
        usePlaywright
      };

      // Check if we have the electron API available
      if (window.electronAPI) {
        // Desktop app mode - use Electron IPC
        const result = await window.electronAPI.extractTruthTable(url, options);
        
        if (result.success) {
          // Also trigger unified business extraction for desktop app
          try {
            console.log('Starting unified business extraction (desktop)...');
            const businessResponse = await fetch('/api/extract/unified', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url,
                runId: result.runId
              }),
            });
            
            if (businessResponse.ok) {
              console.log('Unified business extraction completed (desktop)');
            } else {
              console.warn('Unified business extraction failed (desktop)');
            }
          } catch (businessError) {
            console.warn('Unified business extraction error (desktop):', businessError);
          }
          
          onExtractionComplete(result.runId, url, options);
        } else {
          throw new Error('Extraction failed');
        }
      } else {
        // Web mode - use the API server
        const response = await fetch('/api/extract/truth-table', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            ...options
          }),
        });

        const result = await response.json();
        if (result.status === 'success') {
          // Also trigger unified business extraction
          try {
            console.log('Starting unified business extraction...');
            const businessResponse = await fetch('/api/extract/unified', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url,
                runId: result.runId
              }),
            });
            
            if (businessResponse.ok) {
              console.log('Unified business extraction completed');
            } else {
              console.warn('Unified business extraction failed');
            }
          } catch (businessError) {
            console.warn('Unified business extraction error:', businessError);
          }
          
          onExtractionComplete(result.runId, url, options);
        } else {
          throw new Error(result.message || 'Extraction failed');
        }
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      alert(`Extraction failed: ${error}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const generateRunId = (url: string): string => {
    const domain = new URL(url).hostname;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domainSlug = domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${domainSlug}-${timestamp}`;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setUrl(text.trim());
        setPasted(true);
        window.setTimeout(() => setPasted(false), 2000); // Reset after 2 seconds
      }
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Site Generator</h1>
            <p className="text-gray-600">Extract and confirm website data</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isExtracting}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={isExtracting}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Paste from clipboard"
                >
                  {pasted ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clipboard className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <Settings className="w-5 h-5 text-gray-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">Advanced Options</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Pages to Crawl
                  </label>
                  <input
                    type="number"
                    id="maxPages"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isExtracting}
                  />
                </div>

                <div>
                  <label htmlFor="timeout" className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    id="timeout"
                    value={timeout}
                    onChange={(e) => setTimeout(parseInt(e.target.value))}
                    min="5"
                    max="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isExtracting}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="usePlaywright"
                    checked={usePlaywright}
                    onChange={(e) => setUsePlaywright(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isExtracting}
                  />
                  <label htmlFor="usePlaywright" className="ml-2 block text-sm text-gray-700">
                    Use Playwright for JavaScript sites
                  </label>
                </div>
              </div>
            </div>

            {/* Extract Button */}
            <button
              onClick={handleExtract}
              disabled={!url.trim() || isExtracting}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Extracting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Extract Data
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Enter a website URL to extract business information, images, and content</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// TypeScript declaration for electronAPI
declare global {
  interface Window {
    electronAPI: {
      extractTruthTable: (url: string, options?: any) => Promise<any>;
      getExtractionData: (runId: string) => Promise<any>;
    };
  }
}
