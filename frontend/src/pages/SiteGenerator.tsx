import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startRun, getExtractionStatus } from "../lib/api";
import CheckpointDropdown from "../components/CheckpointDropdown";

export default function SiteGenerator() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [timeout, setTimeout] = useState(10);
  const [usePlaywright, setUsePlaywright] = useState(true);
  const [botAvoidanceEnabled, setBotAvoidanceEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    clearPoll();
    
    if (!url || !url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      setLoading(false);
      return;
    }
    
    try {
      const body = {
        url,
        maxPages,
        timeout,
        usePlaywright,
        botAvoidanceEnabled: botAvoidanceEnabled || undefined
      };
      const res = await startRun(body);
      setRunId(res.runId);
      
      // Start polling extraction status until completion
      const poll = setInterval(async () => {
        if (!res.runId) return;
        try {
          const status = await getExtractionStatus(res.runId);
          console.log('Extraction status check:', status);

          if (status.isComplete) {
            console.log('Run completed. hasData:', status.hasData);
            clearPoll();
            setLoading(false);
            navigate(`/confirm/${res.runId}`);
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearPoll();
          setLoading(false);
          setError('Failed to check extraction status. Please try again.');
        }
      }, 1500);
      pollRef.current = poll;
      
    } catch (error) {
      console.error("Start run error:", error);
      setError('Unable to connect to the backend server. Please make sure the backend is running.');
      clearPoll();
      setRunId(null);
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
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
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
                <div className="flex items-center gap-3">
                  <input
                    id="botAvoid"
                    type="checkbox"
                    checked={botAvoidanceEnabled}
                    onChange={(e) => setBotAvoidanceEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="botAvoid" className="text-sm text-gray-600">
                    Enable bot-avoidance safeguards (slower crawling)
                  </label>
                </div>
              </div>
            </details>

            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-4 rounded-full font-medium text-white transition-all text-lg ${
                  loading
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                }`}
              >
                {loading ? "Running..." : "▷ Run Generator"}
              </button>
              
              <button
                type="button"
                className="flex items-center gap-2 px-5 py-3.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium shadow-sm hover:bg-amber-200 transition-colors whitespace-nowrap"
              >
                <span className="text-base">⏭</span>
                Skip Extraction
              </button>
            </div>

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
