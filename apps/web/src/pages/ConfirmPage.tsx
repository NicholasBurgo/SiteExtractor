import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { ParagraphsTab } from './ParagraphsTab';
import { NavbarTab } from './NavbarTab';
import { ContactTab } from './ContactTab';
import { AssetsTab } from './AssetsTab';
import { BusinessTab } from './BusinessTab';
import { SummaryTab } from './SummaryTab';
import { usePageManager, Page } from '../hooks/usePageManager';

interface ConfirmPageProps {
  runId: string;
  url?: string;
  extractionOptions?: any;
  onBack: () => void;
}

export function ConfirmPage({ runId, url, extractionOptions, onBack }: ConfirmPageProps) {
  const [activeTab, setActiveTab] = useState<'navbar' | 'assets' | 'paragraphs' | 'business' | 'summary'>('navbar');
  const [confirmedTabs, setConfirmedTabs] = useState<Set<string>>(new Set());

  // Use shared page manager at the top level
  const { pages, addPage, updatePage, removePage, isLoading: pagesLoading } = usePageManager(runId);

  const handleTabConfirm = (tabId: string) => {
    setConfirmedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  const handleApproveAll = () => {
    // Mark all tabs with confirm buttons as confirmed
    setConfirmedTabs(new Set(['navbar', 'assets', 'paragraphs', 'business']));
  };

  const tabs = [
    { id: 'navbar', label: 'Navigation', component: <NavbarTab runId={runId} pages={pages} addPage={addPage} updatePage={updatePage} removePage={removePage} isLoading={pagesLoading} onConfirm={() => handleTabConfirm('navbar')} onConfirmAll={handleApproveAll} isConfirmed={confirmedTabs.has('navbar')} /> },
    { id: 'assets', label: 'Assets', component: <AssetsTab runId={runId} url={url} pages={pages} onConfirm={() => handleTabConfirm('assets')} isConfirmed={confirmedTabs.has('assets')} /> },
    { id: 'paragraphs', label: 'Paragraphs', component: <ParagraphsTab runId={runId} url={url} extractionOptions={extractionOptions} pages={pages} onConfirm={() => handleTabConfirm('paragraphs')} isConfirmed={confirmedTabs.has('paragraphs')} /> },
    { id: 'business', label: 'Business', component: <BusinessTab runId={runId} url={url} onConfirm={() => handleTabConfirm('business')} isConfirmed={confirmedTabs.has('business')} /> },
  ] as const;

  const summaryTab = { id: 'summary', label: 'Summary', component: <SummaryTab runId={runId} onApproveAll={handleApproveAll} isConfirmed={confirmedTabs.has('summary')} onConfirm={() => handleTabConfirm('summary')} /> };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Extraction
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Site Confirmation</h1>
        <p className="text-gray-600 mt-2">
          Review and confirm extracted content for {runId}
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex justify-between">
          {/* Left side - Regular tabs */}
          <div className="flex space-x-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-4 rounded-full font-medium text-sm flex items-center space-x-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <span>{tab.label}</span>
                {confirmedTabs.has(tab.id) && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </button>
            ))}
          </div>
          
          {/* Right side - Summary tab with special styling */}
          <button
            onClick={() => setActiveTab(summaryTab.id as typeof activeTab)}
            className={`py-2 px-4 rounded-full font-semibold text-sm flex items-center space-x-2 transition-all ${
              activeTab === summaryTab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg'
            }`}
          >
            <span>{summaryTab.label}</span>
            {confirmedTabs.has(summaryTab.id) && (
              <Check className="w-4 h-4 text-white" />
            )}
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        {activeTab === 'summary' 
          ? summaryTab.component 
          : tabs.find(tab => tab.id === activeTab)?.component
        }
      </div>
    </div>
  );
}
