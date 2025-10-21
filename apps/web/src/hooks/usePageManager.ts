import { useState, useEffect } from 'react';

export interface Page {
  id: string;
  name: string;
  url: string;
  order: number;
  status: 'extracted' | 'added' | 'modified';
  qualityScore?: number;
  originalLabel?: string;
}

export function usePageManager(runId?: string) {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (runId) {
      loadPages();
    }
  }, [runId]);

  const loadPages = async () => {
    setIsLoading(true);
    console.log('usePageManager: Loading pages for runId:', runId);
    
    // First check if navbar data is already preloaded in localStorage
    const preloadedNavbarData = localStorage.getItem(`navbar-${runId}`);
    if (preloadedNavbarData) {
      try {
        const navbarData = JSON.parse(preloadedNavbarData);
        console.log('usePageManager: Using preloaded navbar data:', navbarData);
        const extractedPages = extractPagesFromNavbar(navbarData);
        if (extractedPages.length > 0) {
          setPages(extractedPages);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn('usePageManager: Failed to parse preloaded navbar data:', error);
      }
    }
    
    try {
      // Load pages from navigation data if not preloaded
      const response = await fetch('/api/extract/navbar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('usePageManager: API response:', result);
        if (result.status === 'success' && result.navbar) {
          // Store the data for future use
          localStorage.setItem(`navbar-${runId}`, JSON.stringify(result.navbar));
          
          // Convert navbar structure to pages
          const extractedPages = extractPagesFromNavbar(result.navbar);
          console.log('usePageManager: Extracted pages:', extractedPages);
          if (extractedPages.length > 0) {
            setPages(extractedPages);
          } else {
            // If extraction returns empty, use default pages
            console.log('usePageManager: No pages extracted, using defaults');
            setPages(getDefaultPages());
          }
        } else {
          console.log('usePageManager: API success but no navbar data, using defaults');
          setPages(getDefaultPages());
        }
      } else {
        console.warn('usePageManager: Navbar API failed, using default pages');
        setPages(getDefaultPages());
      }
    } catch (error) {
      console.error('Failed to load pages:', error);
      setPages(getDefaultPages());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultPages = (): Page[] => [
    { id: '1', name: 'Home Page', url: '/', order: 1, status: 'extracted' },
    { id: '2', name: 'Services Page', url: '/services', order: 2, status: 'extracted' },
    { id: '3', name: 'About Page', url: '/about', order: 3, status: 'extracted' },
    { id: '4', name: 'Contact Page', url: '/contact', order: 4, status: 'extracted' },
  ];

  const extractPagesFromNavbar = (navbar: any): Page[] => {
    const pages: Page[] = [];
    
    const extractFromNode = (node: any, order: number = 1) => {
      if (node.label && node.href) {
        pages.push({
          id: node.id || `page_${pages.length + 1}`,
          name: `${node.label} Page`,
          url: node.href,
          order: order,
          status: 'extracted',
          qualityScore: node.quality_score || 50,
          originalLabel: node.label
        });
      }
      
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any, index: number) => {
          extractFromNode(child, order + index + 1);
        });
      }
    };
    
    extractFromNode(navbar);
    return pages;
  };

  const addPage = (name: string, url: string) => {
    const newPage: Page = {
      id: Date.now().toString(),
      name: name.endsWith(' Page') ? name : `${name} Page`,
      url: url,
      order: pages.length + 1,
      status: 'added'
    };
    
    setPages(prev => [...prev, newPage]);
    return newPage;
  };

  const updatePage = (id: string, updates: Partial<Page>) => {
    setPages(prev => prev.map(page => 
      page.id === id ? { ...page, ...updates } : page
    ));
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(page => page.id !== id));
  };

  const getPageNames = () => {
    return pages.map(page => page.name);
  };

  const getPageById = (id: string) => {
    return pages.find(page => page.id === id);
  };

  const getPageByName = (name: string) => {
    return pages.find(page => page.name === name);
  };

  return {
    pages,
    isLoading,
    addPage,
    updatePage,
    removePage,
    getPageNames,
    getPageById,
    getPageByName,
    loadPages
  };
}
