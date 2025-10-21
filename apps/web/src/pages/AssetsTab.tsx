import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Download, Image, FileText, Check, Upload, Trash2, Edit3 } from 'lucide-react';
import { Page } from '../hooks/usePageManager';

interface AssetsTabProps {
  runId: string;
  url?: string;
  pages: Page[];
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

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

interface DownloadableFile {
  id: string;
  url: string;
  text: string;
  download_attribute?: string;
  class: string[];
  file_type: string;
  page: string;
  position: {
    section: string;
    index: number;
    total_siblings: number;
  };
  uploaded_at?: string;
  is_uploaded?: boolean;
  filename?: string;
  status?: 'keep' | 'remove';
}

interface AssetsData {
  favicons: Array<{
    url: string;
    rel: string[];
    sizes?: string;
    type?: string;
    common_path?: boolean;
  }>;
  images: Image[];
  downloadable_files: DownloadableFile[];
  fonts: Array<{
    url?: string;
    type: string;
    source: string;
    content?: string;
  }>;
  stylesheets: Array<{
    url: string;
    media?: string;
    type?: string;
    integrity?: string;
    crossorigin?: string;
  }>;
  scripts: Array<{
    url?: string;
    type?: string;
    async: boolean;
    defer: boolean;
    integrity?: string;
    crossorigin?: string;
    inline?: boolean;
    content_length?: number;
  }>;
  extraction_date?: string;
  url?: string;
  error?: string;
}

export function AssetsTab({ runId, url, pages, onConfirm, isConfirmed = false }: AssetsTabProps) {
  const [assetsData, setAssetsData] = useState<AssetsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeSection, setActiveSection] = useState<'images' | 'files' | 'favicons'>('images');
  
  // Image-related state
  const [images, setImages] = useState<Image[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPage, setSelectedPage] = useState('Home Page');
  const [altText, setAltText] = useState('');
  const [title, setTitle] = useState('');
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [confirmedSections, setConfirmedSections] = useState<Set<string>>(new Set());
  const [isRetryingImages, setIsRetryingImages] = useState(false);

  // File-related state
  const [files, setFiles] = useState<DownloadableFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [selectedFilePage, setSelectedFilePage] = useState('Home Page');
  const [fileDescription, setFileDescription] = useState('');
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [confirmedFileSections, setConfirmedFileSections] = useState<Set<string>>(new Set());
  const [isRetryingFiles, setIsRetryingFiles] = useState(false);

  useEffect(() => {
    loadAssetsData();
    loadImagesData();
    loadFilesData();
    if (runId) {
      loadConfirmedSections();
      loadConfirmedFileSections();
    }
  }, [runId]);

  // Auto-confirm tab when all sections are confirmed
  useEffect(() => {
    if (confirmedSections.size > 0 && pages.length > 0 && !isConfirmed) {
      const allSections = new Set(['logos', ...pages.map(p => p.name)]);
      const allSectionsConfirmed = Array.from(allSections).every(section => confirmedSections.has(section));
      
      if (allSectionsConfirmed && allSections.size > 0) {
        onConfirm?.();
      }
    }
  }, [confirmedSections, pages, onConfirm, isConfirmed]);

