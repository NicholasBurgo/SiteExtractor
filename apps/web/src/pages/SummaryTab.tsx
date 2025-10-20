import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Copy, Check } from 'lucide-react';

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

    // Truth Table Tab
    const truthTableData = localStorage.getItem(`truth-table-${runId}`);
    if (truthTableData) {
      const parsed = JSON.parse(truthTableData);
      tabs.push({
        name: 'Truth Table',
        isConfirmed: !!parsed.confirmedAt,
        hasData: !!parsed.fields && parsed.fields.length > 0,
        lastUpdated: parsed.confirmedAt || parsed.retriedAt || parsed.loadedAt,
        dataCount: parsed.fields?.length || 0,
        jsonData: parsed
      });
    } else {
      tabs.push({
        name: 'Truth Table',
        isConfirmed: false,
        hasData: false,
        jsonData: null
      });
    }

    // Navigation Tab
    const navigationData = localStorage.getItem(`navigation-${runId}`);
    if (navigationData) {
      const parsed = JSON.parse(navigationData);
      tabs.push({
        name: 'Navigation',
        isConfirmed: !!parsed.confirmedAt,
        hasData: !!parsed.pages && parsed.pages.length > 0,
        lastUpdated: parsed.confirmedAt || parsed.loadedAt,
        dataCount: parsed.pages?.length || 0,
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

    // Images Tab
    const imagesData = localStorage.getItem(`images-${runId}`);
    if (imagesData) {
      const parsed = JSON.parse(imagesData);
      tabs.push({
        name: 'Images',
        isConfirmed: !!parsed.confirmedAt,
        hasData: !!parsed.images && parsed.images.length > 0,
        lastUpdated: parsed.confirmedAt || parsed.loadedAt,
        dataCount: parsed.images?.length || 0,
        jsonData: parsed
      });
    } else {
      tabs.push({
        name: 'Images',
        isConfirmed: false,
        hasData: false,
        jsonData: null
      });
    }

    // Paragraphs Tab
    const paragraphsData = localStorage.getItem(`paragraphs-${runId}`);
    if (paragraphsData) {
      const parsed = JSON.parse(paragraphsData);
      tabs.push({
        name: 'Paragraphs',
        isConfirmed: !!parsed.confirmedAt,
        hasData: !!parsed.paragraphs && parsed.paragraphs.length > 0,
        lastUpdated: parsed.confirmedAt || parsed.retriedAt || parsed.loadedAt,
        dataCount: parsed.paragraphs?.length || 0,
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

    setTabStatuses(tabs);
  };

  const handleApproveAll = () => {
    // Confirm Truth Table
    const truthTableData = localStorage.getItem(`truth-table-${runId}`);
    if (truthTableData) {
      const parsed = JSON.parse(truthTableData);
      localStorage.setItem(`truth-table-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Confirm Navigation
    const navigationData = localStorage.getItem(`navigation-${runId}`);
    if (navigationData) {
      const parsed = JSON.parse(navigationData);
      localStorage.setItem(`navigation-${runId}`, JSON.stringify({
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

    // Confirm Images
    const imagesData = localStorage.getItem(`images-${runId}`);
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

        {/* JSON Data Previews */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">JSON Data Previews</h3>
          <div className="space-y-4">
            {tabStatuses.map((tab) => (
              <div key={tab.name} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{tab.name}</h4>
                    {getStatusIcon(tab)}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tab)}`}>
                      {getStatusText(tab)}
                    </span>
                    {tab.dataCount !== undefined && (
                      <span className="text-sm text-gray-600">({tab.dataCount} items)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {tab.jsonData && (
                      <button
                        onClick={() => copyToClipboard(tab.jsonData, tab.name)}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                        title="Copy JSON to clipboard"
                      >
                        {copiedTab === tab.name ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpanded(tab.name)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    >
                      {expandedTabs.has(tab.name) ? (
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
                </div>
                
                {expandedTabs.has(tab.name) && (
                  <div className="p-4">
                    {tab.jsonData ? (
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm text-gray-800 max-h-96">
                        {JSON.stringify(tab.jsonData, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No data available for {tab.name}</p>
                        <p className="text-sm mt-1">Data will appear here when extracted</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
}
