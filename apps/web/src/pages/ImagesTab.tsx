import { useState, useEffect } from 'react';
import { Page } from '../hooks/usePageManager';
import { Check } from 'lucide-react';

interface Image {
  id: string;
  url: string;
  alt_text: string;
  title: string;
  page: string;
  type: string;
  width?: string;
  height?: string;
  uploaded_at: string;
  is_uploaded: boolean;
  filename?: string;
  status?: 'keep' | 'remove';
}

interface ImagesTabProps {
  runId?: string;
  pages: Page[];
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

export function ImagesTab({ runId, pages, onConfirm, isConfirmed = false }: ImagesTabProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPage, setSelectedPage] = useState('Home Page');
  const [altText, setAltText] = useState('');
  const [title, setTitle] = useState('');
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [confirmedSections, setConfirmedSections] = useState<Set<string>>(new Set());
  const [isRetryingImages, setIsRetryingImages] = useState(false);

  // Debug logging
  console.log('ImagesTab render:', { runId, pages, pagesCount: pages.length });

  // Helper function to get page names
  const getPageNames = () => {
    return pages.map(page => page.name);
  };

  const handleRetryImageExtraction = async () => {
    setIsRetryingImages(true);
    try {
      console.log('Retrying image extraction for runId:', runId);
      
      const response = await fetch('/api/extract/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to retry image extraction: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.images) {
        setImages(result.images);
        console.log('Image retry completed successfully');
      } else {
        throw new Error(result.message || 'Failed to retry image extraction');
      }
    } catch (error) {
      console.error('Image retry failed:', error);
      alert(`Image retry failed: ${error}`);
    } finally {
      setIsRetryingImages(false);
    }
  };

  const handleSectionConfirm = (sectionId: string) => {
    setConfirmedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
    saveImageData();
  };

  const handleConfirmAll = () => {
    const allSections = new Set(['logos']);
    pages.forEach(page => allSections.add(page.name));
    
    // Check if all sections are already confirmed
    const allConfirmed = Array.from(allSections).every(section => confirmedSections.has(section));
    
    if (allConfirmed) {
      // If all are confirmed, unconfirm all
      setConfirmedSections(new Set());
    } else {
      // If not all are confirmed, confirm all
      setConfirmedSections(allSections);
    }
    
    saveImageData();
    onConfirm?.();
  };

  const saveImageData = () => {
    try {
      console.log('Saving image data:', images);
      
      localStorage.setItem(`images-${runId}`, JSON.stringify({
        images,
        confirmedAt: new Date().toISOString(),
        runId,
        confirmedSections: Array.from(confirmedSections)
      }));

      // Also save confirmed sections separately for persistence
      localStorage.setItem(`images-confirmed-sections-${runId}`, JSON.stringify({
        confirmedSections: Array.from(confirmedSections),
        savedAt: new Date().toISOString(),
        runId
      }));
      
      console.log('Image data saved successfully');
    } catch (error) {
      console.error('Failed to save image data:', error);
    }
  };

  useEffect(() => {
    if (runId) {
      loadImages();
      loadConfirmedSections();
    }
  }, [runId]);

