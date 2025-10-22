/**
 * Main confirmation page component.
 * Provides Prime, Content, and Summary tabs for data review and editing.
 */
import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load prime data on mount
  useEffect(() => {
    if (runId) {
      loadPrimeData();
    }
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
        saving={saving}
      />

      <div className="flex">
        {/* Left Sidebar - Page Selector */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">All Pages</h3>
          <div className="space-y-1">
            {primeData.pages.map((page) => (
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

        {/* Main Content */}
        <div className="flex-1">
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