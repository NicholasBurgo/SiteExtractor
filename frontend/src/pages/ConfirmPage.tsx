/**
 * Main confirmation page component.
 * Provides Prime, Content, and Summary tabs for data review and editing.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { confirmationApi, ConfirmationApiError } from '../lib/api.confirm';
import { PrimeResponse, PageContent, ConfirmationTab } from '../lib/types.confirm';
import PrimeTabs from '../components/PrimeTabs';
import ContentTabs from '../components/ContentTabs';
import SummaryTab from '../components/SummaryTab';
import { TopBar } from '../components/TopBar';

const ConfirmPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<ConfirmationTab>('prime');
  const [primeData, setPrimeData] = useState<PrimeResponse | null>(null);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [selectedPagePath, setSelectedPagePath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pagesPerPage = 20;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Preparing extraction…');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const clearPollTimer = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    clearPollTimer();

    if (!runId) return;

    setLoading(true);
    setExtracting(true);
    setError(null);
    setStatusMessage('Starting extraction…');

    const POLL_INTERVAL_MS = 2000;

    const pollStatus = async () => {
      if (cancelled) return;

      try {
        setExtracting(true);
        setError(null);

        const status = await confirmationApi.getExtractionStatus(runId);
        console.log('Extraction status:', status);
        const progress = status.progress || {};
        const queued = progress.queued ?? 0;
        const visited = progress.visited ?? 0;
        const total = visited + queued;
        const percent = total > 0 ? Math.round((visited / total) * 100) : 0;
        setProgressPercent(percent);
        
        const messageBase = status.isComplete
          ? 'Finalizing extracted data…'
          : 'Crawling site…';
        const details = status.isComplete
          ? ''
          : ` (${visited} pages processed, ${queued} remaining)`;
        setStatusMessage(`${messageBase}${details}`);

        if (status.isComplete && status.hasData) {
          await loadPrimeData();
          if (!cancelled) {
            setExtracting(false);
          }
          return;
        }

        if (status.isComplete && !status.hasData) {
          setExtracting(true);
          setLoading(false);
          setError(null);
          setStatusMessage('Finalizing extracted data…');
        }
      } catch (err) {
        console.error('Error polling extraction status:', err);
        if (err instanceof ConfirmationApiError) {
          setError(`Failed to check extraction status: ${err.message}`);
        } else {
          setError('Failed to check extraction status');
        }
        setExtracting(false);
        return;
      } finally {
        setLoading(false);
      }

      pollTimeoutRef.current = setTimeout(pollStatus, POLL_INTERVAL_MS);
    };

    pollStatus();

    return () => {
      cancelled = true;
      clearPollTimer();
    };
  }, [runId]);

  const loadPrimeData = async () => {
    if (!runId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Loading prime data for run:', runId);
      const data = await confirmationApi.getPrime(runId);
      console.log('Prime data loaded:', data);
      setPrimeData(data);
      setExtracting(false);
      
      // Select first page by default
      if (data.pages.length > 0) {
        setSelectedPagePath(data.pages[0].path);
      }
    } catch (err) {
      console.error('Error loading prime data:', err);
      if (err instanceof ConfirmationApiError) {
        setError(`Failed to load data: ${err.message}`);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPageContent = async (pagePath: string) => {
    if (!runId) return;
    
    try {
      setLoading(true);
      const content = await confirmationApi.getPageContent(runId, pagePath);
      setPageContent(content);
    } catch (err) {
      if (err instanceof ConfirmationApiError) {
        setError(`Failed to load page content: ${err.message}`);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageSelect = (pagePath: string) => {
    setSelectedPagePath(pagePath);
    loadPageContent(pagePath);
  };

  // Auto-load first page content when switching to Content tab
  useEffect(() => {
    if (activeTab === 'content' && primeData && primeData.pages.length > 0 && !selectedPagePath) {
      // Auto-select and load first page when entering content tab with no selection
      const firstPage = primeData.pages[0];
      setSelectedPagePath(firstPage.path);
      loadPageContent(firstPage.path);
    }
  }, [activeTab, primeData]);

  // Clear page content when switching away from content tab
  useEffect(() => {
    if (activeTab !== 'content') {
      setPageContent(null);
      setSelectedPagePath('');
    }
  }, [activeTab]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNavigationUpdate = async (nav: any[]) => {
    if (!runId) return;
    
    try {
      setSaving(true);
      await confirmationApi.updateNavigation(runId, nav);
      setPrimeData(prev => prev ? { ...prev, nav } : null);
      showToast('Navigation updated successfully', 'success');
    } catch (err) {
      if (err instanceof ConfirmationApiError) {
        showToast(`Failed to update navigation: ${err.message}`, 'error');
      } else {
        showToast('An unexpected error occurred', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFooterUpdate = async (footer: any) => {
    if (!runId) return;
    
    try {
      setSaving(true);
      await confirmationApi.updateFooter(runId, footer);
      setPrimeData(prev => prev ? { ...prev, footer } : null);
      showToast('Footer updated successfully', 'success');
    } catch (err) {
      if (err instanceof ConfirmationApiError) {
        showToast(`Failed to update footer: ${err.message}`, 'error');
      } else {
        showToast('An unexpected error occurred', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePageContentUpdate = async (content: Partial<PageContent>) => {
    if (!runId || !selectedPagePath) return;
    
    try {
      setSaving(true);
      await confirmationApi.updatePageContent(runId, selectedPagePath, content);
      setPageContent(prev => prev ? { ...prev, ...content } : null);
      showToast('Page content updated successfully', 'success');
    } catch (err) {
      if (err instanceof ConfirmationApiError) {
        showToast(`Failed to update page content: ${err.message}`, 'error');
      } else {
        showToast('An unexpected error occurred', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportSeed = async () => {
    if (!runId) return;
    
    try {
      setSaving(true);
      const result = await confirmationApi.generateSeed(runId);
      showToast(`Seed exported successfully: ${result.seedPath}`, 'success');
      // Navigate to theme designer page after successful export
      setTimeout(() => {
        navigate('/theme-designer');
      }, 1000);
    } catch (err) {
      if (err instanceof ConfirmationApiError) {
        showToast(`Failed to export seed: ${err.message}`, 'error');
      } else {
        showToast('An unexpected error occurred', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Search and pagination helpers
  const getFilteredPages = () => {
    if (!primeData) return [];
    if (!searchQuery.trim()) return primeData.pages;
    
    const query = searchQuery.toLowerCase();
    return primeData.pages.filter(page => 
      (page.titleGuess && page.titleGuess.toLowerCase().includes(query)) ||
      (page.path && page.path.toLowerCase().includes(query))
    );
  };

  const getTotalPages = () => {
    const filteredPages = getFilteredPages();
    return Math.ceil(filteredPages.length / pagesPerPage);
  };

  const getCurrentPagePages = () => {
    const filteredPages = getFilteredPages();
    const startIndex = (currentPage - 1) * pagesPerPage;
    const endIndex = startIndex + pagesPerPage;
    return filteredPages.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < getTotalPages()) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  if (extracting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md w-full px-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Extracting Website Data</h2>
          <p className="text-gray-600 mb-4">
            {statusMessage}
          </p>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {progressPercent}% complete
            </p>
          </div>
          
          <p className="text-gray-500 mb-4 text-sm">
            This may take a few minutes depending on the site size. You can leave this tab open while we finish.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Run ID:</strong> {runId}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Please keep this page open while extraction is in progress...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !primeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading confirmation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Generator
          </button>
        </div>
      </div>
    );
  }

  if (!primeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available for this run.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-4"
          >
            Back to Generator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <TopBar
        runId={runId || ''}
        baseUrl={primeData.baseUrl}
        onExportSeed={handleExportSeed}
        onBack={() => navigate('/')}
        saving={saving}
      />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'prime', label: 'Prime' },
            { id: 'content', label: 'Content' },
            { id: 'summary', label: 'Summary' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ConfirmationTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex">
        {/* Left Sidebar - Only on Content tab */}
        {activeTab === 'content' && (
          <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">All Pages</h3>
              
              <div className="text-xs text-gray-500 mb-3">
                {searchQuery.trim() ? (
                  <>
                    Showing {getCurrentPagePages().length} of {getFilteredPages().length} filtered pages
                  </>
                ) : (
                  <>
                    Showing {((currentPage - 1) * pagesPerPage) + 1}-{Math.min(currentPage * pagesPerPage, primeData.pages.length)} of {primeData.pages.length} pages
                  </>
                )}
              </div>
              
              {/* Search Bar */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Page Numbers */}
              {getTotalPages() > 1 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {currentPage} of {getTotalPages()}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === getTotalPages()}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  
                  {/* Page Number Buttons */}
                  <div className="flex flex-wrap gap-1 justify-center">
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      let pageNum;
                      if (getTotalPages() <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= getTotalPages() - 2) {
                        pageNum = getTotalPages() - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-2 py-1 text-xs rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Pages List */}
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-1">
                {getCurrentPagePages().map((page) => (
                  <button
                    key={page.pageId}
                    onClick={() => handlePageSelect(page.path)}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      selectedPagePath === page.path
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium truncate">{page.titleGuess || 'Untitled'}</div>
                    <div className="text-xs text-gray-500 truncate">{page.path}</div>
                    <div className="text-xs text-gray-400">
                      {page.words || 0} words • {page.mediaCount || 0} media
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'prime' && (
              <PrimeTabs
                data={primeData}
                onNavigationUpdate={handleNavigationUpdate}
                onFooterUpdate={handleFooterUpdate}
                saving={saving}
              />
            )}
            
            {activeTab === 'content' && (
              <ContentTabs
                pageContent={pageContent}
                onContentUpdate={handlePageContentUpdate}
                loading={loading}
                saving={saving}
                selectedPagePath={selectedPagePath}
              />
            )}
            
            {activeTab === 'summary' && (
              <SummaryTab
                primeData={primeData}
                pages={primeData.pages}
              />
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ConfirmPage;