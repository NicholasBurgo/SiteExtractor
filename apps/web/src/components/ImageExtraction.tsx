import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePreview {
  url: string;
  filename: string;
  domain: string;
  preview_available: boolean;
  thumbnail_url: string | null;
  dimensions: any;
  file_size: any;
  colors: any;
}

interface ImageData {
  url: string;
  alt_text: string;
  title: string;
  width: string;
  height: string;
  type: string;
  preview: ImagePreview;
  metadata: any;
}

interface PageData {
  title: string;
  url: string;
  images: ImageData[];
  is_main_page: boolean;
}

interface LogoData {
  url: string;
  confidence: number;
  source: string;
  preview: ImagePreview;
  metadata: any;
}

interface ImageExtractionData {
  logo?: LogoData;
  pages: { [url: string]: PageData };
  total_images: number;
  extraction_date: string;
  base_url: string;
}

interface ImageExtractionProps {
  url: string;
  onExtract: (url: string, maxPages?: number) => Promise<void>;
  isLoading: boolean;
}

export function ImageExtraction({ url, onExtract, isLoading }: ImageExtractionProps) {
  const [extractionData, setExtractionData] = useState<ImageExtractionData | null>(null);
  const [maxPages, setMaxPages] = useState(5);
  const [uploadUrls, setUploadUrls] = useState<string[]>(['']);
  const [isUploading, setIsUploading] = useState(false);

  const handleExtract = async () => {
    try {
      await onExtract(url, maxPages);
      // The parent component should handle updating the extraction data
    } catch (error) {
      toast.error('Failed to extract images');
    }
  };

  const handleUploadImages = async () => {
    if (!extractionData) return;

    const validUrls = uploadUrls.filter(url => url.trim() && isValidUrl(url.trim()));
    if (validUrls.length === 0) {
      toast.error('Please enter at least one valid image URL');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`/api/image-extraction/${getRunId()}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: validUrls.map(url => ({
            url: url.trim(),
            type: 'uploaded'
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Added ${result.data.added_images} images`);
        
        // Refresh the extraction data
        await loadExtractionData();
        setUploadUrls(['']);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload images');
      }
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const loadExtractionData = async () => {
    try {
      const response = await fetch(`/api/image-extraction/${getRunId()}`);
      if (response.ok) {
        const result = await response.json();
        setExtractionData(result.data);
      }
    } catch (error) {
      console.error('Failed to load extraction data:', error);
    }
  };

  const getRunId = () => {
    // This should be passed from the parent component or extracted from the current state
    return 'current-run-id'; // Placeholder
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const addUploadField = () => {
    setUploadUrls([...uploadUrls, '']);
  };

  const removeUploadField = (index: number) => {
    setUploadUrls(uploadUrls.filter((_, i) => i !== index));
  };

  const updateUploadUrl = (index: number, value: string) => {
    const newUrls = [...uploadUrls];
    newUrls[index] = value;
    setUploadUrls(newUrls);
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Image Extraction</h2>
          <p className="text-muted-foreground">
            Extract and organize images from websites
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="maxPages">Max Pages:</Label>
            <Input
              id="maxPages"
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value) || 5)}
              className="w-20"
              min="1"
              max="10"
            />
          </div>
          <Button onClick={handleExtract} disabled={isLoading}>
            {isLoading ? 'Extracting...' : 'Extract Images'}
          </Button>
        </div>
      </div>

      {extractionData && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{extractionData.total_images}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pages Scanned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(extractionData.pages).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Logo Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {extractionData.logo ? 'Yes' : 'No'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Extraction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Base URL:</strong> {extractionData.base_url}</p>
                  <p><strong>Extraction Date:</strong> {new Date(extractionData.extraction_date).toLocaleString()}</p>
                  <p><strong>Total Images:</strong> {extractionData.total_images}</p>
                  <p><strong>Pages:</strong> {Object.keys(extractionData.pages).length}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logo" className="space-y-4">
            {extractionData.logo ? (
              <Card>
                <CardHeader>
                  <CardTitle>Website Logo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={extractionData.logo.url}
                      alt="Logo"
                      className="w-32 h-32 object-contain border rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="space-y-2">
                      <p><strong>Confidence:</strong> {(extractionData.logo.confidence * 100).toFixed(1)}%</p>
                      <p><strong>Source:</strong> {extractionData.logo.source}</p>
                      <p><strong>URL:</strong> 
                        <a 
                          href={extractionData.logo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          <ExternalLink className="inline w-4 h-4" />
                        </a>
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => downloadImage(extractionData.logo!.url, 'logo')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Logo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No logo found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pages" className="space-y-4">
            {Object.entries(extractionData.pages).map(([pageUrl, pageData]) => (
              <Card key={pageUrl}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {pageData.title}
                    {pageData.is_main_page && <Badge variant="secondary">Main Page</Badge>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {pageUrl}
                    </a>
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageData.images.map((image, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <img
                          src={image.url}
                          alt={image.alt_text || 'Image'}
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{image.type}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadImage(image.url, image.preview.filename)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                          {image.alt_text && (
                            <p className="text-xs text-muted-foreground">{image.alt_text}</p>
                          )}
                          {image.title && (
                            <p className="text-xs font-medium">{image.title}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Additional Images</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add more images to your extraction by providing image URLs
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Enter image URL"
                      value={url}
                      onChange={(e) => updateUploadUrl(index, e.target.value)}
                    />
                    {uploadUrls.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUploadField(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addUploadField}>
                    Add URL
                  </Button>
                  <Button 
                    onClick={handleUploadImages} 
                    disabled={isUploading}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
