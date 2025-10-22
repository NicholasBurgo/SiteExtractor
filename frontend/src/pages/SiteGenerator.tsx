import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startRun, getProgress, listPages, getPage } from "../lib/api";

export default function SiteGenerator() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [timeout, setTimeout] = useState(10);
  const [usePlaywright, setUsePlaywright] = useState(true);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setShowResults(false);
    
    if (!url || !url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      setLoading(false);
      return;
    }
    
    try {
      const body = { url, maxPages, timeout, usePlaywright };
      const res = await startRun(body);
      setRunId(res.runId);
      
      // Start polling for progress and results
      const poll = setInterval(async () => {
        if (!res.runId) return;
        try {
          const prog = await getProgress(res.runId);
          const list = await listPages(res.runId, 1, 200);
          setPages(list);
          
          // Check if run is completed (no more queued items or status indicates completion)
          console.log('Progress check:', { queued: prog.queued, visited: prog.visited, status: prog.status });
          if (prog.queued === 0 || prog.status === 'completed') {
            console.log('Run completed, navigating to confirmation');
            clearInterval(poll);
            setLoading(false);
            // Navigate to confirmation page
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

  const handlePageSelect = async (pageId: string) => {
    if (!runId) return;
    try {
      const page = await getPage(runId, pageId);
      setSelected(page);
    } catch (error) {
      console.error("Get page error:", error);
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
              <span>🕒</span>
              Checkpoint
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
              <span>▷</span>
              Run Generator
            </button>
          </div>
        </div>

        {!showResults ? (
          /* Generator Form */
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
                <p className="text-sm text-green-600">
                  Generator started! Run ID: {runId}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/confirm/${runId}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  Go to Confirmation
                </button>
              </div>
            )}
          </form>
        ) : (
          /* Results View */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Extraction Results</h2>
              <button
                onClick={() => {
                  setShowResults(false);
                  setPages([]);
                  setSelected(null);
                  setRunId(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                New Extraction
              </button>
            </div>

            <div className="grid grid-cols-[1fr_400px] gap-6">
              {/* Pages Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium">Extracted Pages ({pages.length})</h3>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="text-left p-3">Title</th>
                        <th className="text-center p-3">Type</th>
                        <th className="text-center p-3">Words</th>
                        <th className="text-center p-3">Images</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((p) => (
                        <tr
                          key={p.pageId}
                          className="hover:bg-gray-50 cursor-pointer border-b"
                          onClick={() => handlePageSelect(p.pageId)}
                        >
                          <td className="p-3">{p.title || p.url}</td>
                          <td className="text-center p-3">{p.type}</td>
                          <td className="text-center p-3">{p.words}</td>
                          <td className="text-center p-3">{p.images}</td>
                          <td className="text-center p-3">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Page Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium">Page Preview</h3>
                </div>
                <div className="p-4 max-h-96 overflow-auto">
                  {selected ? (
                    <>
                      <div className="text-xs text-gray-500 break-all mb-2">
                        {selected?.summary?.url}
                      </div>
                      <h4 className="text-lg font-semibold mb-3">
                        {selected?.summary?.title || "Untitled"}
                      </h4>
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {selected?.text?.slice(0, 5000) || "No text content"}
                      </pre>
                    </>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      Select a page to preview content
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          Enter a website URL to extract business information, images, and content.
        </p>
      </div>
    </div>
  );
}
