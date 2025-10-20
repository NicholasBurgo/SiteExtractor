import { useState } from 'react';
import { CheckCircle, XCircle, Check, Building2, Users, Phone, Scale } from 'lucide-react';
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
      component: <IdentitySubTab runId={runId} url={url} onConfirm={() => handleSubTabConfirm('identity')} isConfirmed={confirmedSubTabs.has('identity')} />
    },
    { 
      id: 'services', 
      label: 'Services', 
      icon: <Users className="w-4 h-4" />,
      component: <ServicesSubTab runId={runId} url={url} onConfirm={() => handleSubTabConfirm('services')} isConfirmed={confirmedSubTabs.has('services')} />
    },
    { 
      id: 'contact', 
      label: 'Contact', 
      icon: <Phone className="w-4 h-4" />,
      component: <ContactSubTab runId={runId} url={url} onConfirm={() => handleSubTabConfirm('contact')} isConfirmed={confirmedSubTabs.has('contact')} />
    },
    { 
      id: 'legal', 
      label: 'Legal', 
      icon: <Scale className="w-4 h-4" />,
      component: <LegalSubTab runId={runId} url={url} onConfirm={() => handleSubTabConfirm('legal')} isConfirmed={confirmedSubTabs.has('legal')} />
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
