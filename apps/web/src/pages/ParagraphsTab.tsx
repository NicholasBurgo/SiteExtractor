import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Sparkles, Check } from 'lucide-react';
import { Page } from '../hooks/usePageManager';

interface ParagraphsTabProps {
  runId: string;
  url?: string;
  extractionOptions?: any;
  pages: Page[];
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

interface Paragraph {
  id: string;
  title?: string;
  content: string;
  page: string;
  type: 'title' | 'paragraph';
  status: 'keep' | 'remove' | 'edit';
  confidence: number;
  order: number;
}

export function ParagraphsTab({ runId, url, extractionOptions, pages, onConfirm, isConfirmed = false }: ParagraphsTabProps) {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [confirmedPages, setConfirmedPages] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPageForContent, setSelectedPageForContent] = useState<string>('');
  const [newParagraphTitle, setNewParagraphTitle] = useState('');
  const [newParagraphContent, setNewParagraphContent] = useState('');
  const [draggedParagraph, setDraggedParagraph] = useState<string | null>(null);

  // Debug logging
  console.log('ParagraphsTab render:', { runId, pages, pagesCount: pages.length });

  useEffect(() => {
    // Clear any existing localStorage data to prevent loading mock data
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('paragraphs-'));
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    loadParagraphData();
    loadConfirmedPages();
  }, [runId]);

  // Detect when new pages are added and unconfirm the tab
  useEffect(() => {
    if (pages.length > 0 && isConfirmed) {
      const savedData = localStorage.getItem(`paragraphs-confirmed-pages-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const savedConfirmedPages = new Set(parsed.confirmedPages || []);
        
        // Check if there are new pages that weren't confirmed before
        const currentPageNames = new Set(pages.map(p => p.name));
        const hasNewPages = Array.from(currentPageNames).some(pageName => !savedConfirmedPages.has(pageName));
        
        if (hasNewPages) {
          console.log('ParagraphsTab - New pages detected, unconfirming tab');
          onConfirm?.(); // This will unconfirm the tab
        }
      }
    }
  }, [pages, isConfirmed, runId, onConfirm]);

  const loadConfirmedPages = () => {
    try {
      const savedData = localStorage.getItem(`paragraphs-confirmed-pages-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setConfirmedPages(new Set(parsed.confirmedPages || []));
        console.log('ParagraphsTab - Loaded confirmed pages:', parsed.confirmedPages);
      }
    } catch (error) {
      console.error('Failed to load confirmed pages:', error);
    }
  };

  // Auto-confirm tab when all pages are confirmed
  useEffect(() => {
    if (confirmedPages.size > 0 && pages.length > 0 && !isConfirmed) {
      const allPagesConfirmed = pages.every(page => confirmedPages.has(page.name));
      
      console.log('ParagraphsTab - Auto-confirm check:', {
        allPagesConfirmed,
        pagesCount: pages.length,
        confirmedPages: Array.from(confirmedPages),
        allPages: pages.map(p => p.name),
        isConfirmed
      });
      
      if (allPagesConfirmed && pages.length > 0) {
        console.log('ParagraphsTab - Auto-confirming tab!');
        onConfirm?.();
      }
    }
  }, [confirmedPages, pages, onConfirm, isConfirmed]);

  // Remove tab check when not all pages are confirmed
  useEffect(() => {
    if (isConfirmed && confirmedPages.size > 0 && pages.length > 0) {
      const allPagesConfirmed = pages.every(page => confirmedPages.has(page.name));
      
      console.log('ParagraphsTab - Auto-unconfirm check:', {
        allPagesConfirmed,
        pagesCount: pages.length,
        confirmedPages: Array.from(confirmedPages),
        allPages: pages.map(p => p.name),
        isConfirmed
      });
      
      if (!allPagesConfirmed) {
        console.log('ParagraphsTab - Auto-unconfirming tab!');
        onConfirm?.();
      }
    }
  }, [confirmedPages, pages, onConfirm, isConfirmed]);

  // Save confirmed pages whenever they change
  useEffect(() => {
    if (confirmedPages.size > 0 || runId) {
      try {
        localStorage.setItem(`paragraphs-confirmed-pages-${runId}`, JSON.stringify({
          confirmedPages: Array.from(confirmedPages),
          savedAt: new Date().toISOString(),
          runId
        }));
        console.log('ParagraphsTab - Saved confirmed pages:', Array.from(confirmedPages));
      } catch (error) {
        console.error('Failed to save confirmed pages:', error);
      }
    }
  }, [confirmedPages, runId]);

  const loadParagraphData = async () => {
    // First check if paragraphs data is already preloaded in localStorage
    const preloadedParagraphsData = localStorage.getItem(`paragraphs-${runId}`);
    if (preloadedParagraphsData) {
      try {
        const paragraphsData = JSON.parse(preloadedParagraphsData);
        console.log('ParagraphsTab: Using preloaded paragraphs data:', paragraphsData);
        
        // Convert to frontend format if needed
        const apiParagraphs: Paragraph[] = paragraphsData.map((item: any) => ({
          id: item.id,
          title: item.title || (item.type === 'title' ? item.content : undefined),
          content: item.content,
          page: item.page,
          type: item.type,
          status: item.status || 'keep',
          confidence: item.confidence,
          order: item.order,
        }));
        
        setParagraphs(apiParagraphs);
        return;
      } catch (error) {
        console.warn('ParagraphsTab: Failed to parse preloaded paragraphs data:', error);
      }
    }
    
    setIsLoading(true);
    try {
      // Call the actual paragraph extraction API
      const response = await fetch('/api/extract/paragraphs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });

      if (!response.ok) {
        console.error(`Failed to load paragraphs for run ${runId}: ${response.statusText}`);
        throw new Error(`Failed to load paragraphs: ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      if (result.status === 'success' && result.paragraphs) {
        // Convert API response to frontend format
        const apiParagraphs: Paragraph[] = result.paragraphs.map((item: any) => ({
          id: item.id,
          title: item.title || (item.type === 'title' ? item.content : undefined),
          content: item.content,
          page: item.page,
          type: item.type,
          status: item.status || 'keep',
          confidence: item.confidence,
          order: item.order,
        }));

        setParagraphs(apiParagraphs);
        
        // Save to localStorage for future use
        localStorage.setItem(`paragraphs-${runId}`, JSON.stringify(apiParagraphs));
      } else {
        throw new Error(result.message || 'Failed to load paragraphs');
      }
    } catch (error) {
      console.error('Failed to load paragraph data:', error);
      // Fallback to empty array if API fails
      setParagraphs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!url) return;
    
    setIsRetrying(true);
    try {
      console.log('Retrying paragraph extraction for:', url);
      
      // Call the paragraph extraction API to get fresh data
      const response = await fetch('/api/extract/paragraphs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to retry paragraphs: ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      if (result.status === 'success' && result.paragraphs) {
        // Convert API response to frontend format
        const apiParagraphs: Paragraph[] = result.paragraphs.map((item: any) => ({
          id: item.id,
          title: item.title || (item.type === 'title' ? item.content : undefined),
          content: item.content,
          page: item.page,
          type: item.type,
          status: item.status || 'keep',
          confidence: item.confidence,
          order: item.order,
        }));

        setParagraphs(apiParagraphs);
        
        // Save retry results
        localStorage.setItem(`paragraphs-${runId}`, JSON.stringify({
          paragraphs: apiParagraphs,
          retriedAt: new Date().toISOString(),
          runId,
          isRetry: true
        }));
        
        console.log('Paragraph retry completed and saved');
      } else {
        throw new Error(result.message || 'Failed to retry paragraphs');
      }
    } catch (error) {
      console.error('Retry failed:', error);
      console.error(`Retry failed: ${error}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleStatus = (id: string) => {
    if (isConfirmed) return; // Prevent editing when confirmed
    setParagraphs(prev => prev.map(p => 
      p.id === id 
        ? { ...p, status: p.status === 'keep' ? 'remove' : 'keep' }
        : p
    ));
    saveParagraphData();
  };

  const startEditing = (id: string, content: string) => {
    if (isConfirmed) return; // Prevent editing when confirmed
    setEditingId(id);
    setEditContent(content);
  };

  const saveEdit = (id: string) => {
    setParagraphs(prev => prev.map(p => 
      p.id === id 
        ? { ...p, content: editContent.trim(), status: 'edit' }
        : p
    ));
    setEditingId(null);
    setEditContent('');
    saveParagraphData();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handlePageConfirm = (pageName: string) => {
    setConfirmedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageName)) {
        newSet.delete(pageName);
      } else {
        newSet.add(pageName);
      }
      return newSet;
    });
  };

  const handleAddParagraph = () => {
    if (!newParagraphContent.trim() || !selectedPageForContent) return;

    const newParagraph: Paragraph = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newParagraphTitle.trim() || undefined,
      content: newParagraphContent.trim(),
      page: selectedPageForContent,
      type: newParagraphTitle.trim() ? 'title' : 'paragraph',
      status: 'keep',
      confidence: 1.0, // User-created content has full confidence
      order: paragraphs.filter(p => p.page === selectedPageForContent).length + 1,
    };

    setParagraphs(prev => [...prev, newParagraph]);
    
    // Reset form
    setNewParagraphTitle('');
    setNewParagraphContent('');
    setSelectedPageForContent('');
    setShowUploadModal(false);
    saveParagraphData();
  };

  const openAddContentModal = (pageName: string) => {
    setSelectedPageForContent(pageName);
    setShowUploadModal(true);
  };

  const handleAIEnhance = async (id: string, content: string) => {
    try {
      // In a real app, this would call an AI enhancement API
      console.log('AI enhancing paragraph:', id);
      
      // Simulate AI enhancement with improved content
      const enhancedContent = `✨ AI Enhanced: ${content} This content has been improved using artificial intelligence to enhance clarity, engagement, and professional tone.`;
      
      setParagraphs(prev => prev.map(p => 
        p.id === id 
          ? { ...p, content: enhancedContent, status: 'edit', confidence: Math.min(0.99, p.confidence + 0.1) }
          : p
      ));
      
      console.log('AI enhancement completed for paragraph:', id);
      saveParagraphData();
    } catch (error) {
      console.error('AI enhancement failed:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, paragraphId: string) => {
    setDraggedParagraph(paragraphId);
    (e.dataTransfer as any).effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.dataTransfer as any).dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPage: string) => {
    e.preventDefault();
    if (draggedParagraph) {
      setParagraphs(prev => prev.map(p => 
        p.id === draggedParagraph ? { ...p, page: targetPage } : p
      ));
      setDraggedParagraph(null);
      saveParagraphData();
    }
  };

  const saveParagraphData = async () => {
    try {
      console.log('Saving paragraph data:', paragraphs);
      
      localStorage.setItem(`paragraphs-${runId}`, JSON.stringify({
        paragraphs,
        confirmedAt: new Date().toISOString(),
        runId,
        editedParagraphs: paragraphs.filter(p => p.status === 'edit' || p.status === 'remove')
      }));
      
      console.log('Paragraph data saved successfully');
    } catch (error) {
      console.error('Failed to save paragraph data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'keep':
        return 'text-green-600 bg-green-100';
      case 'remove':
        return 'text-red-600 bg-red-100';
      case 'edit':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Group paragraphs by page
  const groupedParagraphs = paragraphs.reduce((acc, paragraph) => {
    const page = paragraph.page;
    if (!acc[page]) {
      acc[page] = [];
    }
    acc[page].push(paragraph);
    return acc;
  }, {} as Record<string, Paragraph[]>);

  // Get current page names from page manager
  const currentPageNames = new Set(pages.map(page => page.name));
  
  // Find paragraphs that belong to removed pages (uncategorized)
  const uncategorizedParagraphs: Paragraph[] = [];
  Object.keys(groupedParagraphs).forEach(pageName => {
    if (!currentPageNames.has(pageName)) {
      uncategorizedParagraphs.push(...groupedParagraphs[pageName]);
      delete groupedParagraphs[pageName];
    }
  });

  // Ensure all current pages from page manager are represented, even if they have no paragraphs
  const allPages = pages.reduce((acc, page) => {
    if (!acc[page.name]) {
      acc[page.name] = [];
    }
    return acc;
  }, { ...groupedParagraphs });

  // Add uncategorized section at the top if there are uncategorized paragraphs
  let finalPages = allPages;
  if (uncategorizedParagraphs.length > 0) {
    const orderedPages: Record<string, Paragraph[]> = { 'Uncategorized': uncategorizedParagraphs };
    Object.entries(allPages).forEach(([key, value]) => {
      orderedPages[key] = value;
    });
    finalPages = orderedPages;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Paragraph Extraction</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleRetry}
            disabled={isRetrying || !url}
            className="px-4 py-2 text-sm font-medium text-black bg-yellow-400 border border-transparent rounded-full hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button 
            onClick={() => {
              saveParagraphData();
              onConfirm?.();
            }}
            className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full focus:outline-none focus:ring-2 ${
              isConfirmed 
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isConfirmed ? 'Unconfirm All' : uncategorizedParagraphs.length > 0 ? 'Confirm All (Excluding Uncategorized)' : 'Confirm All'}
          </button>
        </div>
      </div>

      {uncategorizedParagraphs.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Uncategorized Content Will Be Deleted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There are {uncategorizedParagraphs.length} paragraph(s) from removed pages that will be deleted when you confirm this tab. 
                  These paragraphs are not associated with any current page and will be permanently removed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading paragraphs...</p>
        </div>
      ) : paragraphs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No paragraphs found for this run.</p>
          <p className="text-sm text-gray-400 mt-2">Run ID: {runId}</p>
        </div>
      ) : (
        <>
          <div className="space-y-8 mb-8">
            {Object.entries(finalPages).map(([page, pageParagraphs]) => {
              const isUncategorized = page === 'Uncategorized';
              return (
                <div 
                  key={page} 
                  className={`border rounded-lg p-4 ${
                    isUncategorized
                      ? 'border-red-200 bg-red-50'
                      : confirmedPages.has(page) 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-white'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, page)}
                >
                  <div className={`flex justify-between items-center mb-4 pb-2 ${isUncategorized ? 'border-b border-red-200' : 'border-b border-gray-200'}`}>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {isUncategorized ? 'Uncategorized' : page} {draggedParagraph && '← Drop here'}
                      </h3>
                      {isUncategorized && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                          Will be deleted
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {!isUncategorized && (
                        <button 
                          className={`px-4 py-2 text-sm rounded-full transition-colors font-medium ${
                            isConfirmed 
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          onClick={() => openAddContentModal(page)}
                          disabled={isConfirmed}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Add content to this page"}
                        >
                          Add Content
                        </button>
                      )}
                      {!isUncategorized && (
                        <button 
                          className={`px-4 py-2 text-sm rounded-full transition-colors font-medium ${
                            confirmedPages.has(page)
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          onClick={() => handlePageConfirm(page)}
                        >
                          {confirmedPages.has(page) ? 'Unconfirm' : 'Confirm'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {pageParagraphs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No paragraphs found for this page.</p>
                        <p className="text-sm text-gray-400 mt-1">Paragraphs will appear here when extracted.</p>
                      </div>
                    ) : (
                      pageParagraphs.map((paragraph) => (
                      <div 
                        key={paragraph.id} 
                        className={`p-4 rounded-lg border cursor-move ${paragraph.status === 'remove' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, paragraph.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            {paragraph.type === 'title' ? (
                              <h4 className="text-md font-semibold text-gray-800 mb-2">
                                {paragraph.title}
                              </h4>
                            ) : (
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  Paragraph
                                </span>
                                {(paragraph as any).subtitle && (
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded font-medium">
                                    {(paragraph as any).subtitle}
                                  </span>
                                )}
                                {paragraph.title && (
                                  <span className="text-sm font-medium text-gray-700">
                                    {paragraph.title}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(paragraph.status)}`}>
                              {paragraph.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {paragraph.confidence.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-gray-700">
                          {editingId === paragraph.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent((e.target as any).value)}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => saveEdit(paragraph.id)}
                                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <p className="flex-1">{paragraph.content}</p>
                               <div className="flex items-center space-x-1 ml-4">
                                 <button
                                   onClick={() => startEditing(paragraph.id, paragraph.content)}
                                   disabled={isConfirmed}
                                   className={`p-1 ${
                                     isConfirmed 
                                       ? 'text-gray-300 cursor-not-allowed' 
                                       : 'text-gray-400 hover:text-blue-600'
                                   }`}
                                   title={isConfirmed ? "Section is locked - unconfirm to edit" : "Edit"}
                                 >
                                   <Edit3 className="w-4 h-4" />
                                 </button>
                                 <button
                                   onClick={() => handleAIEnhance(paragraph.id, paragraph.content)}
                                   disabled={isConfirmed}
                                   className={`p-1 ${
                                     isConfirmed 
                                       ? 'text-gray-300 cursor-not-allowed' 
                                       : 'text-gray-400 hover:text-purple-600'
                                   }`}
                                   title={isConfirmed ? "Section is locked - unconfirm to edit" : "AI Enhance"}
                                 >
                                   <Sparkles className="w-4 h-4" />
                                 </button>
                                 <button
                                   onClick={() => toggleStatus(paragraph.id)}
                                   disabled={isConfirmed}
                                   className={`p-1 ${
                                     isConfirmed 
                                       ? 'text-gray-300 cursor-not-allowed' 
                                       : `${paragraph.status === 'keep' ? 'text-green-600' : 'text-red-600'} hover:opacity-80`
                                   }`}
                                   title={isConfirmed ? "Section is locked - unconfirm to edit" : (paragraph.status === 'keep' ? 'Remove' : 'Keep')}
                                 >
                                   {paragraph.status === 'keep' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                 </button>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}

      {/* Add Content Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Content to {selectedPageForContent}</h3>
            <p className="text-gray-600 mb-4">
              Create a new paragraph for this page. Title is optional.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={newParagraphTitle}
                  onChange={(e) => setNewParagraphTitle((e.target as any).value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a title for this content..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newParagraphContent}
                  onChange={(e) => setNewParagraphContent((e.target as any).value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your content here..."
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setNewParagraphTitle('');
                  setNewParagraphContent('');
                  setSelectedPageForContent('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParagraph}
                disabled={!newParagraphContent.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}