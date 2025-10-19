import { create } from 'zustand'
import { PackBundle, ImageData, ConfirmationState, ImageUpload } from './types'
import { toast } from 'react-hot-toast'

interface DataStore {
  // Data
  pages: PackBundle[]
  currentPage: PackBundle | null
  userImages: ImageData[]
  confirmationStates: Record<string, ConfirmationState>
  
  // UI State
  isLoading: boolean
  selectedItems: string[]
  groupBy: 'page' | 'zone' | 'confidence' | 'source'
  filters: Record<string, any>
  sortBy: { field: string; direction: 'asc' | 'desc' }
  
  // Actions
  loadExtractionData: () => Promise<void>
  setCurrentPage: (page: PackBundle) => void
  updateImage: (id: string, updates: Partial<ImageData>) => void
  addUserImage: (image: ImageData) => void
  removeImage: (id: string) => void
  setConfirmationState: (id: string, state: Partial<ConfirmationState>) => void
  bulkAction: (action: string, items: string[], value?: any) => void
  setGroupBy: (groupBy: 'page' | 'zone' | 'confidence' | 'source') => void
  setFilters: (filters: Record<string, any>) => void
  setSortBy: (field: string, direction: 'asc' | 'desc') => void
  clearSelection: () => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  exportData: (options: any) => Promise<void>
}

export const useDataStore = create<DataStore>((set, get) => ({
  // Initial state
  pages: [],
  currentPage: null,
  userImages: [],
  confirmationStates: {},
  isLoading: false,
  selectedItems: [],
  groupBy: 'page',
  filters: {},
  sortBy: { field: 'id', direction: 'asc' },

  // Load extraction data
  loadExtractionData: async () => {
    set({ isLoading: true })
    try {
      // In a real app, this would fetch from the extraction output
      // For now, we'll simulate loading data
      const response = await fetch('/api/extraction-data')
      if (response.ok) {
        const data = await response.json()
        set({ pages: data.pages || [] })
      } else {
        // Fallback: try to load from local files
        const pages = await loadPagesFromFiles()
        set({ pages })
      }
    } catch (error) {
      console.error('Failed to load extraction data:', error)
      // Try to load from local files as fallback
      try {
        const pages = await loadPagesFromFiles()
        set({ pages })
      } catch (fallbackError) {
        console.error('Fallback loading also failed:', fallbackError)
        throw fallbackError
      }
    } finally {
      set({ isLoading: false })
    }
  },

  // Set current page
  setCurrentPage: (page: PackBundle) => {
    set({ currentPage: page })
  },

  // Update image
  updateImage: (id: string, updates: Partial<ImageData>) => {
    const { pages, currentPage } = get()
    
    // Update in pages
    const updatedPages = pages.map(page => ({
      ...page,
      images: page.images.map(img => 
        img.id === id ? { ...img, ...updates } : img
      )
    }))
    
    // Update current page if it exists
    const updatedCurrentPage = currentPage ? {
      ...currentPage,
      images: currentPage.images.map(img => 
        img.id === id ? { ...img, ...updates } : img
      )
    } : null
    
    set({ pages: updatedPages, currentPage: updatedCurrentPage })
    toast.success('Image updated successfully')
  },

  // Add user image
  addUserImage: (image: ImageData) => {
    const { userImages } = get()
    set({ userImages: [...userImages, image] })
    toast.success('Image added successfully')
  },

  // Remove image
  removeImage: (id: string) => {
    const { pages, currentPage, userImages } = get()
    
    // Remove from pages
    const updatedPages = pages.map(page => ({
      ...page,
      images: page.images.filter(img => img.id !== id)
    }))
    
    // Remove from current page
    const updatedCurrentPage = currentPage ? {
      ...currentPage,
      images: currentPage.images.filter(img => img.id !== id)
    } : null
    
    // Remove from user images
    const updatedUserImages = userImages.filter(img => img.id !== id)
    
    set({ 
      pages: updatedPages, 
      currentPage: updatedCurrentPage,
      userImages: updatedUserImages
    })
    toast.success('Image removed successfully')
  },

  // Set confirmation state
  setConfirmationState: (id: string, state: Partial<ConfirmationState>) => {
    const { confirmationStates } = get()
    set({
      confirmationStates: {
        ...confirmationStates,
        [id]: { ...confirmationStates[id], ...state }
      }
    })
  },

  // Bulk action
  bulkAction: (action: string, items: string[], value?: any) => {
    const { pages, currentPage, confirmationStates } = get()
    
    switch (action) {
      case 'confirm':
        const updatedStates = { ...confirmationStates }
        items.forEach(id => {
          updatedStates[id] = { ...updatedStates[id], confirmed: true, denied: false }
        })
        set({ confirmationStates: updatedStates })
        toast.success(`Confirmed ${items.length} items`)
        break
        
      case 'deny':
        const deniedStates = { ...confirmationStates }
        items.forEach(id => {
          deniedStates[id] = { ...deniedStates[id], denied: true, confirmed: false }
        })
        set({ confirmationStates: deniedStates })
        toast.success(`Denied ${items.length} items`)
        break
        
      case 'set-zone':
        const updatedPages = pages.map(page => ({
          ...page,
          images: page.images.map(img => 
            items.includes(img.id) ? { ...img, placement: { ...img.placement, zone: value } } : img
          )
        }))
        set({ pages: updatedPages })
        toast.success(`Updated zone for ${items.length} images`)
        break
        
      case 'set-license':
        const licensedPages = pages.map(page => ({
          ...page,
          images: page.images.map(img => 
            items.includes(img.id) ? { ...img, license: value } : img
          )
        }))
        set({ pages: licensedPages })
        toast.success(`Updated license for ${items.length} images`)
        break
    }
  },

  // Set group by
  setGroupBy: (groupBy: 'page' | 'zone' | 'confidence' | 'source') => {
    set({ groupBy })
  },

  // Set filters
  setFilters: (filters: Record<string, any>) => {
    set({ filters })
  },

  // Set sort by
  setSortBy: (field: string, direction: 'asc' | 'desc') => {
    set({ sortBy: { field, direction } })
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedItems: [] })
  },

  // Toggle selection
  toggleSelection: (id: string) => {
    const { selectedItems } = get()
    const newSelection = selectedItems.includes(id)
      ? selectedItems.filter(item => item !== id)
      : [...selectedItems, id]
    set({ selectedItems: newSelection })
  },

  // Select all
  selectAll: () => {
    const { pages } = get()
    const allImageIds = pages.flatMap(page => page.images.map(img => img.id))
    set({ selectedItems: allImageIds })
  },

  // Export data
  exportData: async (options: any) => {
    const { pages, userImages } = get()
    
    try {
      const exportData = {
        pages: pages.map(page => ({
          ...page,
          images: page.images.filter(img => 
            get().confirmationStates[img.id]?.confirmed
          )
        })),
        userImages: userImages.filter(img => 
          get().confirmationStates[img.id]?.confirmed
        ),
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      }
      
      // Save as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `site-generator-bundle-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed')
    }
  }
}))

