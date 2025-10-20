import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Sparkles } from 'lucide-react';
import { usePageManager } from '../hooks/usePageManager';

interface ParagraphsTabProps {
  runId: string;
  url?: string;
  extractionOptions?: any;
  onConfirm?: () => void;
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

export function ParagraphsTab({ runId, url, extractionOptions, onConfirm }: ParagraphsTabProps) {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');

  // Use shared page manager
  const { pages, getPageNames, addPage } = usePageManager(runId);

  useEffect(() => {
    // Clear any existing localStorage data to prevent loading mock data
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('paragraphs-'));
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    loadParagraphData();
  }, [runId]);

  const loadParagraphData = async () => {
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

      const result = await response.json();
      
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
        localStorage.setItem(`paragraphs-${runId}`, JSON.stringify({
          paragraphs: apiParagraphs,
          loadedAt: new Date().toISOString(),
          runId,
        }));
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

      const result = await response.json();
      
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
      alert(`Retry failed: ${error}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleStatus = (id: string) => {
    setParagraphs(prev => prev.map(p => 
      p.id === id 
        ? { ...p, status: p.status === 'keep' ? 'remove' : 'keep' }
        : p
    ));
  };

  const startEditing = (id: string, content: string) => {
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
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
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert(`AI enhancement failed: ${error}`);
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Paragraph Extraction</h2>
      </div>

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
            {Object.entries(groupedParagraphs).map(([page, pageParagraphs]) => (
              <div key={page} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  {page}
                </h3>
                <div className="space-y-4">
                  {pageParagraphs.map((paragraph) => (
                    <div key={paragraph.id} className={`p-4 rounded-lg border ${paragraph.status === 'remove' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
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
                              onChange={(e) => setEditContent(e.target.value)}
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
                                 className="p-1 text-gray-400 hover:text-blue-600"
                                 title="Edit"
                               >
                                 <Edit3 className="w-4 h-4" />
                               </button>
                               <button
                                 onClick={() => handleAIEnhance(paragraph.id, paragraph.content)}
                                 className="p-1 text-gray-400 hover:text-purple-600"
                                 title="AI Enhance"
                               >
                                 <Sparkles className="w-4 h-4" />
                               </button>
                               <button
                                 onClick={() => toggleStatus(paragraph.id)}
                                 className={`p-1 ${paragraph.status === 'keep' ? 'text-green-600' : 'text-red-600'} hover:opacity-80`}
                                 title={paragraph.status === 'keep' ? 'Remove' : 'Keep'}
                               >
                                 {paragraph.status === 'keep' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                               </button>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button 
              onClick={() => {
                saveParagraphData();
                onConfirm?.();
              }}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Confirm
            </button>
            <button 
              onClick={handleRetry}
              disabled={isRetrying || !url}
              className="px-6 py-2 text-sm font-medium text-black bg-yellow-400 border border-transparent rounded-full hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
