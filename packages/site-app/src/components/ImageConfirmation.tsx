import React, { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { CheckCircle, XCircle, RotateCcw, Edit3, Upload, Link as LinkIcon, Trash2 } from 'lucide-react';

// Image optimization utilities
const compressImage = (file: File, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const compressDataUrl = (dataUrl: string, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.src = dataUrl;
  });
};

const shortenUrl = (url: string, pageSlug?: string): string => {
  // Always prioritize showing the page where this image was found - much more useful!
  if (pageSlug) {
    return `From page: ${pageSlug}`;
  }
  
  // Fallback for images without page context
  if (url.startsWith('data:')) {
    // Don't show the actual data URL, just indicate it's a data URL
    return 'Data URL (embedded image)';
  }
  
  if (url.startsWith('blob:')) {
    return 'Local file';
  }
  
  if (url.startsWith('assets/') || url.includes('\\')) {
    const filename = url.split('/').pop() || url.split('\\').pop() || 'asset';
    return `Asset: ${filename}`;
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url);
      return `From: ${urlObj.hostname}`;
    } catch {
      return 'External image';
    }
  }
  
  return 'Image';
};

const getDisplayName = (image: ImageData, index: number): string => {
  // If it's a logo, use a friendly name
  if (image.placement?.zone === 'logo') {
    return 'Company Logo';
  }
  
  // If it has a meaningful alt text that's not a long URL
  if (image.alt && image.alt.length < 50 && !image.alt.startsWith('http')) {
    return image.alt;
  }
  
  // If it's from assets, extract filename
  if (image.src.startsWith('assets/') || image.src.includes('\\')) {
    const filename = image.src.split('/').pop() || image.src.split('\\').pop() || 'asset';
    return filename;
  }
  
  // If it's a data URL, use a generic name
  if (image.src.startsWith('data:')) {
    return 'Uploaded Image';
  }
  
  // If it's a long URL, create a meaningful name based on zone or index
  if (image.src.startsWith('http') && image.src.length > 50) {
    if (image.placement?.zone && image.placement.zone !== 'unknown') {
      return `${image.placement.zone.charAt(0).toUpperCase() + image.placement.zone.slice(1)} Image`;
    }
    return `Image ${index + 1}`;
  }
  
  // Default fallback
  return `Image ${index + 1}`;
};

const getCleanFormat = (image: ImageData): string => {
  // If format is a reasonable length and not a URL, use it
  if (image.format && image.format.length < 10 && !image.format.startsWith('http')) {
    return image.format.toUpperCase();
  }
  
  // Try to extract format from the src URL
  if (image.src) {
    // Check for common image extensions
    const url = image.src.toLowerCase();
    if (url.includes('.jpg') || url.includes('.jpeg')) return 'JPG';
    if (url.includes('.png')) return 'PNG';
    if (url.includes('.gif')) return 'GIF';
    if (url.includes('.webp')) return 'WEBP';
    if (url.includes('.svg')) return 'SVG';
    
    // Check if it's a data URL with format info
    if (url.startsWith('data:image/')) {
      const formatMatch = url.match(/data:image\/([^;]+)/);
      if (formatMatch && formatMatch[1]) {
        return formatMatch[1].toUpperCase();
      }
    }
  }
  
  // Default fallback
  return 'IMG';
};

// Utility function to normalize image URLs for different environments
const normalizeImageUrl = (url: string): string => {
  try {
    // If it's already a data URL or blob URL, return as-is
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // If it's a local file path (starts with assets/ or contains backslashes)
    if (url.startsWith('assets/') || url.includes('\\') || (!url.startsWith('http') && url.includes('/'))) {
      // In Electron app, this will be handled by loadImageAsDataUrl
      if (typeof window !== 'undefined' && window.SG?.loadImageAsDataUrl && typeof window.SG.loadImageAsDataUrl === 'function') {
        return url;
      }
      
      // In web development, use the Vite dev server proxy
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        // Convert local asset paths to dev server URLs
        if (url.startsWith('assets/')) {
          return `http://localhost:5173/assets/${url.replace('assets/', '')}`;
        }
        // Handle other local paths
        if (url.includes('\\') || (!url.startsWith('http') && url.includes('/'))) {
          return `http://localhost:5173/assets/${url}`;
        }
      }
      
      return url;
    }
    
    // If it's already a full HTTP/HTTPS URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative URL, try to make it absolute
    if (url.startsWith('/')) {
      // This is a relative path, we need more context to make it absolute
      return url;
    }
    
    return url;
  } catch (error) {
    console.warn('Failed to normalize image URL:', url, error);
    return url;
  }
};

