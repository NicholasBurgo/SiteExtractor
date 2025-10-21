import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Image, FileText, Building2, Navigation, Palette } from 'lucide-react';

interface DynamicTruthTableProps {
  runId: string;
}

interface TruthTableData {
  navigation: {
    pages: Array<{ name: string; url: string }>;
    confirmedAt?: string;
  };
  assets: {
    images: Array<{ id: string; url: string; alt_text?: string; type: string; page: string }>;
    favicons: Array<{ url: string }>;
    downloadable_files: Array<{ url: string; filename: string }>;
    confirmedAt?: string;
  };
  paragraphs: {
    paragraphs: Array<{ text: string; page: string; word_count: number }>;
    confirmedAt?: string;
  };
  business: {
    meta: {
      businessName?: string;
      businessType?: string;
      slogan?: string;
      background?: string;
      serviceArea?: string;
      colors?: string[];
      confirmedAt?: string;
    };
    services: Array<{ name: string; description?: string }>;
    contact: {
      phone?: string[];
      email?: string[];
      address?: string;
    };
    legal: {
      privacyPolicy?: string;
      termsOfService?: string;
    };
  };
}

export function DynamicTruthTable({ runId }: DynamicTruthTableProps) {
  const [data, setData] = useState<TruthTableData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  useEffect(() => {
    loadData();
    
    // Set up interval to refresh data every 2 seconds
    const interval = setInterval(loadData, 2000);
    
    return () => clearInterval(interval);
  }, [runId]);

  // Helper function to extract pages from navigation tree structure
  const extractPagesFromTree = (node: any): Array<{ name: string; url: string }> => {
    const pages: Array<{ name: string; url: string }> = [];
    
    if (node && typeof node === 'object') {
      // Add current node if it has a label and href
      if (node.label && node.href && node.href !== '/') {
        pages.push({
          name: node.label,
          url: node.href
        });
      }
      
      // Recursively process children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          pages.push(...extractPagesFromTree(child));
        }
      }
    }
    
    return pages;
  };

  const loadData = () => {
    try {
      // Load navigation data
      const navigationData = localStorage.getItem(`navbar-${runId}`);
      const navigationRaw = navigationData ? JSON.parse(navigationData) : null;
      
      // Convert navigation tree structure to pages array
      const navigation = {
        pages: navigationRaw ? extractPagesFromTree(navigationRaw) : [],
        confirmedAt: navigationRaw?.confirmedAt
      };

      // Load assets data
      const assetsData = localStorage.getItem(`assets-${runId}`);
      const imagesData = localStorage.getItem(`images-${runId}`);
      const assets = {
        images: imagesData ? JSON.parse(imagesData) : [],
        favicons: assetsData ? JSON.parse(assetsData).favicons || [] : [],
        downloadable_files: assetsData ? JSON.parse(assetsData).downloadable_files || [] : [],
        confirmedAt: assetsData ? JSON.parse(assetsData).confirmedAt : undefined
      };

      // Load paragraphs data
      const paragraphsData = localStorage.getItem(`paragraphs-${runId}`);
      const paragraphsRaw = paragraphsData ? JSON.parse(paragraphsData) : [];
      const paragraphs = {
        paragraphs: Array.isArray(paragraphsRaw) ? paragraphsRaw : [],
        confirmedAt: paragraphsRaw?.confirmedAt
      };

      // Load business data
      const metaData = localStorage.getItem(`meta-${runId}`);
      const servicesData = localStorage.getItem(`services-${runId}`);
      const contactData = localStorage.getItem(`contact-${runId}`);
      const legalData = localStorage.getItem(`legal-${runId}`);

      const business = {
        meta: metaData ? JSON.parse(metaData) : {},
        services: servicesData ? JSON.parse(servicesData) : [],
        contact: contactData ? JSON.parse(contactData) : {},
        legal: legalData ? JSON.parse(legalData) : {}
      };

      // Debug logging
      console.log('DynamicTruthTable: Loading data for runId:', runId);
      console.log('DynamicTruthTable: Navigation data:', navigation);
      console.log('DynamicTruthTable: Assets data:', assets);
      console.log('DynamicTruthTable: Paragraphs data:', paragraphs);
      console.log('DynamicTruthTable: Business data:', business);

      setData({
        navigation,
        assets,
        paragraphs,
        business
      });
    } catch (error) {
      console.error('Error loading truth table data:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getStatusIcon = (hasData: boolean, isConfirmed: boolean) => {
    if (!hasData) return <XCircle className="w-4 h-4 text-gray-400" />;
    if (isConfirmed) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusText = (hasData: boolean, isConfirmed: boolean) => {
    if (!hasData) return 'No Data';
    if (isConfirmed) return 'Confirmed';
    return 'Pending';
  };

  const getStatusColor = (hasData: boolean, isConfirmed: boolean) => {
    if (!hasData) return 'text-gray-600 bg-gray-100';
    if (isConfirmed) return 'text-green-600 bg-green-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading truth table data...</p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: 'summary',
      title: 'Summary Overview',
      icon: <FileText className="w-5 h-5" />,
      hasData: true,
      isConfirmed: false,
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Navigation</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{data.navigation.pages?.length || 0}</div>
            <div className="text-sm text-blue-700">Pages Found</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Image className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900">Assets</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {(data.assets.images?.length || 0) + (data.assets.favicons?.length || 0) + (data.assets.downloadable_files?.length || 0)}
            </div>
            <div className="text-sm text-green-700">Total Assets</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-900">Content</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{data.paragraphs.paragraphs?.length || 0}</div>
            <div className="text-sm text-purple-700">Paragraphs</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-orange-900">Business</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {(data.business.services?.length || 0) + (data.business.meta?.businessName ? 1 : 0)}
            </div>
            <div className="text-sm text-orange-700">Items</div>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Navigation Data',
      icon: <Navigation className="w-5 h-5" />,
      hasData: (data.navigation.pages?.length || 0) > 0,
      isConfirmed: !!data.navigation.confirmedAt,
      content: (
        <div className="space-y-3">
          {(data.navigation.pages?.length || 0) > 0 ? (
            data.navigation.pages?.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{page.name}</div>
                  <div className="text-sm text-gray-600">{page.url}</div>
                </div>
                <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                  Page {index + 1}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No navigation pages found</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'assets',
      title: 'Assets Data',
      icon: <Image className="w-5 h-5" />,
      hasData: (data.assets.images?.length || 0) > 0 || (data.assets.favicons?.length || 0) > 0 || (data.assets.downloadable_files?.length || 0) > 0,
      isConfirmed: !!data.assets.confirmedAt,
      content: (
        <div className="space-y-4">
          {/* Images */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Images ({data.assets.images?.length || 0})</h4>
            {(data.assets.images?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.assets.images?.slice(0, 6).map((image, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Image className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{image.id}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {image.type === 'logo' ? 'Logo' : 'Content'} • {image.page}
                    </div>
                    {image.alt_text && (
                      <div className="text-xs text-gray-500 truncate">{image.alt_text}</div>
                    )}
                  </div>
                ))}
                {(data.assets.images?.length || 0) > 6 && (
                  <div className="p-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-gray-600">
                      +{(data.assets.images?.length || 0) - 6} more images
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No images found</p>
              </div>
            )}
          </div>

          {/* Favicons */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Favicons ({data.assets.favicons?.length || 0})</h4>
            {(data.assets.favicons?.length || 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.assets.favicons?.map((favicon, index) => (
                  <div key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Favicon {index + 1}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No favicons found</p>
              </div>
            )}
          </div>

          {/* Downloadable Files */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Files ({data.assets.downloadable_files?.length || 0})</h4>
            {(data.assets.downloadable_files?.length || 0) > 0 ? (
              <div className="space-y-2">
                {data.assets.downloadable_files?.slice(0, 3).map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">{file.filename}</span>
                    <span className="text-xs text-gray-500">File {index + 1}</span>
                  </div>
                ))}
                {(data.assets.downloadable_files?.length || 0) > 3 && (
                  <div className="text-center py-2 text-gray-500 text-sm">
                    +{(data.assets.downloadable_files?.length || 0) - 3} more files
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No downloadable files found</p>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'paragraphs',
      title: 'Content Data',
      icon: <FileText className="w-5 h-5" />,
      hasData: (data.paragraphs.paragraphs?.length || 0) > 0,
      isConfirmed: !!data.paragraphs.confirmedAt,
      content: (
        <div className="space-y-3">
          {(data.paragraphs.paragraphs?.length || 0) > 0 ? (
            data.paragraphs.paragraphs?.slice(0, 5).map((paragraph, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Paragraph {index + 1}</span>
                  <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                    {paragraph?.word_count || 0} words
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-1">{paragraph?.page || 'Unknown'}</div>
                <div className="text-sm text-gray-600 line-clamp-2">
                  {paragraph?.text && paragraph.text.length > 150 ? `${paragraph.text.substring(0, 150)}...` : (paragraph?.text || 'No text available')}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No paragraphs found</p>
            </div>
          )}
          {(data.paragraphs.paragraphs?.length || 0) > 5 && (
            <div className="text-center py-2 text-gray-500 text-sm">
              +{(data.paragraphs.paragraphs?.length || 0) - 5} more paragraphs
            </div>
          )}
        </div>
      )
    },
    {
      id: 'business',
      title: 'Business Data',
      icon: <Building2 className="w-5 h-5" />,
      hasData: !!(data.business.meta?.businessName || (data.business.services?.length || 0) > 0 || (data.business.contact?.phone?.length || 0) > 0 || (data.business.contact?.email?.length || 0) > 0),
      isConfirmed: !!(data.business.meta?.confirmedAt),
      content: (
        <div className="space-y-4">
          {/* Business Identity */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Business Identity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.business.meta.businessName && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Business Name</div>
                  <div className="text-sm text-gray-700">{data.business.meta.businessName}</div>
                </div>
              )}
              {data.business.meta.businessType && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Business Type</div>
                  <div className="text-sm text-gray-700 capitalize">{data.business.meta.businessType}</div>
                </div>
              )}
              {data.business.meta.serviceArea && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Service Area</div>
                  <div className="text-sm text-gray-700">{data.business.meta.serviceArea}</div>
                </div>
              )}
              {data.business.meta?.colors && data.business.meta.colors.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 mb-1">Brand Colors</div>
                  <div className="flex items-center space-x-2">
                    {data.business.meta.colors.slice(0, 3).map((color, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <div 
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-gray-600">{color}</span>
                      </div>
                    ))}
                    {data.business.meta.colors.length > 3 && (
                      <span className="text-xs text-gray-500">+{data.business.meta.colors.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Services ({data.business.services?.length || 0})</h4>
            {(data.business.services?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.business.services?.slice(0, 4).map((service, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                    {service.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{service.description}</div>
                    )}
                  </div>
                ))}
                {(data.business.services?.length || 0) > 4 && (
                  <div className="p-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-gray-600">
                      +{(data.business.services?.length || 0) - 4} more services
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No services found</p>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.business.contact?.phone && Array.isArray(data.business.contact.phone) && data.business.contact.phone.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Phone Numbers</div>
                  <div className="text-sm text-gray-700">{data.business.contact.phone.join(', ')}</div>
                </div>
              )}
              {data.business.contact?.email && Array.isArray(data.business.contact.email) && data.business.contact.email.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Email Addresses</div>
                  <div className="text-sm text-gray-700">{data.business.contact.email.join(', ')}</div>
                </div>
              )}
              {data.business.contact?.address && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Address</div>
                  <div className="text-sm text-gray-700">{data.business.contact.address}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Dynamic Truth Table</h3>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {section.icon}
                <h4 className="font-medium text-gray-900">{section.title}</h4>
                {getStatusIcon(section.hasData, section.isConfirmed)}
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(section.hasData, section.isConfirmed)}`}>
                  {getStatusText(section.hasData, section.isConfirmed)}
                </span>
              </div>
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                {expandedSections.has(section.id) ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
            
            {expandedSections.has(section.id) && (
              <div className="p-4">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