  // Detect when new pages are added and unconfirm the tab
  useEffect(() => {
    if (pages.length > 0 && isConfirmed) {
      const savedData = localStorage.getItem(`images-confirmed-sections-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const savedConfirmedSections = new Set(parsed.confirmedSections || []);
        
        // Check if there are new pages that weren't confirmed before
        const currentPageNames = new Set(pages.map(p => p.name));
        const hasNewPages = Array.from(currentPageNames).some(pageName => !savedConfirmedSections.has(pageName));
        
        if (hasNewPages) {
          console.log('ImagesTab - New pages detected, unconfirming tab');
          onConfirm?.(); // This will unconfirm the tab
        }
      }
    }
  }, [pages, isConfirmed, runId, onConfirm]);

  const loadConfirmedSections = () => {
    try {
      const savedData = localStorage.getItem(`images-confirmed-sections-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setConfirmedSections(new Set(parsed.confirmedSections || []));
        console.log('ImagesTab - Loaded confirmed sections:', parsed.confirmedSections);
      }
    } catch (error) {
      console.error('Failed to load confirmed sections:', error);
    }
  };

  // Auto-confirm tab when all sections are confirmed
  useEffect(() => {
    if (confirmedSections.size > 0 && pages.length > 0 && !isConfirmed) {
      const allSections = new Set(['logos', ...pages.map(p => p.name)]);
      const allSectionsConfirmed = Array.from(allSections).every(section => confirmedSections.has(section));
      
      console.log('ImagesTab - Auto-confirm check:', {
        allSectionsConfirmed,
        sectionsCount: allSections.size,
        confirmedSections: Array.from(confirmedSections),
        allSections: Array.from(allSections),
        isConfirmed
      });
      
      if (allSectionsConfirmed && allSections.size > 0) {
        console.log('ImagesTab - Auto-confirming tab!');
        onConfirm?.();
      }
    }
  }, [confirmedSections, pages, onConfirm, isConfirmed]);

  // Remove tab check when not all sections are confirmed
  useEffect(() => {
    if (isConfirmed && confirmedSections.size > 0 && pages.length > 0) {
      const allSections = new Set(['logos', ...pages.map(p => p.name)]);
      const allSectionsConfirmed = Array.from(allSections).every(section => confirmedSections.has(section));
      
      console.log('ImagesTab - Auto-unconfirm check:', {
        allSectionsConfirmed,
        sectionsCount: allSections.size,
        confirmedSections: Array.from(confirmedSections),
        allSections: Array.from(allSections),
        isConfirmed
      });
      
      if (!allSectionsConfirmed) {
        console.log('ImagesTab - Auto-unconfirming tab!');
        onConfirm?.();
      }
    }
  }, [confirmedSections, pages, onConfirm, isConfirmed]);

  // Save confirmed sections whenever they change
  useEffect(() => {
    if (confirmedSections.size > 0 || runId) {
      try {
        localStorage.setItem(`images-confirmed-sections-${runId}`, JSON.stringify({
          confirmedSections: Array.from(confirmedSections),
          savedAt: new Date().toISOString(),
          runId
        }));
        console.log('ImagesTab - Saved confirmed sections:', Array.from(confirmedSections));
      } catch (error) {
        console.error('Failed to save confirmed sections:', error);
      }
    }
  }, [confirmedSections, runId]);

  const loadImages = async () => {
    if (!runId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/extract/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load images: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.images) {
        setImages(result.images);
      } else {
        throw new Error(result.message || 'Failed to load images');
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setTitle(file.name.split('.')[0]); // Use filename as default title
    } else {
      alert('Please select a valid image file.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !runId) return;

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        const response = await fetch('/api/extract/images/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            runId,
            page: selectedPage,
            imageData,
            filename: selectedFile.name,
            altText,
            title,
          }),
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
          // Add the new image to the list
          setImages(prev => [...prev, result.image]);
          setShowUploadModal(false);
          setSelectedFile(null);
          setAltText('');
          setTitle('');
          setSelectedPage('Home Page');
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const groupImagesByPage = (images: Image[]) => {
    // First group images by page
    const imageGroups = images.reduce((groups, image) => {
      const page = image.page || 'Other';
      if (!groups[page]) {
        groups[page] = [];
      }
      groups[page].push(image);
      return groups;
    }, {} as Record<string, Image[]>);

    // Get current page names from page manager
    const currentPageNames = new Set(pages.map(page => page.name));
    
    // Find images that belong to removed pages (uncategorized)
    const uncategorizedImages: Image[] = [];
    Object.keys(imageGroups).forEach(pageName => {
      if (!currentPageNames.has(pageName) && pageName !== 'logos') {
        uncategorizedImages.push(...imageGroups[pageName]);
        delete imageGroups[pageName];
      }
    });

    // Ensure all current pages from page manager are represented, even if they have no images
    const allPages = pages.reduce((acc, page) => {
      if (!acc[page.name]) {
        acc[page.name] = [];
      }
      return acc;
    }, { ...imageGroups });

    // Add uncategorized section at the top if there are uncategorized images
    if (uncategorizedImages.length > 0) {
      const orderedPages: Record<string, Image[]> = { 'Uncategorized': uncategorizedImages };
      Object.entries(allPages).forEach(([key, value]) => {
        orderedPages[key] = value;
      });
      return orderedPages;
    }

    return allPages;
  };

  const separateLogosFromImages = (images: Image[]) => {
    const logos = images.filter(img => img.type === 'logo');
    const otherImages = images.filter(img => img.type !== 'logo');
    return { logos, otherImages };
  };

  const handleImageStatusChange = (imageId: string, status: 'keep' | 'remove') => {
    if (isConfirmed) return; // Prevent editing when confirmed
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, status } : img
    ));
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImage(imageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPage: string) => {
    e.preventDefault();
    if (draggedImage) {
      setImages(prev => prev.map(img => 
        img.id === draggedImage ? { ...img, page: targetPage } : img
      ));
      setDraggedImage(null);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading images...</div>
        </div>
      </div>
    );
  }

  const { logos, otherImages } = separateLogosFromImages(images);
  const groupedImages = groupImagesByPage(otherImages);
  
  // Get uncategorized images count
  const uncategorizedImages = groupedImages['Uncategorized'] || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Images</h2>
        <div className="flex space-x-2">
          <button 
            className="px-4 py-2 text-sm font-medium text-black bg-yellow-400 border border-transparent rounded-full hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRetryImageExtraction}
            disabled={isRetryingImages}
          >
            {isRetryingImages ? 'Retrying...' : 'Retry'}
          </button>
          <button 
            className={`px-6 py-2 rounded-full transition-colors font-medium ${
              isConfirmed 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            onClick={handleConfirmAll}
          >
            {isConfirmed ? 'Unconfirm All' : 'Confirm All'}
          </button>
        </div>
      </div>

      {/* Uncategorized Images Warning - Moved to top */}
      {uncategorizedImages.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Uncategorized Images Will Be Deleted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  There are {uncategorizedImages.length} image(s) from removed pages that will be deleted when you confirm this tab. 
                  These images are not associated with any current page and will be permanently removed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No images found for this run.</p>
          <p className="text-sm text-gray-400 mt-2">Run ID: {runId}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Your First Image
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Uncategorized Images Section - Moved to top */}
          {groupedImages['Uncategorized'] && (
            <div className="border rounded-lg p-4 border-red-200 bg-red-50">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-red-200">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    ⚠️ Uncategorized {draggedImage && '← Drop here'}
                  </h3>
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                    Will be deleted
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedImages['Uncategorized'].map((image) => (
                  <div 
                    key={image.id} 
                    className={`border rounded-lg overflow-hidden cursor-move ${
                      image.status === 'remove' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, image.id)}
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <img
                        src={image.url}
                        alt={image.alt_text || 'Image'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-gray-500 text-sm">Image not available</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          image.is_uploaded 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {image.is_uploaded ? 'Uploaded' : 'Extracted'}
                        </span>
                        <span className="text-xs text-gray-500">{image.type}</span>
                      </div>
                      {image.title && (
                        <p className="text-sm font-medium text-gray-800 truncate">{image.title}</p>
                      )}
                      {image.alt_text && (
                        <p className="text-xs text-gray-600 truncate">{image.alt_text}</p>
                      )}
                      {image.filename && (
                        <p className="text-xs text-gray-500 truncate">{image.filename}</p>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'keep')}
                          disabled={isConfirmed}
                          className={`px-3 py-1 text-xs rounded-full ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : image.status === 'keep' || !image.status
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Keep this image"}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'remove')}
                          disabled={isConfirmed}
                          className={`px-3 py-1 text-xs rounded-full ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : image.status === 'remove'
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Remove this image"}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logo Section */}
          <div className={`border rounded-lg p-4 ${
            confirmedSections.has('logos') 
              ? 'border-green-200 bg-green-50' 
              : 'border-gray-200 bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  🏢 Company Logos
                </h3>
              </div>
              <div className="flex space-x-2">
                <button 
                  className={`px-4 py-2 text-sm rounded-full transition-colors font-medium ${
                    isConfirmed 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  onClick={() => setShowUploadModal(true)}
                  disabled={isConfirmed}
                  title={isConfirmed ? "Section is locked - unconfirm to edit" : "Upload logo"}
                >
                  Upload Logo
                </button>
                <button 
                  className={`px-4 py-2 text-sm text-white rounded-full transition-colors font-medium ${
                    confirmedSections.has('logos') 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  onClick={() => handleSectionConfirm('logos')}
                >
                  {confirmedSections.has('logos') ? 'Unconfirm' : 'Confirm'}
                </button>
              </div>
            </div>
            {logos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {logos.map((image) => (
                  <div 
                    key={image.id} 
                    className={`border rounded-lg overflow-hidden cursor-move ${
                      image.status === 'remove' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, image.id)}
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <img
                        src={image.url}
                        alt={image.alt_text || 'Logo'}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-gray-500 text-sm">Logo not available</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          image.is_uploaded 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {image.is_uploaded ? 'Uploaded' : 'Extracted'}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">Logo</span>
                      </div>
                      {image.title && (
                        <p className="text-sm font-medium text-gray-800 truncate">{image.title}</p>
                      )}
                      {image.alt_text && (
                        <p className="text-xs text-gray-600 truncate">{image.alt_text}</p>
                      )}
                      {image.filename && (
                        <p className="text-xs text-gray-500 truncate">{image.filename}</p>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'keep')}
                          disabled={isConfirmed}
                          className={`px-3 py-1 text-xs rounded-full ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : image.status === 'keep' || !image.status
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Keep this image"}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'remove')}
                          disabled={isConfirmed}
                          className={`px-3 py-1 text-xs rounded-full ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : image.status === 'remove'
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Remove this image"}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No logos found.</p>
                <p className="text-sm text-gray-400 mt-1">Upload a logo to get started.</p>
              </div>
            )}
          </div>

          {/* Other Images by Page */}
          {Object.entries(groupedImages).map(([page, pageImages]) => {
            // Skip Uncategorized since it's handled separately at the top
            if (page === 'Uncategorized') return null;
            
            return (
              <div 
                key={page} 
                className={`border rounded-lg p-4 ${
                  confirmedSections.has(page) 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, page)}
              >
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {page} {draggedImage && '← Drop here'}
                    </h3>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className={`px-4 py-2 text-sm rounded-full transition-colors font-medium ${
                        isConfirmed 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      onClick={() => setShowUploadModal(true)}
                      disabled={isConfirmed}
                      title={isConfirmed ? "Section is locked - unconfirm to edit" : "Upload image to this page"}
                    >
                      Upload Image
                    </button>
                    <button 
                      className={`px-4 py-2 text-sm text-white rounded-full transition-colors font-medium ${
                        confirmedSections.has(page) 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      onClick={() => handleSectionConfirm(page)}
                    >
                      {confirmedSections.has(page) ? 'Unconfirm' : 'Confirm'}
                    </button>
                  </div>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pageImages.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <p>No images found for this page.</p>
                    <p className="text-sm text-gray-400 mt-1">Images will appear here when extracted or uploaded.</p>
                  </div>
                ) : (
                  pageImages.map((image) => (
                  <div 
                    key={image.id} 
                    className={`border rounded-lg overflow-hidden cursor-move ${
                      image.status === 'remove' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, image.id)}
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <img
                        src={image.url}
                        alt={image.alt_text || 'Image'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-gray-500 text-sm">Image not available</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          image.is_uploaded 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {image.is_uploaded ? 'Uploaded' : 'Extracted'}
                        </span>
                        <span className="text-xs text-gray-500">{image.type}</span>
                      </div>
                      {image.title && (
                        <p className="text-sm font-medium text-gray-800 truncate">{image.title}</p>
                      )}
                      {image.alt_text && (
                        <p className="text-xs text-gray-600 truncate">{image.alt_text}</p>
                      )}
                      {image.filename && (
                        <p className="text-xs text-gray-500 truncate">{image.filename}</p>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'keep')}
                          disabled={isConfirmed}
                          className={`px-3 py-1 text-xs rounded-full ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : image.status === 'keep' || !image.status
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Keep this image"}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'remove')}
                          disabled={isConfirmed}
                          className={`px-3 py-1 text-xs rounded-full ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : image.status === 'remove'
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Remove this image"}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Image</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Page
                </label>
                            <select
                              value={selectedPage}
                              onChange={(e) => setSelectedPage(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {getPageNames().map((page) => (
                                <option key={page} value={page}>{page}</option>
                              ))}
                            </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter image title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Enter alt text for accessibility"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            onClick={() => setShowUploadModal(false)}
                            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                            disabled={isUploading}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploading ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
          </div>
        </div>
      )}
    </div>
  );
}
