import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Clock, CheckCircle } from 'lucide-react';
import { startRun, getProgress } from '../lib/api';

export function Generator() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(20);
  const [maxDepth, setMaxDepth] = useState(5);
  const [concurrency, setConcurrency] = useState(12);
  const [renderBudget, setRenderBudget] = useState(0.1);
  const [usePlaywright, setUsePlaywright] = useState(true);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const body = {
        url,
        maxPages,
        maxDepth,
        concurrency,
        renderBudget: usePlaywright ? renderBudget : undefined
      };
      
      const result = await startRun(body);
      setRunId(result.runId);
      
      // Start polling for progress
      const pollInterval = setInterval(async () => {
        try {
          const prog = await getProgress(result.runId);
          setProgress(prog);
          
          // Check if run is complete
          if (prog.visited >= prog.queued && prog.queued > 0) {
            clearInterval(pollInterval);
            setLoading(false);
            // Navigate to confirmation page
            navigate(`/confirm/${result.runId}`);
          }
        } catch (error) {
          console.error('Progress polling error:', error);
          clearInterval(pollInterval);
          setLoading(false);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Start run error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-4xl mb-4">🌐</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Site Generator</h1>
          <p className="text-gray-500 text-sm text-center mb-6">
            Extract and confirm website data
          </p>
          
          {/* Header Buttons */}
          <div className="flex gap-3 mb-8">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Clock className="w-4 h-4" />
              Checkpoint
            </button>
            <button 
              onClick={() => document.getElementById('generatorForm')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Generator
            </button>
          </div>
        </div>

        {/* Generator Form */}
        <form id="generatorForm" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Run Generator</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.readText().then(text => {
                        if (text && text.startsWith('http')) {
                          setUrl(text);
                        }
                      });
                    }
                  }}
                >
                  📋
                </button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-4"
              >
                <Settings className="w-4 h-4" />
                Advanced Options
                <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showAdvanced && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Max Pages to Crawl</label>
                    <input
                      type="number"
                      value={maxPages}
                      onChange={(e) => setMaxPages(Number(e.target.value))}
                      min="1"
                      max="1000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Max Depth</label>
                    <input
                      type="number"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(Number(e.target.value))}
                      min="1"
                      max="10"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Concurrency</label>
                    <input
                      type="number"
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      min="1"
                      max="20"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Render Budget (Playwright)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={renderBudget}
                      onChange={(e) => setRenderBudget(Number(e.target.value))}
                      min="0"
                      max="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      id="playwright"
                      type="checkbox"
                      checked={usePlaywright}
                      onChange={(e) => setUsePlaywright(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="playwright" className="text-sm text-gray-600">
                      Use Playwright for JavaScript sites
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Extraction Progress</span>
              </div>
              <div className="text-sm text-blue-700">
                Visited: {progress.visited} / Queued: {progress.queued} | Errors: {progress.errors}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url}
            className={`w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
              loading || !url
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Generator
              </>
            )}
          </button>

          {runId && (
            <p className="text-center text-sm text-green-600">
              Generator started! Run ID: {runId}
            </p>
          )}
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Enter a website URL to extract business information, images, and content.
        </p>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 mb-1">
            © 2025 Nicholas Burgo. All Rights Reserved.
          </p>
          <p className="text-xs text-gray-300">
            This software is proprietary and confidential. Unauthorized use is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}

