import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { DynamicTruthTable } from '../components/DynamicTruthTable';

interface SummaryTabProps {
  runId: string;
  onApproveAll?: () => void;
  isConfirmed?: boolean;
  onConfirm?: () => void;
}

interface TabStatus {
  name: string;
  isConfirmed: boolean;
  hasData: boolean;
  lastUpdated?: string;
  dataCount?: number;
  jsonData?: any;
}

export function SummaryTab({ runId, onApproveAll, isConfirmed = false, onConfirm }: SummaryTabProps) {
  const [tabStatuses, setTabStatuses] = useState<TabStatus[]>([]);
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  useEffect(() => {
    loadTabStatuses();
    
    // Set up interval to refresh data every 2 seconds
    const interval = setInterval(loadTabStatuses, 2000);
    
    return () => clearInterval(interval);
  }, [runId]);

  const loadTabStatuses = () => {
    const tabs: TabStatus[] = [];

    console.log('SummaryTab: Loading tab statuses for runId:', runId);

    // Navigation Tab
    const navigationData = localStorage.getItem(`navbar-${runId}`);
    console.log('SummaryTab: Navigation data:', navigationData);
    if (navigationData) {
      const parsed = JSON.parse(navigationData);
      console.log('SummaryTab: Parsed navigation data:', parsed);
      
      // Extract pages from tree structure
      const extractPagesFromTree = (node: any): number => {
        let count = 0;
        if (node && typeof node === 'object') {
          if (node.label && node.href && node.href !== '/') {
            count++;
          }
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
              count += extractPagesFromTree(child);
            }
          }
        }
        return count;
      };
      
      const pageCount = extractPagesFromTree(parsed);
      
      tabs.push({
        name: 'Navigation',
        isConfirmed: !!parsed.confirmedAt,
        hasData: pageCount > 0,
        lastUpdated: parsed.confirmedAt || parsed.loadedAt,
        dataCount: pageCount,
        jsonData: parsed
      });
    } else {
      tabs.push({
        name: 'Navigation',
        isConfirmed: false,
        hasData: false,
        jsonData: null
      });
    }

    // Paragraphs Tab
    const paragraphsData = localStorage.getItem(`paragraphs-${runId}`);
    if (paragraphsData) {
      const parsed = JSON.parse(paragraphsData);
      const paragraphsArray = Array.isArray(parsed) ? parsed : (parsed.paragraphs || []);
      tabs.push({
        name: 'Paragraphs',
        isConfirmed: !!parsed.confirmedAt,
        hasData: paragraphsArray.length > 0,
        lastUpdated: parsed.confirmedAt || parsed.retriedAt || parsed.loadedAt,
        dataCount: paragraphsArray.length,
        jsonData: parsed
      });
    } else {
      tabs.push({
        name: 'Paragraphs',
        isConfirmed: false,
        hasData: false,
        jsonData: null
      });
    }

    // Business Tab (with sub-tabs)
    const metaData = localStorage.getItem(`meta-${runId}`);
    const servicesData = localStorage.getItem(`services-${runId}`);
    const contactData = localStorage.getItem(`contact-${runId}`);
    const legalData = localStorage.getItem(`legal-${runId}`);
    
    if (metaData || servicesData || contactData || legalData) {
      const metaParsed = metaData ? JSON.parse(metaData) : {};
      const servicesParsed = servicesData ? JSON.parse(servicesData) : {};
      const contactParsed = contactData ? JSON.parse(contactData) : {};
      const legalParsed = legalData ? JSON.parse(legalData) : {};
      
      const totalBusiness = (metaParsed.businessName ? 1 : 0) + 
                           (metaParsed.businessType ? 1 : 0) + 
                           (servicesParsed.length || 0) + 
                           (contactParsed.phone?.length || 0) + 
                           (contactParsed.email?.length || 0) + 
                           (legalParsed.privacyPolicy ? 1 : 0) + 
                           (legalParsed.termsOfService ? 1 : 0);
      
      tabs.push({
        name: 'Business',
        isConfirmed: !!(metaParsed.confirmedAt || servicesParsed.confirmedAt || contactParsed.confirmedAt || legalParsed.confirmedAt),
        hasData: totalBusiness > 0,
        lastUpdated: metaParsed.confirmedAt || servicesParsed.confirmedAt || contactParsed.confirmedAt || legalParsed.confirmedAt || 
                    metaParsed.retriedAt || servicesParsed.retriedAt || contactParsed.retriedAt || legalParsed.retriedAt,
        dataCount: totalBusiness,
        jsonData: { meta: metaParsed, services: servicesParsed, contact: contactParsed, legal: legalParsed }
      });
    } else {
      tabs.push({
        name: 'Business',
        isConfirmed: false,
        hasData: false,
        jsonData: null
      });
    }


    // SEO Tab (removed - not needed)
    // SEO functionality has been removed from the main navigation

    // Assets Tab
    const assetsData = localStorage.getItem(`assets-${runId}`);
    const imagesData = localStorage.getItem(`images-${runId}`);
    
    if (assetsData || imagesData) {
      const assetsParsed = assetsData ? JSON.parse(assetsData) : {};
      const imagesParsed = imagesData ? JSON.parse(imagesData) : {};
      
      const totalAssets = (assetsParsed.favicons?.length || 0) + 
                         (imagesParsed.length || 0) + 
                         (assetsParsed.downloadable_files?.length || 0);
      
      tabs.push({
        name: 'Assets',
        isConfirmed: !!(assetsParsed.confirmedAt || imagesParsed.confirmedAt),
        hasData: totalAssets > 0,
        lastUpdated: assetsParsed.confirmedAt || imagesParsed.confirmedAt || assetsParsed.retriedAt || imagesParsed.loadedAt,
        dataCount: totalAssets,
        jsonData: { ...assetsParsed, images: imagesParsed }
      });
    } else {
      tabs.push({
        name: 'Assets',
        isConfirmed: false,
        hasData: false,
        jsonData: null
      });
    }

    // Legal Tab (now part of Business)
    // Legal data is handled in the Business tab section above

    setTabStatuses(tabs);
  };

  const handleApproveAll = () => {

    // Confirm Navigation
    const navigationData = localStorage.getItem(`navbar-${runId}`);
    if (navigationData) {
      const parsed = JSON.parse(navigationData);
      localStorage.setItem(`navbar-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Confirm Paragraphs
    const paragraphsData = localStorage.getItem(`paragraphs-${runId}`);
    if (paragraphsData) {
      const parsed = JSON.parse(paragraphsData);
      localStorage.setItem(`paragraphs-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Confirm Business (Meta, Services, Contact, Legal)
    const metaData = localStorage.getItem(`meta-${runId}`);
    if (metaData) {
      const parsed = JSON.parse(metaData);
      localStorage.setItem(`meta-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    const servicesData = localStorage.getItem(`services-${runId}`);
    if (servicesData) {
      const parsed = JSON.parse(servicesData);
      localStorage.setItem(`services-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    const contactData = localStorage.getItem(`contact-${runId}`);
    if (contactData) {
      const parsed = JSON.parse(contactData);
      localStorage.setItem(`contact-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    const legalData = localStorage.getItem(`legal-${runId}`);
    if (legalData) {
      const parsed = JSON.parse(legalData);
      localStorage.setItem(`legal-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Confirm Assets (including Images)
    const assetsData = localStorage.getItem(`assets-${runId}`);
    const imagesData = localStorage.getItem(`images-${runId}`);
    
    if (assetsData) {
      const parsed = JSON.parse(assetsData);
      localStorage.setItem(`assets-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }
    
    if (imagesData) {
      const parsed = JSON.parse(imagesData);
      localStorage.setItem(`images-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Trigger the approve all callback to update tab checkmarks
    onApproveAll?.();
    
    console.log('All tabs approved successfully');
  };

  const toggleExpanded = (tabName: string) => {
    setExpandedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabName)) {
        newSet.delete(tabName);
      } else {
        newSet.add(tabName);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (jsonData: any, tabName: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      setCopiedTab(tabName);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusIcon = (tab: TabStatus) => {
    if (!tab.hasData) {
      return <XCircle className="w-5 h-5 text-gray-400" />;
    }
    if (tab.isConfirmed) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusText = (tab: TabStatus) => {
    if (!tab.hasData) {
      return 'No Data';
    }
    if (tab.isConfirmed) {
      return 'Confirmed';
    }
    return 'Pending';
  };

  const getStatusColor = (tab: TabStatus) => {
    if (!tab.hasData) {
      return 'text-gray-600 bg-gray-100';
    }
    if (tab.isConfirmed) {
      return 'text-green-600 bg-green-100';
    }
    return 'text-yellow-600 bg-yellow-100';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
        <div className="flex space-x-3">
          <button 
            onClick={() => {
              if (isConfirmed) {
                onConfirm?.();
              } else {
                handleApproveAll();
                onConfirm?.();
              }
            }}
            className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 ${
              isConfirmed 
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isConfirmed ? 'Unconfirm All' : 'Approve All'}
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Continue & Package
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Tab Status Overview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tab Status Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tabStatuses.map((tab) => (
              <div key={tab.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{tab.name}</h4>
                  {getStatusIcon(tab)}
                </div>
                <div className="space-y-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tab)}`}>
                    {getStatusText(tab)}
                  </span>
                  {tab.dataCount !== undefined && (
                    <p className="text-sm text-gray-600">{tab.dataCount} items</p>
                  )}
                  <p className="text-xs text-gray-500">Updated: {formatDate(tab.lastUpdated)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Truth Table */}
        <DynamicTruthTable runId={runId} />

        {/* Summary Statistics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {tabStatuses.filter(tab => tab.hasData).length}
              </div>
              <div className="text-sm text-gray-600">Tabs with Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tabStatuses.filter(tab => tab.isConfirmed).length}
              </div>
              <div className="text-sm text-gray-600">Confirmed Tabs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {tabStatuses.reduce((sum, tab) => sum + (tab.dataCount || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
          </div>
        </div>

        {/* Business Validation Warnings */}
        {(() => {
          const businessTab = tabStatuses.find(tab => tab.name === 'Business');
          if (!businessTab?.jsonData) return null;

          const { meta, services } = businessTab.jsonData;
          const warnings = [];

          // Check required fields
          if (!meta?.businessName) {
            warnings.push('Business name is required');
          }
          if (!meta?.businessType) {
            warnings.push('Business type is required');
          }

          // Check services for certain business types
          if (meta?.businessType && ['services', 'law', 'retail'].includes(meta.businessType)) {
            if (!services || services.length === 0) {
              warnings.push(`${meta.businessType} businesses should have services listed`);
            }
          }

          if (warnings.length === 0) return null;

          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-semibold text-yellow-800">Business Validation Warnings</h3>
              </div>
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="flex items-center text-sm text-yellow-700">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></div>
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
