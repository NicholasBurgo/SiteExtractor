import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  ExternalLink,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'
import { ImageData, ImageUpload } from '../types'
import { toast } from 'react-hot-toast'

export function ImageManager() {
  const { 
    pages, 
    userImages, 
    confirmationStates, 
    updateImage, 
    addUserImage, 
    removeImage,
    setConfirmationState,
    bulkAction,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    groupBy,
    setGroupBy
  } = useDataStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterZone, setFilterZone] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingImage, setEditingImage] = useState<ImageData | null>(null)

  // Get all images from pages and user images
  const allImages = [
    ...pages.flatMap(page => page.images.map(img => ({ ...img, pageSlug: page.slug }))),
    ...userImages
  ]

  // Filter images
  const filteredImages = allImages.filter(img => {
    const matchesSearch = img.alt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.src.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesZone = filterZone === 'all' || img.placement.zone === filterZone
    const matchesSource = filterSource === 'all' || img.source === filterSource
    
    return matchesSearch && matchesZone && matchesSource
  })

  // Group images
  const groupedImages = filteredImages.reduce((groups, img) => {
    const key = groupBy === 'page' ? img.pageSlug :
                groupBy === 'zone' ? img.placement.zone :
                groupBy === 'confidence' ? Math.floor(img.placement.confidence * 10) / 10 :
                img.source
    
    if (!groups[key]) groups[key] = []
    groups[key].push(img)
    return groups
  }, {} as Record<string, ImageData[]>)

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          const newImage: ImageData = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pageSlug: 'user-uploads',
            src: reader.result as string,
            alt: file.name,
            description: '',
            placement: {
              zone: 'unknown',
              confidence: 1.0,
              reasoning: 'User uploaded'
            },
            source: 'user_local',
            license: 'unknown'
          }
          addUserImage(newImage)
        }
        reader.readAsDataURL(file)
      }
    })
  }, [addUserImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg']
    }
  })

  // Handle URL import
  const handleUrlImport = (url: string) => {
    if (url) {
      const newImage: ImageData = {
        id: `user-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pageSlug: 'user-uploads',
        src: url,
        alt: '',
        description: '',
        placement: {
          zone: 'unknown',
          confidence: 1.0,
          reasoning: 'User provided URL'
        },
        source: 'user_url',
        license: 'unknown'
      }
      addUserImage(newImage)
      setShowUploadModal(false)
    }
  }

  // Handle image actions
  const handleConfirm = (id: string) => {
    setConfirmationState(id, { confirmed: true, denied: false })
    toast.success('Image confirmed')
  }

  const handleDeny = (id: string) => {
    setConfirmationState(id, { denied: true, confirmed: false })
    toast.success('Image denied')
  }

  const handleEdit = (image: ImageData) => {
    setEditingImage(image)
  }

  const handleDelete = (id: string) => {
    removeImage(id)
  }

  // Handle bulk actions
  const handleBulkConfirm = () => {
    bulkAction('confirm', selectedItems)
    clearSelection()
  }

  const handleBulkDeny = () => {
    bulkAction('deny', selectedItems)
    clearSelection()
  }

  const handleBulkSetZone = (zone: string) => {
    bulkAction('set-zone', selectedItems, zone)
    clearSelection()
  }

  const handleBulkSetLicense = (license: string) => {
    bulkAction('set-license', selectedItems, license)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Image Manager</h1>
          <p className="text-text/60 mt-2">
            Review, edit, and manage extracted images
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Images
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/60" />
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Zone Filter */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="input"
          >
            <option value="all">All Zones</option>
            <option value="hero">Hero</option>
            <option value="logo">Logo</option>
            <option value="navbar">Navbar</option>
            <option value="gallery">Gallery</option>
            <option value="service">Service</option>
            <option value="product">Product</option>
            <option value="menu_item">Menu Item</option>
            <option value="testimonial">Testimonial</option>
            <option value="team">Team</option>
            <option value="cta">CTA</option>
            <option value="map">Map</option>
            <option value="inline">Inline</option>
            <option value="unknown">Unknown</option>
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="input"
          >
            <option value="all">All Sources</option>
            <option value="extracted">Extracted</option>
            <option value="user_local">User Local</option>
            <option value="user_url">User URL</option>
          </select>

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="input"
          >
            <option value="page">Group by Page</option>
            <option value="zone">Group by Zone</option>
            <option value="confidence">Group by Confidence</option>
            <option value="source">Group by Source</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text">
                {selectedItems.length} items selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkConfirm}
                  className="btn btn-success text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirm
                </button>
                <button
                  onClick={handleBulkDeny}
                  className="btn btn-danger text-sm"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Deny
                </button>
                <select
                  onChange={(e) => handleBulkSetZone(e.target.value)}
                  className="input text-sm"
                  defaultValue=""
                >
                  <option value="">Set Zone</option>
                  <option value="hero">Hero</option>
                  <option value="logo">Logo</option>
                  <option value="navbar">Navbar</option>
                  <option value="gallery">Gallery</option>
                  <option value="service">Service</option>
                  <option value="product">Product</option>
                  <option value="menu_item">Menu Item</option>
                  <option value="testimonial">Testimonial</option>
                  <option value="team">Team</option>
                  <option value="cta">CTA</option>
                  <option value="map">Map</option>
                  <option value="inline">Inline</option>
                </select>
                <select
                  onChange={(e) => handleBulkSetLicense(e.target.value)}
                  className="input text-sm"
                  defaultValue=""
                >
                  <option value="">Set License</option>
                  <option value="unknown">Unknown</option>
                  <option value="provided">Provided</option>
                  <option value="free_commercial">Free Commercial</option>
                </select>
                <button
                  onClick={clearSelection}
                  className="btn btn-secondary text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Images Grid */}
      <div className="space-y-6">
        {Object.entries(groupedImages).map(([groupKey, images]) => (
          <div key={groupKey} className="card">
            <h3 className="text-lg font-semibold text-text mb-4">
              {groupBy === 'page' ? `Page: ${groupKey}` :
               groupBy === 'zone' ? `Zone: ${groupKey}` :
               groupBy === 'confidence' ? `Confidence: ${groupKey}` :
               `Source: ${groupKey}`} ({images.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((image) => {
                const state = confirmationStates[image.id] || {}
                return (
                  <div
                    key={image.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      selectedItems.includes(image.id)
                        ? 'border-accent ring-2 ring-accent/20'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-square bg-surface">
                      <img
                        src={image.src}
                        alt={image.alt || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDE5VjVjMC0xLjEtLjktMi0yLTJINWMtMS4xIDAtMiAuOS0yIDJ2MTRjMCAxLjEuOSAyIDIgMmgxNGMxLjEgMCAyLS45IDItMnoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTguNSAxMy41bDIuNSAzIDMuNS00LjUgNC41IDZINiIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K'
                        }}
                      />
                      
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(image.id)}
                        onChange={() => toggleSelection(image.id)}
                        className="absolute top-2 left-2 w-4 h-4 text-accent bg-surface border-border rounded focus:ring-accent"
                      />
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        {state.confirmed && (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                        {state.denied && (
                          <XCircle className="h-5 w-5 text-error" />
                        )}
                        {!state.confirmed && !state.denied && (
                          <Clock className="h-5 w-5 text-warning" />
                        )}
                      </div>
                    </div>
                    
                    {/* Image Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                          {image.placement.zone}
                        </span>
                        <span className="text-xs text-text/60">
                          {Math.round(image.placement.confidence * 100)}%
                        </span>
                      </div>
                      
                      <p className="text-sm text-text font-medium truncate">
                        {image.alt || 'No alt text'}
                      </p>
                      
                      <p className="text-xs text-text/60 truncate">
                        {image.src.split('/').pop()}
                      </p>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleConfirm(image.id)}
                            className="p-1 text-success hover:bg-success/10 rounded"
                            title="Confirm"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeny(image.id)}
                            className="p-1 text-error hover:bg-error/10 rounded"
                            title="Deny"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(image)}
                            className="p-1 text-accent hover:bg-accent/10 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => window.open(image.src, '_blank')}
                            className="p-1 text-text/60 hover:bg-surface rounded"
                            title="View Full Size"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(image.id)}
                            className="p-1 text-error hover:bg-error/10 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text mb-4">Add Images</h3>
            
            {/* Drag and Drop */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive ? 'border-accent bg-accent/10' : 'border-border'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-text/60 mx-auto mb-4" />
              <p className="text-text">
                {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
              </p>
              <p className="text-text/60 text-sm mt-2">
                or click to select files
              </p>
            </div>
            
            {/* URL Import */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-text mb-2">
                Or import from URL:
              </label>
              <div className="flex">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  className="input flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlImport(e.currentTarget.value)
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="url"]') as HTMLInputElement
                    if (input?.value) {
                      handleUrlImport(input.value)
                    }
                  }}
                  className="btn btn-primary ml-2"
                >
                  Import
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingImage && (
        <ImageEditModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={(updates) => {
            updateImage(editingImage.id, updates)
            setEditingImage(null)
          }}
        />
      )}
    </div>
  )
}

// Image Edit Modal Component
function ImageEditModal({ 
  image, 
  onClose, 
  onSave 
}: { 
  image: ImageData
  onClose: () => void
  onSave: (updates: Partial<ImageData>) => void
}) {
  const [formData, setFormData] = useState({
    alt: image.alt || '',
    description: image.description || '',
    placement: {
      zone: image.placement.zone,
      targetRefId: image.placement.targetRefId || '',
      reasoning: image.placement.reasoning || ''
    },
    license: image.license || 'unknown',
    attribution: image.attribution || ''
  })

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-text mb-4">Edit Image</h3>
        
        <div className="space-y-4">
          {/* Alt Text */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Alt Text
            </label>
            <input
              type="text"
              value={formData.alt}
              onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
              className="input w-full"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full h-20 resize-none"
            />
          </div>
          
          {/* Placement Zone */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Placement Zone
            </label>
            <select
              value={formData.placement.zone}
              onChange={(e) => setFormData({ 
                ...formData, 
                placement: { ...formData.placement, zone: e.target.value as any }
              })}
              className="input w-full"
            >
              <option value="hero">Hero</option>
              <option value="logo">Logo</option>
              <option value="navbar">Navbar</option>
              <option value="gallery">Gallery</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
              <option value="menu_item">Menu Item</option>
              <option value="testimonial">Testimonial</option>
              <option value="team">Team</option>
              <option value="cta">CTA</option>
              <option value="map">Map</option>
              <option value="inline">Inline</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          
          {/* License */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              License
            </label>
            <select
              value={formData.license}
              onChange={(e) => setFormData({ ...formData, license: e.target.value as any })}
              className="input w-full"
            >
              <option value="unknown">Unknown</option>
              <option value="provided">Provided</option>
              <option value="free_commercial">Free Commercial</option>
            </select>
          </div>
          
          {/* Attribution */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Attribution
            </label>
            <input
              type="text"
              value={formData.attribution}
              onChange={(e) => setFormData({ ...formData, attribution: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