// Helper function to load pages from files
async function loadPagesFromFiles(): Promise<PackBundle[]> {
  try {
    // Try to load from the extraction output directory
    const response = await fetch('/api/extraction-data')
    if (response.ok) {
      const data = await response.json()
      return data.pages || []
    }
  } catch (error) {
    console.warn('API endpoint not available, trying file system')
  }

  // Try to load from site-app output directory
  try {
    const response = await fetch('/api/site-app-data')
    if (response.ok) {
      const data = await response.json()
      return data.pages || []
    }
  } catch (error) {
    console.warn('Site-app API endpoint not available')
  }

  // Fallback: generate sample data for testing
  return generateSampleData()
}

// Generate sample data for testing
function generateSampleData(): PackBundle[] {
  const sampleImages: ImageData[] = [
    {
      id: 'sample-1',
      pageSlug: 'home',
      src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      alt: 'Lawn care service',
      description: 'Professional lawn care and maintenance services',
      width: 800,
      height: 600,
      aspect: 1.33,
      placement: {
        zone: 'hero',
        confidence: 0.95,
        reasoning: 'Large image in hero section with lawn care keywords'
      },
      source: 'extracted',
      license: 'unknown'
    },
    {
      id: 'sample-2',
      pageSlug: 'home',
      src: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop',
      alt: 'Company logo',
      description: 'Tula\'s Lawn Service LLC logo',
      width: 200,
      height: 200,
      aspect: 1.0,
      placement: {
        zone: 'logo',
        confidence: 0.88,
        reasoning: 'Square image in header with logo class'
      },
      source: 'extracted',
      license: 'unknown'
    },
    {
      id: 'sample-3',
      pageSlug: 'services',
      src: 'https://images.unsplash.com/photo-1581578731548-c6a0c3f2f2c0?w=400&h=300&fit=crop',
      alt: 'Lawn mowing service',
      description: 'Professional lawn mowing and trimming',
      width: 400,
      height: 300,
      aspect: 1.33,
      placement: {
        zone: 'service',
        confidence: 0.82,
        reasoning: 'Service-related image with mowing equipment'
      },
      source: 'extracted',
      license: 'unknown'
    },
    {
      id: 'sample-4',
      pageSlug: 'about',
      src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      alt: 'Team member',
      description: 'Professional team member',
      width: 150,
      height: 150,
      aspect: 1.0,
      placement: {
        zone: 'team',
        confidence: 0.75,
        reasoning: 'Square portrait image in team section'
      },
      source: 'extracted',
      license: 'unknown'
    }
  ]

  const sampleParagraphs: ParagraphData[] = [
    {
      text: 'Welcome to Tula\'s Lawn Service LLC, your trusted partner for professional lawn care and landscaping services.',
      type: 'paragraph',
      wordCount: 18
    },
    {
      text: 'Our Services',
      type: 'heading',
      level: 2,
      wordCount: 2
    },
    {
      text: 'We offer comprehensive lawn care services including mowing, trimming, edging, and seasonal maintenance.',
      type: 'paragraph',
      wordCount: 16
    },
    {
      text: '• Weekly lawn mowing\n• Hedge trimming\n• Leaf removal\n• Spring cleanup',
      type: 'list',
      wordCount: 8
    }
  ]

  const sampleNavbar: NavbarItem[] = [
    { text: 'Home', href: '/', isExternal: false, depth: 0 },
    { text: 'Services', href: '/services', isExternal: false, depth: 0 },
    { text: 'About', href: '/about', isExternal: false, depth: 0 },
    { text: 'Contact', href: '/contact', isExternal: false, depth: 0 }
  ]

  const sampleMisc: MiscData = {
    meta: {
      title: 'Tula\'s Lawn Service LLC - Professional Lawn Care',
      description: 'Professional lawn care and landscaping services in your area. Contact us for mowing, trimming, and maintenance.',
      keywords: ['lawn care', 'landscaping', 'mowing', 'trimming', 'maintenance'],
      author: 'Tula\'s Lawn Service LLC',
      robots: 'index, follow'
    },
    links: {
      internal: ['/', '/services', '/about', '/contact'],
      external: ['https://facebook.com/tulaslawn', 'https://instagram.com/tulaslawn']
    },
    diagnostics: {
      wordCount: 1250,
      readabilityScore: 78,
      hasSchemaOrg: true,
      hasOpenGraph: true
    }
  }

  const sampleTruthTable: TruthTableData = {
    table: {
      brand_name: {
        value: 'Toula\'s Lawn Service',
        confidence: 0.72,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/', method: 'meta[property=\'og:title\']' }
        ]
      },
      email: {
        value: 'toulaslawn@gmail.com',
        confidence: 1.0,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/contact/', method: 'a[href^=\'mailto:\']' }
        ]
      },
      phone: {
        value: '+15042595171',
        confidence: 1.0,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/contact/', method: 'a[href^=\'tel:\']' }
        ]
      },
      services: {
        value: ['Lawn Care', 'Pressure Washing'],
        confidence: 0.77,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/', method: 'services_section.taxonomy' }
        ]
      },
      brand_colors: {
        value: ['#000000', '#ABB8C3'],
        confidence: 1.0,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/', method: 'css_var(--primary)' }
        ]
      },
      logo: {
        value: 'assets\\logo.jpg',
        confidence: 0.48,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/contact/', method: 'meta[property=\'og:image\']' }
        ]
      },
      background: {
        value: 'Toula\'s is a Ponchatoula based Lawn Care Service Provider year round that covers the Ponchatoula, Louisiana and surrounding areas.',
        confidence: 0.52,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/', method: 'about_section.p' }
        ]
      },
      slogan: {
        value: 'Toula\'s Lawn Service LLC',
        confidence: 0.42,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/', method: 'title' }
        ]
      },
      socials: {
        value: {
          facebook: 'https://www.facebook.com/ToulasLawn',
          x: 'https://x.com/tos'
        },
        confidence: 0.85,
        provenance: [
          { url: 'https://toulaslawnservicellc.com/contact/', method: 'a[href*=\'facebook\']' },
          { url: 'https://toulaslawnservicellc.com/portfolio/?share=twitter', method: 'a[href*=\'x\']' }
        ]
      },
      location: {
        value: null,
        confidence: 0.0,
        provenance: []
      }
    }
  }

  return [
    {
      slug: 'home',
      truthTable: sampleTruthTable,
      images: sampleImages.filter(img => img.pageSlug === 'home'),
      paragraphs: sampleParagraphs,
      navbar: sampleNavbar,
      misc: sampleMisc,
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceUrl: 'https://toulaslawnservicellc.com',
        pageCount: 1,
        version: '2.0.0'
      }
    },
    {
      slug: 'services',
      truthTable: sampleTruthTable,
      images: sampleImages.filter(img => img.pageSlug === 'services'),
      paragraphs: [
        {
          text: 'Our Professional Services',
          type: 'heading',
          level: 1,
          wordCount: 3
        },
        {
          text: 'We provide comprehensive lawn care services to keep your property looking its best year-round.',
          type: 'paragraph',
          wordCount: 16
        }
      ],
      navbar: sampleNavbar,
      misc: sampleMisc,
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceUrl: 'https://toulaslawnservicellc.com/services',
        pageCount: 1,
        version: '2.0.0'
      }
    },
    {
      slug: 'about',
      truthTable: sampleTruthTable,
      images: sampleImages.filter(img => img.pageSlug === 'about'),
      paragraphs: [
        {
          text: 'About Our Team',
          type: 'heading',
          level: 1,
          wordCount: 3
        },
        {
          text: 'Meet our experienced team of lawn care professionals.',
          type: 'paragraph',
          wordCount: 8
        }
      ],
      navbar: sampleNavbar,
      misc: sampleMisc,
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceUrl: 'https://toulaslawnservicellc.com/about',
        pageCount: 1,
        version: '2.0.0'
      }
    }
  ]
}