  // Remove tab check when not all sections are confirmed
  useEffect(() => {
    if (isConfirmed && confirmedSections.size > 0 && pages.length > 0) {
      const allSections = new Set(['logos', ...pages.map(p => p.name)]);
      const allSectionsConfirmed = Array.from(allSections).every(section => confirmedSections.has(section));
      
      if (!allSectionsConfirmed) {
        onConfirm?.();
      }
    }
  }, [confirmedSections, pages, onConfirm, isConfirmed]);

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
          onConfirm?.(); // This will unconfirm the tab
        }
      }
    }
  }, [pages, isConfirmed, runId, onConfirm]);

  // Save confirmed sections whenever they change
  useEffect(() => {
    if (confirmedSections.size > 0 || runId) {
      try {
        localStorage.setItem(`images-confirmed-sections-${runId}`, JSON.stringify({
          confirmedSections: Array.from(confirmedSections),
          savedAt: new Date().toISOString(),
          runId
        }));
      } catch (error) {
        console.error('Failed to save confirmed sections:', error);
      }
    }
  }, [confirmedSections, runId]);

  const loadImagesData = async () => {
    try {
      // First try to load from localStorage (preloaded data)
      const savedData = localStorage.getItem(`images-${runId}`);
      console.log('AssetsTab: Checking for preloaded images data with key:', `images-${runId}`);
      console.log('AssetsTab: Preloaded data exists:', !!savedData);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('AssetsTab: Parsed preloaded data:', parsed);
        
        // Handle both preloaded data format (just images array) and saved data format (with confirmedSections)
        if (Array.isArray(parsed)) {
          // Preloaded data format - just an array of images
          setImages(parsed);
          console.log('AssetsTab: Using preloaded images array:', parsed.length, 'images');
        } else if (parsed.images) {
          // Saved data format - object with images and confirmedSections
          setImages(parsed.images);
          if (parsed.confirmedSections) {
            setConfirmedSections(new Set(parsed.confirmedSections));
          }
          console.log('AssetsTab: Using saved images data:', parsed.images.length, 'images');
        }
        return;
      }

      // If no saved data, fetch from API
      console.log('AssetsTab: No preloaded data found, fetching from API...');
      const response = await fetch('/api/extract/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.images) {
          setImages(result.images);
          // Store the fetched data for future use
          localStorage.setItem(`images-${runId}`, JSON.stringify(result.images));
          console.log('AssetsTab: Fetched and stored images data:', result.images.length, 'images');
        }
      }
    } catch (error) {
      console.error('Error loading images data:', error);
    }
  };

  const loadFilesData = async () => {
    try {
      // First try to load from localStorage
      const savedData = localStorage.getItem(`files-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.files) {
          setFiles(parsed.files);
        }
        if (parsed.confirmedFileSections) {
          setConfirmedFileSections(new Set(parsed.confirmedFileSections));
        }
        return;
      }

      // If no saved data, load from assets data
      if (assetsData?.downloadable_files) {
        const filesWithIds = assetsData.downloadable_files.map((file, index) => ({
          ...file,
          id: `file-${index}`,
          page: file.position.section || 'Other',
          status: 'keep' as const
        }));
        setFiles(filesWithIds);
      }
    } catch (error) {
      console.error('Error loading files data:', error);
    }
  };

  // Load files when assets data changes
  useEffect(() => {
    if (assetsData?.downloadable_files && files.length === 0) {
      loadFilesData();
    }
  }, [assetsData]);

  const loadAssetsData = async () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem(`assets-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setAssetsData(parsed);
        setIsLoading(false);
        return;
      }

      // If no saved data, try to extract
      await retryAssetsExtraction();
    } catch (error) {
      console.error('Error loading assets data:', error);
      setIsLoading(false);
    }
  };

  const retryAssetsExtraction = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/extract/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url || 'https://example.com',
          runId: runId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.result;
        
        // Save to localStorage
        const dataToSave = {
          ...data,
          loadedAt: new Date().toISOString(),
          retriedAt: new Date().toISOString()
        };
        localStorage.setItem(`assets-${runId}`, JSON.stringify(dataToSave));
        
        setAssetsData(data);
      } else {
        console.error('Assets extraction failed');
      }
    } catch (error) {
      console.error('Error retrying assets extraction:', error);
    } finally {
      setIsRetrying(false);
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (assetsData) {
      const confirmedData = {
        ...assetsData,
        confirmedAt: new Date().toISOString()
      };
      localStorage.setItem(`assets-${runId}`, JSON.stringify(confirmedData));
      onConfirm?.();
    }
  };

  // Image-related functions
  const getPageNames = () => {
    return pages.map(page => page.name);
  };

  const handleRetryImageExtraction = async () => {
    setIsRetryingImages(true);
    try {
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

  const loadConfirmedSections = () => {
    try {
      // First try to load from the main images data
      const imagesData = localStorage.getItem(`images-${runId}`);
      if (imagesData) {
        const parsed = JSON.parse(imagesData);
        if (parsed.confirmedSections) {
          setConfirmedSections(new Set(parsed.confirmedSections));
          console.log('Loaded confirmed sections from images data:', parsed.confirmedSections);
          return;
        }
      }
      
      // Fallback to the separate confirmed sections storage
      const savedData = localStorage.getItem(`images-confirmed-sections-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setConfirmedSections(new Set(parsed.confirmedSections || []));
        console.log('Loaded confirmed sections from separate storage:', parsed.confirmedSections);
      }
    } catch (error) {
      console.error('Failed to load confirmed sections:', error);
    }
  };

  const loadConfirmedFileSections = () => {
    try {
      // First try to load from the main files data
      const filesData = localStorage.getItem(`files-${runId}`);
      if (filesData) {
        const parsed = JSON.parse(filesData);
        if (parsed.confirmedFileSections) {
          setConfirmedFileSections(new Set(parsed.confirmedFileSections));
          console.log('Loaded confirmed file sections from files data:', parsed.confirmedFileSections);
          return;
        }
      }
      
      // Fallback to the separate confirmed sections storage
      const savedData = localStorage.getItem(`files-confirmed-sections-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setConfirmedFileSections(new Set(parsed.confirmedFileSections || []));
        console.log('Loaded confirmed file sections from separate storage:', parsed.confirmedFileSections);
      }
    } catch (error) {
      console.error('Failed to load confirmed file sections:', error);
    }
  };

  const saveImageData = () => {
    try {
      const dataToSave = {
        images,
        confirmedAt: new Date().toISOString(),
        runId,
        confirmedSections: Array.from(confirmedSections)
      };
      
      localStorage.setItem(`images-${runId}`, JSON.stringify(dataToSave));
      console.log('Images data saved:', dataToSave);

      // Also save confirmed sections separately for persistence
      localStorage.setItem(`images-confirmed-sections-${runId}`, JSON.stringify({
        confirmedSections: Array.from(confirmedSections),
        savedAt: new Date().toISOString(),
        runId
      }));
    } catch (error) {
      console.error('Failed to save image data:', error);
    }
  };

  const saveFileData = () => {
    try {
      const dataToSave = {
        files,
        confirmedAt: new Date().toISOString(),
        runId,
        confirmedFileSections: Array.from(confirmedFileSections)
      };
      
      localStorage.setItem(`files-${runId}`, JSON.stringify(dataToSave));
      console.log('Files data saved:', dataToSave);

      // Also save confirmed sections separately for persistence
      localStorage.setItem(`files-confirmed-sections-${runId}`, JSON.stringify({
        confirmedFileSections: Array.from(confirmedFileSections),
        savedAt: new Date().toISOString(),
        runId
      }));
    } catch (error) {
      console.error('Failed to save file data:', error);
    }
  };

  const handleImageStatusChange = (imageId: string, status: 'keep' | 'remove') => {
    if (isConfirmed) return; // Prevent editing when confirmed
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, status } : img
    ));
  };

  const handleFileStatusChange = (fileId: string, status: 'keep' | 'remove') => {
    if (isConfirmed) return; // Prevent editing when confirmed
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, status } : file
    ));
  };

  const handleFileSectionConfirm = (sectionId: string) => {
    setConfirmedFileSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
    saveFileData();
  };

  const handleFileDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFile(fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleFileDrop = (e: React.DragEvent, targetPage: string) => {
    e.preventDefault();
    if (draggedFile) {
      setFiles(prev => prev.map(file => 
        file.id === draggedFile ? { ...file, page: targetPage } : file
      ));
      setDraggedFile(null);
      saveFileData(); // Save the changes
    }
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

  const handleImageUpload = async () => {
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
      saveImageData(); // Save the changes
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'spreadsheet':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'presentation':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'archive':
        return <Download className="w-4 h-4 text-purple-600" />;
      case 'audio':
        return <Download className="w-4 h-4 text-pink-600" />;
      case 'video':
        return <Download className="w-4 h-4 text-indigo-600" />;
      case 'image':
        return <Image className="w-4 h-4 text-yellow-600" />;
      default:
        return <Download className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderFavicons = () => {
    if (!assetsData?.favicons.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No favicons found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {assetsData.favicons.map((favicon, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <Image className="w-5 h-5 text-blue-600" />
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  Favicon
                </span>
                {favicon.common_path && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Common Path
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-900">URL: </span>
                <a href={favicon.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {favicon.url}
                </a>
              </div>
              {favicon.sizes && (
                <div>
                  <span className="font-medium text-gray-900">Sizes: </span>
                  <span className="text-gray-700">{favicon.sizes}</span>
                </div>
              )}
              {favicon.type && (
                <div>
                  <span className="font-medium text-gray-900">Type: </span>
                  <span className="text-gray-700">{favicon.type}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-900">Rel: </span>
                <span className="text-gray-700">{favicon.rel.join(', ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderImages = () => {
    if (!images.length) {
      return (
        <div className="text-center py-12">
          <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No images found for this run.</p>
          <p className="text-sm text-gray-400 mt-2">Run ID: {runId}</p>
          <button 
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all font-medium"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Your First Image
          </button>
        </div>
      );
    }

    // Debug: Log all images and their types
    console.log('AssetsTab: All images:', images.map(img => ({
      id: img.id,
      type: img.type,
      page: img.page,
      alt_text: img.alt_text,
      title: img.title,
      filename: img.filename
    })));

    // Separate logos from other images with balanced logic
    const logos = images.filter(img => {
      // Trust the Python extractor's initial categorization but add smart validation
      if (img.type === 'logo') {
        const altLower = (img.alt_text || '').toLowerCase();
        const titleLower = (img.title || '').toLowerCase();
        const filenameLower = (img.filename || '').toLowerCase();
        
        // Check for explicit logo indicators
        const hasLogoText = altLower.includes('logo') || titleLower.includes('logo') || 
                           altLower.includes('brand') || titleLower.includes('brand');
        const hasLogoFilename = filenameLower.includes('logo') || filenameLower.includes('brand');
        
        // If it has logo indicators, definitely keep as logo
        if (hasLogoText || hasLogoFilename) {
          return true;
        }
        
        // If no text indicators but marked as logo, check if it's the first image on Home Page
        // (common pattern: first image is often the logo)
        if (img.page === 'Home Page' && img.id === 'img_0') {
          return true; // Keep first image on home page as logo
        }
        
        // For other cases, be more conservative - keep as logo if extractor says so
        // but log for debugging
        console.log('AssetsTab: Keeping image as logo despite no text indicators:', {
          id: img.id,
          type: img.type,
          page: img.page,
          alt_text: img.alt_text,
          title: img.title
        });
        return true;
      }
      
      return false;
    });
    
    const otherImages = images.filter(img => {
      // Include all non-logo images
      if (img.type !== 'logo') {
        return true;
      }
      
      // For images marked as logo, only move to content if they clearly aren't logos
      const altLower = (img.alt_text || '').toLowerCase();
      const titleLower = (img.title || '').toLowerCase();
      const filenameLower = (img.filename || '').toLowerCase();
      
      // Check for explicit content indicators (images that are clearly not logos)
      const hasContentText = altLower.includes('photo') || altLower.includes('image') || 
                            altLower.includes('picture') || altLower.includes('banner') ||
                            altLower.includes('hero') || altLower.includes('background');
      
      // Only move to content if it has explicit content indicators
      // Otherwise, trust the extractor's logo classification
      if (hasContentText) {
        console.log('AssetsTab: Moving image from logo to content due to content indicators:', {
          id: img.id,
          type: img.type,
          alt_text: img.alt_text,
          title: img.title
        });
        return true;
      }
      
      return false; // Keep as logo
    });

    // Debug: Log categorization results
    console.log('AssetsTab: Logo images:', logos.map(img => ({ id: img.id, type: img.type, alt_text: img.alt_text })));
    console.log('AssetsTab: Content images:', otherImages.map(img => ({ id: img.id, type: img.type, page: img.page })));

    // Group images by page with improved logic
    const groupedImages = otherImages.reduce((acc, image) => {
      // Normalize page names
      let page = image.page || 'Other';
      
      // Map common page variations to standard names
      if (page.toLowerCase().includes('home') || page.toLowerCase().includes('main')) {
        page = 'Home Page';
      } else if (page.toLowerCase().includes('service')) {
        page = 'Services Page';
      } else if (page.toLowerCase().includes('work') || page.toLowerCase().includes('portfolio')) {
        page = 'Our Work Page';
      } else if (page.toLowerCase().includes('about')) {
        page = 'About Page';
      } else if (page.toLowerCase().includes('contact')) {
        page = 'Contact Page';
      }
      
      if (!acc[page]) acc[page] = [];
      acc[page].push(image);
      return acc;
    }, {} as Record<string, Image[]>);

    // Get current page names from page manager
    const currentPageNames = new Set(pages.map(page => page.name));
    
    // Find images that belong to removed pages (uncategorized)
    const uncategorizedImages: Image[] = [];
    Object.keys(groupedImages).forEach(pageName => {
      if (!currentPageNames.has(pageName) && pageName !== 'logos') {
        uncategorizedImages.push(...groupedImages[pageName]);
        delete groupedImages[pageName];
      }
    });

    // Ensure all current pages from page manager are represented, even if they have no images
    const allPages = pages.reduce((acc, page) => {
      if (!acc[page.name]) {
        acc[page.name] = [];
      }
      return acc;
    }, { ...groupedImages });

    // Add uncategorized section at the top if there are uncategorized images
    const orderedPages: Record<string, Image[]> = {};
    if (uncategorizedImages.length > 0) {
      orderedPages['Uncategorized'] = uncategorizedImages;
    }
    Object.entries(allPages).forEach(([key, value]) => {
      orderedPages[key] = value;
    });

    return (
      <div className="space-y-8">
        {/* Uncategorized Images Warning */}
        {uncategorizedImages.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
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

        {/* Logo Section */}
        {logos.length > 0 && (
          <div 
            className={`border rounded-lg p-4 ${
              confirmedSections.has('logos') 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-white'
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'logos')}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  🏢 Company Logos {draggedImage && '← Drop here'}
                </h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {logos.length} logo{logos.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => handleSectionConfirm('logos')}
                className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full transition-all ${
                  confirmedSections.has('logos')
                    ? 'text-white bg-red-600 hover:bg-red-700'
                    : 'text-white bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmedSections.has('logos') ? 'Unconfirm' : 'Confirm'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {logos.map((image) => (
                  <div 
                    key={image.id} 
                    className="border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleDragStart(e, image.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'logos')}
                  >
                  <div className="aspect-w-16 aspect-h-9 mb-3">
                    <img
                      src={image.url}
                      alt={image.alt_text}
                      className="w-full h-32 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOUI5QjlCIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Logo
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'keep')}
                          className={`p-1 rounded ${image.status === 'keep' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleImageStatusChange(image.id, 'remove')}
                          className={`p-1 rounded ${image.status === 'remove' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {image.alt_text && (
                      <p className="text-sm text-gray-600">Alt: {image.alt_text}</p>
                    )}
                    
                    {image.title && (
                      <p className="text-sm text-gray-600">Title: {image.title}</p>
                    )}
                    
                    {(image.width || image.height) && (
                      <p className="text-xs text-gray-500">
                        {image.width} × {image.height}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Images by Page */}
        {Object.entries(orderedPages).map(([pageName, pageImages]) => (
          <div 
            key={pageName} 
            className={`border rounded-lg p-4 ${
              confirmedSections.has(pageName) 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-white'
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, pageName)}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {pageName === 'Uncategorized' ? '⚠️ Uncategorized Images' : `📄 ${pageName}`} {draggedImage && '← Drop here'}
                </h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {pageImages.length} image{pageImages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex space-x-2">
                {pageName !== 'Uncategorized' && (
                  <button
                    onClick={() => {
                      setSelectedPage(pageName);
                      setShowUploadModal(true);
                    }}
                    className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full transition-all ${
                      isConfirmed 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={isConfirmed}
                    title={isConfirmed ? "Section is locked - unconfirm to edit" : "Upload image to this page"}
                  >
                    Upload Image
                  </button>
                )}
                {pageName !== 'Uncategorized' && (
                  <button
                    onClick={() => handleSectionConfirm(pageName)}
                    className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full transition-all ${
                      confirmedSections.has(pageName)
                        ? 'text-white bg-red-600 hover:bg-red-700'
                        : 'text-white bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {confirmedSections.has(pageName) ? 'Unconfirm' : 'Confirm'}
                  </button>
                )}
              </div>
            </div>
            
            {pageImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageImages.map((image) => (
                  <div 
                    key={image.id} 
                    className="border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleDragStart(e, image.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, pageName)}
                  >
                    <div className="aspect-w-16 aspect-h-9 mb-3">
                      <img
                        src={image.url}
                        alt={image.alt_text}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOUI5QjlCIi8+Cjwvc3ZnPgo=';
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {image.type}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleImageStatusChange(image.id, 'keep')}
                            className={`p-1 rounded ${image.status === 'keep' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleImageStatusChange(image.id, 'remove')}
                            className={`p-1 rounded ${image.status === 'remove' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {image.alt_text && (
                        <p className="text-sm text-gray-600">Alt: {image.alt_text}</p>
                      )}
                      
                      {image.title && (
                        <p className="text-sm text-gray-600">Title: {image.title}</p>
                      )}
                      
                      {(image.width || image.height) && (
                        <p className="text-xs text-gray-500">
                          {image.width} × {image.height}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No images found for this page.</p>
                <p className="text-sm text-gray-400 mt-1">Images will appear here when extracted or uploaded.</p>
              </div>
            )}
          </div>
        ))}


        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Image</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page</label>
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {getPageNames().map(page => (
                      <option key={page} value={page}>{page}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageUpload}
                  disabled={!selectedFile || isUploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFiles = () => {
    // Always show pages, even if no files exist

    // Group files by page
    const groupedFiles = files.reduce((acc, file) => {
      const page = file.page || 'Other';
      if (!acc[page]) acc[page] = [];
      acc[page].push(file);
      return acc;
    }, {} as Record<string, DownloadableFile[]>);

    // Get current page names from page manager
    const currentPageNames = new Set(pages.map(page => page.name));
    
    // Find files that belong to removed pages (uncategorized)
    const uncategorizedFiles: DownloadableFile[] = [];
    Object.keys(groupedFiles).forEach(pageName => {
      if (!currentPageNames.has(pageName)) {
        uncategorizedFiles.push(...groupedFiles[pageName]);
        delete groupedFiles[pageName];
      }
    });

    // Create ordered pages structure - always show all current pages
    const orderedPages: Record<string, DownloadableFile[]> = {};
    
    // Add uncategorized section first if there are uncategorized files
    if (uncategorizedFiles.length > 0) {
      orderedPages['Uncategorized'] = uncategorizedFiles;
    }
    
    // Add all current pages from page manager, even if they have no files
    pages.forEach(page => {
      orderedPages[page.name] = groupedFiles[page.name] || [];
    });

    return (
      <div className="space-y-8">
        {/* Uncategorized Files Warning - Moved to top */}
        {uncategorizedFiles.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Uncategorized Files Will Be Deleted
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    There are {uncategorizedFiles.length} file(s) from removed pages that will be deleted when you confirm this tab. 
                    These files are not associated with any current page and will be permanently removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Files Message */}
        {files.length === 0 && (
          <div className="text-center py-8 bg-blue-50 border border-blue-200 rounded-lg">
            <Download className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-lg font-medium text-blue-900 mb-2">No Files Found</h3>
            <p className="text-blue-700 mb-4">No files have been extracted or uploaded yet.</p>
            <p className="text-sm text-blue-600">Use the "Upload File" buttons below to add files to specific pages.</p>
          </div>
        )}

        {/* Files by Page */}
        {Object.entries(orderedPages).map(([pageName, pageFiles]) => (
          <div 
            key={pageName} 
            className={`border rounded-lg p-4 ${
              confirmedFileSections.has(pageName) 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-white'
            }`}
            onDragOver={handleFileDragOver}
            onDrop={(e) => handleFileDrop(e, pageName)}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {pageName === 'Uncategorized' ? '⚠️ Uncategorized Files' : `📄 ${pageName}`} {draggedFile && '← Drop here'}
                </h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {pageFiles.length} file{pageFiles.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex space-x-2">
                {pageName !== 'Uncategorized' && (
                  <button
                    onClick={() => {
                      setSelectedFilePage(pageName);
                      setShowFileUploadModal(true);
                    }}
                    className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full transition-all ${
                      isConfirmed 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={isConfirmed}
                    title={isConfirmed ? "Section is locked - unconfirm to edit" : "Upload file to this page"}
                  >
                    Upload File
                  </button>
                )}
                {pageName !== 'Uncategorized' && (
                  <button
                    onClick={() => handleFileSectionConfirm(pageName)}
                    className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full transition-all ${
                      confirmedFileSections.has(pageName)
                        ? 'text-white bg-red-600 hover:bg-red-700'
                        : 'text-white bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {confirmedFileSections.has(pageName) ? 'Unconfirm' : 'Confirm'}
                  </button>
                )}
              </div>
            </div>
            
            {pageFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className={`border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow ${
                      file.status === 'remove' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    draggable
                    onDragStart={(e) => handleFileDragStart(e, file.id)}
                    onDragOver={handleFileDragOver}
                    onDrop={(e) => handleFileDrop(e, pageName)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getFileTypeIcon(file.file_type)}
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {file.file_type}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleFileStatusChange(file.id, 'keep')}
                          disabled={isConfirmed}
                          className={`p-1 rounded ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : file.status === 'keep' || !file.status
                                ? 'bg-green-100 text-green-600' 
                                : 'text-gray-400 hover:text-green-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Keep this file"}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFileStatusChange(file.id, 'remove')}
                          disabled={isConfirmed}
                          className={`p-1 rounded ${
                            isConfirmed 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : file.status === 'remove'
                                ? 'bg-red-100 text-red-600' 
                                : 'text-gray-400 hover:text-red-600'
                          }`}
                          title={isConfirmed ? "Section is locked - unconfirm to edit" : "Remove this file"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-900">Text: </span>
                        <span className="text-gray-700 text-sm">{file.text}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">URL: </span>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                          {file.url}
                        </a>
                      </div>
                      {file.download_attribute && (
                        <div>
                          <span className="font-medium text-gray-900">Download Attribute: </span>
                          <span className="text-gray-700 text-sm">{file.download_attribute}</span>
                        </div>
                      )}
                      {file.class.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-900">Classes: </span>
                          <span className="text-gray-700 text-sm">{file.class.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Download className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No files found for this page.</p>
                <p className="text-sm text-gray-400 mt-1">Click "Upload File" to add files to this page.</p>
              </div>
            )}
          </div>
        ))}

        {/* File Upload Modal */}
        {showFileUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload File</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFileForUpload(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder="Enter file description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowFileUploadModal(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement file upload functionality
                    setShowFileUploadModal(false);
                  }}
                  disabled={!selectedFileForUpload || isUploadingFile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {isUploadingFile ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFonts = () => {
    if (!assetsData?.fonts.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No fonts found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {assetsData.fonts.map((font, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  {font.type}
                </span>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  {font.source}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {font.url && (
                <div>
                  <span className="font-medium text-gray-900">URL: </span>
                  <a href={font.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {font.url}
                  </a>
                </div>
              )}
              {font.content && (
                <div>
                  <span className="font-medium text-gray-900">Content: </span>
                  <pre className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                    {font.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStylesheets = () => {
    if (!assetsData?.stylesheets.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No stylesheets found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {assetsData.stylesheets.map((stylesheet, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  CSS
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-900">URL: </span>
                <a href={stylesheet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {stylesheet.url}
                </a>
              </div>
              {stylesheet.media && (
                <div>
                  <span className="font-medium text-gray-900">Media: </span>
                  <span className="text-gray-700">{stylesheet.media}</span>
                </div>
              )}
              {stylesheet.type && (
                <div>
                  <span className="font-medium text-gray-900">Type: </span>
                  <span className="text-gray-700">{stylesheet.type}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderScripts = () => {
    if (!assetsData?.scripts.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No scripts found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {assetsData.scripts.map((script, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                  JavaScript
                </span>
                {script.inline && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Inline
                  </span>
                )}
                {script.async && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Async
                  </span>
                )}
                {script.defer && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    Defer
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {script.url ? (
                <div>
                  <span className="font-medium text-gray-900">URL: </span>
                  <a href={script.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {script.url}
                  </a>
                </div>
              ) : (
                <div>
                  <span className="font-medium text-gray-900">Content Length: </span>
                  <span className="text-gray-700">{script.content_length} characters</span>
                </div>
              )}
              {script.type && (
                <div>
                  <span className="font-medium text-gray-900">Type: </span>
                  <span className="text-gray-700">{script.type}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading site assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assetsData) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assets Data Found</h3>
          <p className="text-gray-600 mb-4">Unable to extract site assets from the website.</p>
          <button
            onClick={retryAssetsExtraction}
            disabled={isRetrying}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isRetrying ? 'Retrying...' : 'Retry Extraction'}
          </button>
        </div>
      </div>
    );
  }

  const totalAssets = (assetsData.favicons?.length || 0) + 
                     (images?.length || 0) + 
                     (files?.length || 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Site Assets</h2>
          <p className="text-gray-600 mt-1">Review and confirm extracted site assets</p>
          <p className="text-sm text-gray-500 mt-1">Found {totalAssets} assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={retryAssetsExtraction}
            disabled={isRetrying}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 text-sm font-medium border border-transparent rounded-full focus:outline-none focus:ring-2 transition-all ${
              isConfirmed 
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isConfirmed ? (
              <>
                <XCircle className="w-4 h-4 inline mr-2" />
                Unconfirm
              </>
            ) : (
              <>
                <Check className="w-4 h-4 inline mr-2" />
                Confirm
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-3">
          {[
            { id: 'images', label: `Images (${images?.length || 0})` },
            { id: 'files', label: `Files (${files?.length || 0})` },
            { id: 'favicons', label: `Favicons (${assetsData.favicons?.length || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`py-2 px-4 rounded-full font-medium text-sm transition-all ${
                activeSection === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeSection === 'images' && renderImages()}
      {activeSection === 'files' && renderFiles()}
      {activeSection === 'favicons' && renderFavicons()}

      {assetsData.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error: {assetsData.error}</p>
        </div>
      )}
    </div>
  );
}
