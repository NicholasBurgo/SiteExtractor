import { useState } from 'react';
import { Plus, X, Edit2, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { Page } from '../hooks/usePageManager';

interface NavbarTabProps {
  runId: string;
  pages: Page[];
  addPage: (name: string, url: string) => Page;
  updatePage: (id: string, updates: Partial<Page>) => void;
  removePage: (id: string) => void;
  isLoading: boolean;
  onConfirm?: () => void;
  onConfirmAll?: () => void;
  isConfirmed?: boolean;
}

interface NavbarPage {
  id: string;
  name: string;
  url: string;
  order: number;
  status: 'extracted' | 'added' | 'modified';
}

export function NavbarTab({ runId, pages, addPage, updatePage, removePage, isLoading, onConfirm, onConfirmAll, isConfirmed = false }: NavbarTabProps) {
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageUrl, setNewPageUrl] = useState('');

  // Debug logging
  console.log('NavbarTab render:', { runId, pages, isLoading });

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading navigation data...</div>
        </div>
      </div>
    );
  }

  // Remove the old useEffect and loadNavigationData since we're using the shared page manager

  const addNewPage = () => {
    if (!newPageName.trim() || !newPageUrl.trim()) return;

    addPage(newPageName.trim(), newPageUrl.trim());
    setNewPageName('');
    setNewPageUrl('');
    setIsAddingPage(false);
  };

  const handleRemovePage = (id: string) => {
    removePage(id);
  };

  const updatePageName = (id: string, newName: string) => {
    updatePage(id, { name: newName.endsWith(' Page') ? newName : `${newName} Page`, status: 'modified' });
  };

  const getQualityIndicator = (qualityScore?: number) => {
    if (!qualityScore) return null;
    
    if (qualityScore >= 80) {
      return <CheckCircle className="w-4 h-4 text-green-500" title={`High Quality (${qualityScore})`} />;
    } else if (qualityScore >= 60) {
      return <Star className="w-4 h-4 text-yellow-500" title={`Good Quality (${qualityScore})`} />;
    } else {
      return <AlertCircle className="w-4 h-4 text-orange-500" title={`Needs Review (${qualityScore})`} />;
    }
  };

  const getQualityBadge = (qualityScore?: number) => {
    if (!qualityScore) return null;
    
    if (qualityScore >= 80) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">High Quality</span>;
    } else if (qualityScore >= 60) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Good Quality</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Needs Review</span>;
    }
  };

  const saveNavigationData = async () => {
    try {
      console.log('Saving navigation data:', pages);
      
      // Save to localStorage for persistence
      localStorage.setItem(`navigation-${runId}`, JSON.stringify({
        pages,
        confirmedAt: new Date().toISOString(),
        runId
      }));
      
      console.log('Navigation data saved successfully');
    } catch (error) {
      console.error('Failed to save navigation data:', error);
    }
  };

  const handleConfirmAll = async () => {
    // Save navigation data first
    await saveNavigationData();
    
    // Confirm only the navigation tab
    const navigationData = localStorage.getItem(`navigation-${runId}`);
    if (navigationData) {
      const parsed = JSON.parse(navigationData);
      localStorage.setItem(`navigation-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Trigger the confirm callback to update tab checkmark
    onConfirm?.();
    
    console.log('Navigation tab confirmed');
  };

  // Removed old useEffect - now using shared page manager

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Navigation</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddingPage(true)}
            disabled={isConfirmed}
            className={`flex items-center px-4 py-2 text-sm font-medium border rounded-full focus:outline-none focus:ring-2 ${
              isConfirmed 
                ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed' 
                : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 focus:ring-blue-500'
            }`}
            title={isConfirmed ? "Section is locked - unconfirm to edit" : "Add new page"}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Page
          </button>
          <button 
            onClick={() => {
              if (isConfirmed) {
                onConfirm?.();
              } else {
                handleConfirmAll();
              }
            }}
            className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full focus:outline-none focus:ring-2 ${
              isConfirmed 
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isConfirmed ? 'Unconfirm All' : 'Confirm All'}
          </button>
        </div>
      </div>

      {/* Add New Page Form */}
      {isAddingPage && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Page</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pageName" className="block text-sm font-medium text-gray-700 mb-1">
                Page Name
              </label>
              <input
                type="text"
                id="pageName"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g., Products, Portfolio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="pageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Page URL
              </label>
              <input
                type="text"
                id="pageUrl"
                value={newPageUrl}
                onChange={(e) => setNewPageUrl(e.target.value)}
                placeholder="e.g., /products, /portfolio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-3">
            <button
              onClick={() => {
                setIsAddingPage(false);
                setNewPageName('');
                setNewPageUrl('');
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={addNewPage}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Page
            </button>
          </div>
        </div>
      )}

      {/* Pages List */}
      {pages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No navigation pages found for this run.</p>
          <p className="text-sm text-gray-400 mt-2">Run ID: {runId}</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {pages.map((page, index) => (
            <div key={page.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={page.name}
                      onChange={(e) => updatePageName(page.id, e.target.value)}
                      disabled={isConfirmed}
                      className={`text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 flex-1 ${
                        isConfirmed ? 'cursor-not-allowed text-gray-500' : ''
                      }`}
                      title={isConfirmed ? "Section is locked - unconfirm to edit" : "Edit page name"}
                    />
                    {getQualityIndicator(page.qualityScore)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{page.url}</p>
                  {page.originalLabel && page.originalLabel !== page.name.replace(' Page', '') && (
                    <p className="text-xs text-gray-400 mt-1">Original: {page.originalLabel}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getQualityBadge(page.qualityScore)}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  page.status === 'extracted' 
                    ? 'bg-green-100 text-green-800' 
                    : page.status === 'added'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {page.status}
                </span>
                <button
                  onClick={() => handleRemovePage(page.id)}
                  disabled={isConfirmed}
                  className={`p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded ${
                    isConfirmed 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-red-600'
                  }`}
                  title={isConfirmed ? "Section is locked - unconfirm to edit" : "Remove page"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Quality Summary */}
      {pages.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Navigation Quality Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">
                High Quality: {pages.filter(p => (p.qualityScore || 0) >= 80).length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-700">
                Good Quality: {pages.filter(p => (p.qualityScore || 0) >= 60 && (p.qualityScore || 0) < 80).length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-gray-700">
                Needs Review: {pages.filter(p => (p.qualityScore || 0) < 60).length}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
