import { useState, useEffect } from 'react';
import { usePageManager } from '../hooks/usePageManager';

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
  onConfirm?: () => void;
}

export function ImagesTab({ runId, onConfirm }: ImagesTabProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPage, setSelectedPage] = useState('Home Page');
  const [altText, setAltText] = useState('');
  const [title, setTitle] = useState('');
  const [draggedImage, setDraggedImage] = useState<string | null>(null);

  // Use shared page manager
  const { pages, getPageNames, addPage } = usePageManager(runId);

  useEffect(() => {
    if (runId) {
      loadImages();
    }
  }, [runId]);

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
    return images.reduce((groups, image) => {
      const page = image.page || 'Other';
      if (!groups[page]) {
        groups[page] = [];
      }
      groups[page].push(image);
      return groups;
    }, {} as Record<string, Image[]>);
  };

  const separateLogosFromImages = (images: Image[]) => {
    const logos = images.filter(img => img.type === 'logo');
    const otherImages = images.filter(img => img.type !== 'logo');
    return { logos, otherImages };
  };

  const handleImageStatusChange = (imageId: string, status: 'keep' | 'remove') => {
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Images</h2>
        <div className="flex space-x-2">
          <button 
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Image
          </button>
          <button 
            className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No images found for this run.</p>
          <p className="text-sm text-gray-400 mt-2">Run ID: {runId}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Your First Image
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Logo Section */}
          {logos.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                🏢 Company Logos
              </h3>
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
                          className={`px-3 py-1 text-xs rounded-full ${
                            image.status === 'keep' || !image.status
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'remove')}
                          className={`px-3 py-1 text-xs rounded-full ${
                            image.status === 'remove'
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
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

          {/* Other Images by Page */}
          {Object.entries(groupedImages).map(([page, pageImages]) => (
            <div 
              key={page} 
              className="border border-gray-200 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, page)}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {page} {draggedImage && '← Drop here'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pageImages.map((image) => (
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
                          className={`px-3 py-1 text-xs rounded-full ${
                            image.status === 'keep' || !image.status
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'remove')}
                          className={`px-3 py-1 text-xs rounded-full ${
                            image.status === 'remove'
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
