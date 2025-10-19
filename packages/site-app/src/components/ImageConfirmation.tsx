import React, { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { CheckCircle, XCircle, RotateCcw, Edit3, Upload, Link as LinkIcon, Trash2 } from 'lucide-react';

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
  placement?: {
    zone: string;
    confidence: number;
    reasoning?: string;
  };
  source: 'extracted' | 'user-upload' | 'user-url';
  status: 'pending' | 'confirmed' | 'denied';
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

  // Combine extracted and user images
  const allImages = [...extractedImages.map((img: any) => ({
    ...img,
    source: 'extracted',
    status: 'pending'
  })), ...userImages];

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
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
    });
  }, []);

  const handleUrlImport = useCallback(() => {
    if (!urlInput.trim()) return;

    const newImage: ImageData = {
      id: `url-${Date.now()}`,
      src: urlInput,
      alt: 'Imported from URL',
      description: `Imported from: ${urlInput}`,
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
          {allImages.length} images total ({extractedImages.length} extracted, {userImages.length} added)
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
              allImages.map((image: ImageData, index: number) => (
                <tr key={image.id} className={`border-b border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <img
                      src={image.src}
                      alt={image.alt || 'Image'}
                      className="w-16 h-16 object-cover rounded border border-border"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyNEg0MFY0MEgyNFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">
                      {image.alt || `Image ${index + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {image.width && image.height ? `${image.width} × ${image.height}` : 'Unknown size'}
                      {image.format && ` • ${image.format.toUpperCase()}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 break-all max-w-xs">
                      {image.src}
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
                        {image.description || 'No description'}
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
                        {image.alt || 'No alt text'}
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
              onClick={() => allImages.forEach(img => handleConfirm(img.id))}
            >
              Confirm All
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setUserImages([]);
                allImages.filter(img => img.source === 'extracted').forEach(img => denyItem(`image-${img.id}`));
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