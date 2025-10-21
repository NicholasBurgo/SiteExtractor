import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Check, Building2, Users, Phone, Scale, Download, AlertCircle } from 'lucide-react';
import { IdentitySubTab } from './business/IdentitySubTab';
import { ServicesSubTab } from './business/ServicesSubTab';
import { ContactSubTab } from './business/ContactSubTab';
import { LegalSubTab } from './business/LegalSubTab';

interface BusinessTabProps {
  runId: string;
  url?: string;
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

export function BusinessTab({ runId, url, onConfirm, isConfirmed = false }: BusinessTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'services' | 'contact' | 'legal'>('identity');
  const [confirmedSubTabs, setConfirmedSubTabs] = useState<Set<string>>(new Set());
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if data already exists in localStorage (from automatic extraction)
  useEffect(() => {
    const checkForExistingData = () => {
      const metaData = localStorage.getItem(`meta-${runId}`);
      const servicesData = localStorage.getItem(`services-${runId}`);
      const contactData = localStorage.getItem(`contact-${runId}`);
      const legalData = localStorage.getItem(`legal-${runId}`);
      
      if (metaData || servicesData || contactData || legalData) {
        console.log('Found existing business data in localStorage, setting hasExtracted to true');
        setHasExtracted(true);
        return true;
      }
      return false;
    };
    
    const hasData = checkForExistingData();
    
    // If no data exists, check if extraction is already in progress
    if (!hasData) {
      const extractionInProgress = localStorage.getItem(`extraction-in-progress-${runId}`);
      if (extractionInProgress) {
        console.log('Extraction already ongoing for this runId');
        setHasExtracted(true);
      }
    }
  }, [runId]);

  // Auto-trigger extraction when component mounts if no data exists and URL is available
  useEffect(() => {
    const autoExtract = async () => {
      if (!url || hasExtracted || isLoading) return;
      
      // Check if any business data exists
      const metaData = localStorage.getItem(`meta-${runId}`);
      const servicesData = localStorage.getItem(`services-${runId}`);
      const contactData = localStorage.getItem(`contact-${runId}`);
      const legalData = localStorage.getItem(`legal-${runId}`);
      
      // If no data exists, automatically trigger extraction
      if (!metaData && !servicesData && !contactData && !legalData) {
        console.log('No business data found, auto-triggering extraction...');
        await handleExtractAll();
      }
    };
    
    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(autoExtract, 500);
    return () => clearTimeout(timeoutId);
  }, [url, runId, hasExtracted, isLoading]);

  const handleExtractAll = async () => {
    console.log('Extract All button clicked!', { url, runId });
    if (!url) {
      console.error('No URL provided for extraction');
      return;
    }

    // Check if extraction is already in progress
    const extractionInProgress = localStorage.getItem(`extraction-in-progress-${runId}`);
    if (extractionInProgress) {
      console.log('Extraction already in progress for this runId, skipping...');
      return;
    }

    // Check if data already exists
    const metaData = localStorage.getItem(`meta-${runId}`);
    const servicesData = localStorage.getItem(`services-${runId}`);
    const contactData = localStorage.getItem(`contact-${runId}`);
    const legalData = localStorage.getItem(`legal-${runId}`);
    
    if (metaData && servicesData && contactData && legalData) {
      console.log('All business data already exists, skipping extraction...');
      setHasExtracted(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Mark extraction as in progress
    localStorage.setItem(`extraction-in-progress-${runId}`, 'true');

    try {
      console.log('Starting parallel individual extractions...');
      
      const extractionPromises = [
        fetch('/api/extract/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, runId })
        }),
        fetch('/api/extract/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, runId })
        }),
        fetch('/api/extract/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, runId })
        }),
        fetch('/api/extract/legal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, runId })
        })
      ];

      const results = await Promise.allSettled(extractionPromises);
      
      results.forEach((result, index) => {
        const extractionTypes = ['meta', 'services', 'contact', 'legal'];
        if (result.status === 'fulfilled') {
          console.log(`${extractionTypes[index]} extraction completed successfully`);
          // Store the result in localStorage for this specific extraction type
          const response = result.value;
          if (response.ok) {
            // Mark this extraction type as completed
            localStorage.setItem(`${extractionTypes[index]}-${runId}`, 'completed');
          }
        } else {
          console.warn(`${extractionTypes[index]} extraction failed:`, result.reason);
        }
      });
      
      setHasExtracted(true);
      // Trigger refresh of all sub-tabs
      setRefreshKey(prev => prev + 1);
      
      console.log('All parallel extractions completed');
    } catch (extractionError) {
      console.error('Extraction failed:', extractionError);
      setError('Failed to extract business data');
    } finally {
      setIsLoading(false);
      // Remove extraction in progress flag
      localStorage.removeItem(`extraction-in-progress-${runId}`);
    }
  };

  const handleRetry = async () => {
    setError(null);
    await handleExtractAll();
  };

  const handleSubTabConfirm = (subTabId: string) => {
    setConfirmedSubTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subTabId)) {
        newSet.delete(subTabId);
      } else {
        newSet.add(subTabId);
      }
      return newSet;
    });
  };

  const handleConfirmAll = () => {
    const allSubTabs = new Set(['identity', 'services', 'contact', 'legal']);
    
    // Check if all sub-tabs are already confirmed
    const allConfirmed = Array.from(allSubTabs).every(subTab => confirmedSubTabs.has(subTab));
    
    if (allConfirmed) {
      // If all are confirmed, unconfirm all
      setConfirmedSubTabs(new Set());
    } else {
      // If not all are confirmed, confirm all
      setConfirmedSubTabs(allSubTabs);
    }
    
    onConfirm?.();
  };

  const subTabs = [
    { 
      id: 'identity', 
      label: 'Identity', 
      icon: <Building2 className="w-4 h-4" />,
      component: <IdentitySubTab key={`identity-${refreshKey}`} runId={runId} url={url} hasExtracted={hasExtracted} onConfirm={() => handleSubTabConfirm('identity')} isConfirmed={confirmedSubTabs.has('identity')} />
    },
    { 
      id: 'services', 
      label: 'Services', 
      icon: <Users className="w-4 h-4" />,
      component: <ServicesSubTab key={`services-${refreshKey}`} runId={runId} url={url} hasExtracted={hasExtracted} onConfirm={() => handleSubTabConfirm('services')} isConfirmed={confirmedSubTabs.has('services')} />
    },
    { 
      id: 'contact', 
      label: 'Contact', 
      icon: <Phone className="w-4 h-4" />,
      component: <ContactSubTab key={`contact-${refreshKey}`} runId={runId} url={url} hasExtracted={hasExtracted} onConfirm={() => handleSubTabConfirm('contact')} isConfirmed={confirmedSubTabs.has('contact')} />
    },
    { 
      id: 'legal', 
      label: 'Legal', 
      icon: <Scale className="w-4 h-4" />,
      component: <LegalSubTab key={`legal-${refreshKey}`} runId={runId} url={url} hasExtracted={hasExtracted} onConfirm={() => handleSubTabConfirm('legal')} isConfirmed={confirmedSubTabs.has('legal')} />
    },
  ] as const;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
          <p className="text-gray-600 mt-1">Review and confirm business-related data</p>
          <p className="text-sm text-gray-500 mt-1">
            {confirmedSubTabs.size} of {subTabs.length} sub-tabs confirmed
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Retry Button - only show if extraction has been attempted and failed */}
          {hasExtracted && error && !isLoading && (
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Retry Extraction
            </button>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Extracting...
              </div>
            </div>
          )}
          
          {/* Error State */}
          {error && hasExtracted && (
            <div className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}
          
          {/* Confirm All Button */}
          {hasExtracted && !isLoading && (
            <button
              onClick={handleConfirmAll}
              className={`px-6 py-2 text-sm font-medium border border-transparent rounded-full focus:outline-none focus:ring-2 transition-all ${
                confirmedSubTabs.size === subTabs.length
                  ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                  : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {confirmedSubTabs.size === subTabs.length ? (
                <>
                  <XCircle className="w-4 h-4 inline mr-2" />
                  Unconfirm All
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 inline mr-2" />
                  Confirm All
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-3">
          {subTabs.map((subTab) => (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id)}
              className={`py-2 px-4 rounded-full font-medium text-sm flex items-center space-x-2 transition-all ${
                activeSubTab === subTab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              {subTab.icon}
              <span>{subTab.label}</span>
              {confirmedSubTabs.has(subTab.id) && (
                <Check className="w-4 h-4 text-green-400" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-tab Content */}
      <div className="bg-white rounded-lg shadow">
        {subTabs.find(subTab => subTab.id === activeSubTab)?.component}
      </div>
    </div>
  );
}
