import { useState } from 'react';
import { Globe, Play, Clock, Trash2, ArrowRight, CheckCircle, Clipboard, Settings } from 'lucide-react';
import { useRunsManager } from '../hooks/useRunsManager';

interface MainMenuProps {
  onExtractionComplete: (runId: string, url: string, options: any) => void;
  isExtracting: boolean;
  setIsExtracting: (extracting: boolean) => void;
  onContinueRun?: (runId: string) => void;
}

export function MainMenu({ onExtractionComplete, isExtracting, setIsExtracting, onContinueRun }: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<'checkpoint' | 'generator'>('generator');
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(20);
  const [timeout, setTimeout] = useState(10);
  const [usePlaywright, setUsePlaywright] = useState(true);
  const [pasted, setPasted] = useState(false);
  const [confirmingDeletes, setConfirmingDeletes] = useState<Set<string>>(new Set());

  const { runs, isLoading, deleteRun } = useRunsManager();

  const handleContinueRun = (runId: string) => {
    if (onContinueRun) {
      onContinueRun(runId);
    }
  };

  const handleDeleteClick = (runId: string) => {
    if (confirmingDeletes.has(runId)) {
      // Second click - actually delete
      deleteRun(runId);
      setConfirmingDeletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    } else {
      // First click - show confirm
      setConfirmingDeletes(prev => new Set(prev).add(runId));
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) return;

    setIsExtracting(true);
    try {
      const options = {
        maxPages,
        timeout,
        usePlaywright
      };

      let runId: string;

      // Check if we have the electron API available
      if (window.electronAPI) {
        // Desktop app mode - use Electron IPC
        const result = await window.electronAPI.extractTruthTable(url, options);
        
        if ((result as any).success) {
          runId = (result as any).runId;
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
        if ((result as any).status === 'success') {
          runId = (result as any).runId;
        } else {
          throw new Error((result as any).message || 'Extraction failed');
        }
      }

      // Now trigger all individual extractions in parallel
      console.log('Starting parallel individual extractions...');
      
      // Check if extraction is already in progress
      const extractionInProgress = localStorage.getItem(`extraction-in-progress-${runId}`);
      if (extractionInProgress) {
        console.log('Extraction already in progress for this runId, skipping parallel extractions...');
      } else {
        // Mark extraction as in progress
        localStorage.setItem(`extraction-in-progress-${runId}`, 'true');
        
        const extractionPromises = [
          // Business data extractions
          fetch('/api/extract/meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, runId })
          }),
          fetch('/api/extract/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, runId })
          }),
          fetch('/api/extract/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, runId })
          }),
          fetch('/api/extract/legal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, runId })
          }),
          fetch('/api/extract/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, runId })
          }),
          // Tab data preloading
          fetch('/api/extract/navbar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId })
          }),
          fetch('/api/extract/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId })
          }),
          fetch('/api/extract/paragraphs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId })
          })
        ];

        try {
          const results = await Promise.allSettled(extractionPromises);
          
          // Process results and store preloaded data
          const processedResults = await Promise.all(
            results.map(async (result, index) => {
              const extractionTypes = ['meta', 'services', 'contact', 'legal', 'assets', 'navbar', 'images', 'paragraphs'];
              
              if (result.status === 'fulfilled') {
                console.log(`${extractionTypes[index]} extraction completed successfully`);
                
                // Store preloaded data in localStorage for immediate tab access
                try {
                  const response = result.value;
                  if (response.ok) {
                    const data = await response.json();
                    const storageKey = `${extractionTypes[index]}-${runId}`;
                    
                    // Store the data with appropriate key
                    if (extractionTypes[index] === 'navbar') {
                      localStorage.setItem(storageKey, JSON.stringify(data.navbar));
                    } else if (extractionTypes[index] === 'images') {
                      localStorage.setItem(storageKey, JSON.stringify(data.images));
                    } else if (extractionTypes[index] === 'paragraphs') {
                      localStorage.setItem(storageKey, JSON.stringify(data.paragraphs));
                    } else {
                      // For business data (meta, services, contact, legal, assets)
                      localStorage.setItem(storageKey, JSON.stringify(data.result || data));
                    }
                    
                    console.log(`Preloaded ${extractionTypes[index]} data for runId: ${runId}`, {
                      storageKey,
                      dataLength: extractionTypes[index] === 'images' ? data.images?.length : 'N/A',
                      dataKeys: Object.keys(data)
                    });
                    return { type: extractionTypes[index], success: true };
                  }
                } catch (storageError) {
                  console.warn(`Failed to store ${extractionTypes[index]} data:`, storageError);
                  return { type: extractionTypes[index], success: false, error: storageError };
                }
              } else {
                console.warn(`${extractionTypes[index]} extraction failed:`, result.reason);
                return { type: extractionTypes[index], success: false, error: result.reason };
              }
              
              return { type: extractionTypes[index], success: false };
            })
          );
          
          console.log('All parallel extractions completed');
        } catch (parallelError) {
          console.warn('Some parallel extractions failed:', parallelError);
        } finally {
          // Remove extraction in progress flag
          localStorage.removeItem(`extraction-in-progress-${runId}`);
        }
      }
      
      onExtractionComplete(runId, url, options);
    } catch (error) {
      console.error('Extraction failed:', error);
      alert(`Extraction failed: ${error}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await (navigator as any).clipboard.readText();
      if (text.trim()) {
        setUrl(text.trim());
        setPasted(true);
        window.setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  };

  const getFileStatusIcon = (hasFile: boolean) => {
    return hasFile ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <Clock className="w-4 h-4 text-gray-400" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'extracted':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'generated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Handle different timestamp formats
      let date: Date;
      
      if (timestamp.includes('T')) {
        // ISO format
        date = new Date(timestamp);
      } else if (timestamp.includes('/')) {
        // Date format like MM/DD/YYYY or DD/MM/YYYY
        date = new Date(timestamp);
      } else if (timestamp.includes('-')) {
        // Date format like YYYY-MM-DD
        date = new Date(timestamp);
      } else {
        // Try parsing as number (timestamp)
        const numTimestamp = parseInt(timestamp);
        if (!isNaN(numTimestamp)) {
          date = new Date(numTimestamp);
        } else {
          date = new Date(timestamp);
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return timestamp; // fallback to original timestamp
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return timestamp; // fallback to original timestamp
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className={`w-full mx-4 transition-all duration-500 ease-in-out ${activeTab === 'generator' ? 'max-w-md' : 'max-w-6xl'}`}>
        <div className="bg-white rounded-lg shadow-xl p-8 transition-all duration-500 ease-in-out">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Site Generator</h1>
            <p className="text-gray-600">Extract and confirm website data</p>
          </div>

          {/* Tab Navigation - Pill Shaped */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveTab('generator')}
                className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeTab === 'generator'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Play className="w-4 h-4 inline mr-2" />
                Run Generator
              </button>
              <button
                onClick={() => setActiveTab('checkpoint')}
                className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeTab === 'checkpoint'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Checkpoint
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'checkpoint' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Extraction Checkpoints</h2>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading checkpoints...</p>
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No extraction checkpoints found</p>
                  <p className="text-sm">Run a new extraction to create a checkpoint</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div key={run.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(run.status)}`}>
                            {run.status}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 break-all">{run.url}</h3>
                            <p className="text-sm text-gray-500">{formatTimestamp(run.timestamp)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDeleteClick(run.id)}
                              className={`px-3 py-1 text-sm font-medium rounded-full focus:outline-none focus:ring-2 ${
                                confirmingDeletes.has(run.id)
                                  ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                  : 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 focus:ring-red-500'
                              }`}
                            >
                              {confirmingDeletes.has(run.id) ? 'Confirm' : 'Delete'}
                            </button>
                            <button
                              onClick={() => handleContinueRun(run.id)}
                              className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <ArrowRight className="w-4 h-4 inline mr-1" />
                              Continue
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            extraction
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Generator</h2>
              
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
                    onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
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
                      <CheckCircle className="w-4 h-4 text-green-500" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-1">
                      Max Pages to Crawl
                    </label>
                    <input
                      type="number"
                      id="maxPages"
                      value={maxPages}
                      onChange={(e) => setMaxPages(parseInt((e.target as HTMLInputElement).value))}
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
                      onChange={(e) => setTimeout(parseInt((e.target as HTMLInputElement).value))}
                      min="5"
                      max="60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isExtracting}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="usePlaywright"
                    checked={usePlaywright}
                      onChange={(e) => setUsePlaywright((e.target as HTMLInputElement).checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isExtracting}
                  />
                  <label htmlFor="usePlaywright" className="ml-2 block text-sm text-gray-700">
                    Use Playwright for JavaScript sites
                  </label>
                </div>
              </div>

              {/* Run Generator Button - Pill Shaped */}
              <button
                onClick={handleExtract}
                disabled={!url.trim() || isExtracting}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Extracting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Generator
                  </>
                )}
              </button>
            </div>
          )}

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
