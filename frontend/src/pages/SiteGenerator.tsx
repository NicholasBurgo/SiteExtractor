import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startRun, getProgress } from "../lib/api";
import CheckpointDropdown from "../components/CheckpointDropdown";

export default function SiteGenerator() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [timeout, setTimeout] = useState(10);
  const [usePlaywright, setUsePlaywright] = useState(true);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    if (!url || !url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      setLoading(false);
      return;
    }
    
    try {
      const body = { url, maxPages, timeout, usePlaywright };
      const res = await startRun(body);
      setRunId(res.runId);
      
      // Start polling for progress
      const poll = setInterval(async () => {
        if (!res.runId) return;
        try {
          const prog = await getProgress(res.runId);
          
          // Check if run is completed (no more queued items or status indicates completion)
          console.log('Progress check:', { queued: prog.queued, visited: prog.visited, status: prog.status });
          if (prog.queued === 0 || prog.status === 'completed') {
            console.log('Run completed, navigating to confirm page');
            clearInterval(poll);
            setLoading(false);
            // Navigate directly to confirm page instead of showing results
            navigate(`/confirm/${res.runId}`);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 1500);
      
    } catch (error) {
      console.error("Start run error:", error);
      setError('Unable to connect to the backend server. Please make sure the backend is running.');
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
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
              <span>▷</span>
              Run Generator
            </button>
            <CheckpointDropdown />
          </div>
        </div>

        {/* Generator Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Run Generator</h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                  required
                  autoComplete="url"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  📋
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <span>⚠️</span>
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 flex items-center mb-4">
                ⚙️ Advanced Options
              </summary>
              <div className="space-y-4 pl-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Max Pages to Crawl</label>
                  <input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(Number(e.target.value))}
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
            </details>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-medium text-white transition-all ${
                loading
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {loading ? "Running..." : "▷ Run Generator"}
            </button>

            {runId && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Extracting website data... Run ID: {runId}</span>
                </div>
                <p className="text-xs text-gray-500">
                  This may take a few minutes. You will be automatically redirected to the confirmation page when complete.
                </p>
              </div>
            )}
          </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Enter a website URL to extract business information, images, and content.
        </p>
      </div>
    </div>
  );
}
