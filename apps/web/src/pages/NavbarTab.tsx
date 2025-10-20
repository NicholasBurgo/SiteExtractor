import { useState } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { usePageManager, Page } from '../hooks/usePageManager';

interface NavbarTabProps {
  runId: string;
  onConfirm?: () => void;
}

interface NavbarPage {
  id: string;
  name: string;
  url: string;
  order: number;
  status: 'extracted' | 'added' | 'modified';
}

export function NavbarTab({ runId, onConfirm }: NavbarTabProps) {
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageUrl, setNewPageUrl] = useState('');

  // Use shared page manager
  const { pages, addPage, updatePage, removePage, isLoading } = usePageManager(runId);

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
    updatePage(id, { name: newName.endsWith(' Page') ? newName : `${newName} Page` });
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

  // Removed old useEffect - now using shared page manager

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Navigation</h2>
        <button
          onClick={() => setIsAddingPage(true)}
          className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Page
        </button>
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
            <div key={page.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={page.name}
                    onChange={(e) => updatePageName(page.id, e.target.value)}
                    className="text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{page.url}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
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
                  className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Button */}
      <div className="flex justify-center">
        <button 
          onClick={() => {
            saveNavigationData();
            onConfirm?.();
          }}
          className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