interface ImageConfirmationProps {
  page: any;
  confirmItem: (fieldId: string) => void;
  retryItem: (fieldId: string) => void;
  editItem: (fieldId: string) => void;
  denyItem: (fieldId: string) => void;
  getConfirmationState: (fieldId: string) => string;
}

interface ImageData {
  id: string;
  src: string;
  alt?: string;
  description?: string;
  width?: number;
  height?: number;
  format?: string;
  pageSlug?: string;
  placement?: {
    zone: string;
    confidence: number;
    reasoning?: string;
  };
  source: 'extracted' | 'user-upload' | 'user-url';
  status: 'pending' | 'confirmed' | 'denied';
  displaySrc?: string;
  originalSrc?: string;
}

export const ImageConfirmation: React.FC<ImageConfirmationProps> = ({
  page,
  confirmItem,
  retryItem,
  editItem,
  denyItem,
  getConfirmationState
}) => {
  const extractedImages = page?.images?.value || [];
  const [userImages, setUserImages] = useState<ImageData[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ImageData>>({});

  // State for compressed images
  const [compressedImages, setCompressedImages] = useState<Map<string, string>>(new Map());

  // Combine extracted and user images with normalized URLs
  const allImages = [...extractedImages.map((img: any) => ({
    ...img,
    src: normalizeImageUrl(img.src || ''),
    source: 'extracted',
    status: 'pending'
  })), ...userImages.map(img => ({
    ...img,
    src: normalizeImageUrl(img.src || '')
  }))];

  // Immediately compress any data URLs and replace them
  const processedImages = allImages.map(image => {
    if (image.src.startsWith('data:') && image.src.length > 500) {
      // This is a base64 URL - compress it immediately for better performance
      return {
        ...image,
        src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Db21wcmVzc2luZy4uLjwvdGV4dD4KPC9zdmc+',
        originalSrc: image.src, // Store original for compression
        displaySrc: 'Data URL (embedded image)' // Use this for display purposes
      };
    }
    return image;
  });

  // Compress images on load
  React.useEffect(() => {
    const compressImages = async () => {
      const newCompressed = new Map(compressedImages);
      
      for (const image of processedImages) {
        if (image.originalSrc && !compressedImages.has(image.id)) {
          try {
            // Compress the original massive URL to a reasonable size
            const compressed = await compressDataUrl(image.originalSrc, 150, 150, 0.7);
            newCompressed.set(image.id, compressed);
            console.log(`Compressed image ${image.id}: ${image.originalSrc.length} -> ${compressed.length} chars (${Math.round((1 - compressed.length/image.originalSrc.length) * 100)}% reduction)`);
          } catch (error) {
            console.warn('Failed to compress image:', image.id, error);
            // Keep the placeholder - don't show the massive data URL
          }
        }
      }
      
      if (newCompressed.size !== compressedImages.size) {
        setCompressedImages(newCompressed);
      }
    };
    
    compressImages();
  }, [processedImages.length]); // Only depend on length to avoid infinite loops

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          // Compress the image before storing
          const compressedSrc = await compressImage(file, 150, 150, 0.7);
          
          const newImage: ImageData = {
            id: `user-${Date.now()}-${Math.random()}`,
            src: compressedSrc,
            alt: file.name,
            description: `User uploaded: ${file.name}`,
            format: file.type.split('/')[1],
            placement: {
              zone: 'unknown',
              confidence: 1.0,
              reasoning: 'User uploaded image'
            },
            source: 'user-upload',
            status: 'pending'
          };
          setUserImages(prev => [...prev, newImage]);
        } catch (error) {
          console.error('Failed to compress image:', error);
          // Fallback to original method if compression fails
          const reader = new FileReader();
          reader.onload = (e) => {
            const newImage: ImageData = {
              id: `user-${Date.now()}-${Math.random()}`,
              src: e.target?.result as string,
              alt: file.name,
              description: `User uploaded: ${file.name}`,
              format: file.type.split('/')[1],
              placement: {
                zone: 'unknown',
                confidence: 1.0,
                reasoning: 'User uploaded image'
              },
              source: 'user-upload',
              status: 'pending'
            };
            setUserImages(prev => [...prev, newImage]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const handleUrlImport = useCallback(() => {
    if (!urlInput.trim()) return;

    // Basic URL validation
    try {
      const url = new URL(urlInput);
      if (!['http:', 'https:'].includes(url.protocol)) {
        alert('Please enter a valid HTTP or HTTPS URL');
        return;
      }
      
      // Check if it looks like an image URL
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => 
        url.pathname.toLowerCase().includes(ext)
      );
      
      if (!hasImageExtension && !urlInput.includes('image') && !urlInput.includes('photo')) {
        const confirmImport = confirm(
          'This URL doesn\'t appear to be an image. Do you want to import it anyway?'
        );
        if (!confirmImport) return;
      }
    } catch (error) {
      alert('Please enter a valid URL (e.g., https://example.com/image.jpg)');
      return;
    }

    const newImage: ImageData = {
      id: `url-${Date.now()}`,
      src: urlInput,
      alt: 'Imported from URL',
      description: `Imported from: ${urlInput.length > 60 ? `${urlInput.substring(0, 57)}...` : urlInput}`,
      placement: {
        zone: 'unknown',
        confidence: 1.0,
        reasoning: 'User imported from URL'
      },
      source: 'user-url',
      status: 'pending'
    };
    setUserImages(prev => [...prev, newImage]);
    setUrlInput('');
  }, [urlInput]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleConfirm = (imageId: string) => {
    if (imageId.startsWith('user-') || imageId.startsWith('url-')) {
      setUserImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, status: 'confirmed' } : img
      ));
    } else {
      confirmItem(`image-${imageId}`);
    }
  };

  const handleDeny = (imageId: string) => {
    if (imageId.startsWith('user-') || imageId.startsWith('url-')) {
      setUserImages(prev => prev.filter(img => img.id !== imageId));
    } else {
      denyItem(`image-${imageId}`);
    }
  };

  const handleEdit = (image: ImageData) => {
    setEditingImage(image.id);
    setEditValues({
      alt: image.alt,
      description: image.description,
      placement: image.placement
    });
  };

  const handleSaveEdit = (imageId: string) => {
    if (imageId.startsWith('user-') || imageId.startsWith('url-')) {
      setUserImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, ...editValues } : img
      ));
    }
    setEditingImage(null);
    setEditValues({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-success';
      case 'denied':
        return 'text-destructive';
      case 'pending':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <RotateCcw className="w-4 h-4 text-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Image Confirmation</h2>
        <div className="text-sm text-muted-foreground">
          {processedImages.length} images total ({extractedImages.length} extracted, {userImages.length} added)
          {compressedImages.size > 0 && (
            <span className="ml-2 text-success">• {compressedImages.size} optimized</span>
          )}
        </div>
      </div>

      {/* Upload and Import Section */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Add Images</h3>
          <div className="flex items-center space-x-2">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button variant="default" size="md" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload Images</span>
              </Button>
            </label>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-foreground mb-2">Drag and drop images here</p>
          <p className="text-sm text-muted-foreground">or click the Upload Images button above</p>
        </div>

        {/* URL Import */}
        <div className="flex items-center space-x-2">
          <LinkIcon className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Import image from URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUrlImport()}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button onClick={handleUrlImport} variant="outline" size="md">
            Import
          </Button>
        </div>
      </div>

      {/* Images Table - Always show the table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">PREVIEW</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">FILE NAME</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">PAGE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">ZONE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">DESCRIPTION</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">ALT</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">SOURCE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">CONFIDENCE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">STATUS</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {allImages.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  No images found. Upload or import images above to get started.
                </td>
              </tr>
            ) : (
              processedImages.map((image: ImageData, index: number) => (
                <tr key={image.id} className={`border-b border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <div className="relative group">
                      <img
                        src={compressedImages.get(image.id) || image.src}
                        alt={image.alt || 'Image'}
                        className="w-32 h-32 object-contain rounded border border-border cursor-pointer hover:scale-105 transition-transform bg-muted/20"
                        onError={async (e) => {
                          console.error('Failed to load image:', image.src);
                          const target = e.currentTarget;
                          
                          // Try to load as data URL if it's a local file and we're in Electron
                          if (image.src.startsWith('assets/') && typeof window !== 'undefined' && window.SG?.loadImageAsDataUrl) {
                            try {
                              console.log('Attempting to load local image as data URL:', image.src);
                              const dataUrl = await window.SG.loadImageAsDataUrl(image.src);
                              if (dataUrl) {
                                target.src = dataUrl;
                                console.log('Successfully loaded local image as data URL');
                                return;
                              }
                            } catch (err) {
                              console.warn('Failed to load as data URL:', err);
                            }
                          }
                          
                          // Fallback to placeholder
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00OCA0OEg4MFY4MEg0OFY0OFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                        }}
                        onLoad={() => {
                          console.log('Successfully loaded image:', image.src);
                        }}
                        onClick={() => {
                          // Open original image in new tab/window for full view
                          window.open(image.src, '_blank');
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center transition-all">
                        <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view full size
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">
                      {getDisplayName(image, index)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {image.width && image.height ? `${image.width} × ${image.height}` : 'Unknown size'}
                      {` • ${getCleanFormat(image)}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {image.pageSlug ? `From page: ${image.pageSlug}` : 'From: home'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">
                      {image.pageSlug || 'home'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingImage === image.id ? (
                      <select
                        value={editValues.placement?.zone || 'unknown'}
                        onChange={(e) => setEditValues({ 
                          ...editValues, 
                          placement: { ...editValues.placement!, zone: e.target.value }
                        })}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                      >
                        <option value="hero">Hero</option>
                        <option value="logo">Logo</option>
                        <option value="gallery">Gallery</option>
                        <option value="service">Service</option>
                        <option value="team">Team</option>
                        <option value="testimonial">Testimonial</option>
                        <option value="product">Product</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    ) : (
                      <span className="text-sm text-foreground capitalize">
                        {image.placement?.zone || 'unknown'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingImage === image.id ? (
                      <input
                        type="text"
                        value={editValues.description || ''}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground max-w-md break-all">
                        {image.description && image.description.length > 100 
                          ? `${image.description.substring(0, 97)}...` 
                          : (image.description || 'No description')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingImage === image.id ? (
                      <input
                        type="text"
                        value={editValues.alt || ''}
                        onChange={(e) => setEditValues({ ...editValues, alt: e.target.value })}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                      />
                    ) : (
                      <div className="text-sm text-foreground">
                        {image.alt && image.alt.length < 50 && !image.alt.startsWith('http') 
                          ? image.alt 
                          : 'No alt text'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      image.source === 'extracted' ? 'bg-blue-500/20 text-blue-400' :
                      image.source === 'user-upload' ? 'bg-green-500/20 text-green-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {image.source === 'extracted' ? 'Extracted' :
                       image.source === 'user-upload' ? 'Uploaded' : 'URL'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getConfidenceColor(image.placement?.confidence || 0)}`}>
                      {Math.round((image.placement?.confidence || 0) * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusIcon(image.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      {editingImage === image.id ? (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleSaveEdit(image.id)}
                        >
                          Save
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleConfirm(image.id)}
                            title="Confirm"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(image)}
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeny(image.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      {allImages.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="success"
              size="md"
              onClick={() => processedImages.forEach(img => handleConfirm(img.id))}
            >
              Confirm All
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setUserImages([]);
                processedImages.filter(img => img.source === 'extracted').forEach(img => denyItem(`image-${img.id}`));
              }}
            >
              Clear All
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {allImages.filter((img: ImageData) => img.status === 'confirmed').length} confirmed
          </div>
        </div>
      )}
    </div>
  );
};