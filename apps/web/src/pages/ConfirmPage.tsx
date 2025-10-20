import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { TruthTableTab } from './TruthTableTab';
import { ImagesTab } from './ImagesTab';
import { ParagraphsTab } from './ParagraphsTab';
import { NavbarTab } from './NavbarTab';
import { MiscTab } from './MiscTab';
import { SummaryTab } from './SummaryTab';
import { usePageManager, Page } from '../hooks/usePageManager';

interface ConfirmPageProps {
  runId: string;
  url?: string;
  extractionOptions?: any;
  onBack: () => void;
}

export function ConfirmPage({ runId, url, extractionOptions, onBack }: ConfirmPageProps) {
  const [activeTab, setActiveTab] = useState<'truth-table' | 'images' | 'paragraphs' | 'navbar' | 'misc' | 'summary'>('truth-table');
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
    setConfirmedTabs(new Set(['truth-table', 'navbar', 'paragraphs', 'images']));
  };

  const tabs = [
    { id: 'truth-table', label: 'Truth Table', component: <TruthTableTab runId={runId} url={url} extractionOptions={extractionOptions} onConfirm={() => handleTabConfirm('truth-table')} onConfirmAll={handleApproveAll} isConfirmed={confirmedTabs.has('truth-table')} /> },
    { id: 'navbar', label: 'Navigation', component: <NavbarTab runId={runId} pages={pages} addPage={addPage} updatePage={updatePage} removePage={removePage} isLoading={pagesLoading} onConfirm={() => handleTabConfirm('navbar')} onConfirmAll={handleApproveAll} isConfirmed={confirmedTabs.has('navbar')} /> },
    { id: 'images', label: 'Images', component: <ImagesTab runId={runId} pages={pages} onConfirm={() => handleTabConfirm('images')} isConfirmed={confirmedTabs.has('images')} /> },
    { id: 'paragraphs', label: 'Paragraphs', component: <ParagraphsTab runId={runId} url={url} extractionOptions={extractionOptions} pages={pages} onConfirm={() => handleTabConfirm('paragraphs')} isConfirmed={confirmedTabs.has('paragraphs')} /> },
    { id: 'misc', label: 'Misc', component: <MiscTab runId={runId} /> },
  ] as const;

  const summaryTab = { id: 'summary', label: 'Summary', component: <SummaryTab runId={runId} onApproveAll={handleApproveAll} isConfirmed={confirmedTabs.has('summary')} onConfirm={() => handleTabConfirm('summary')} /> };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
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
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                {confirmedTabs.has(tab.id) && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
              </button>
            ))}
          </div>
          
          {/* Right side - Summary tab with special styling */}
          <button
            onClick={() => setActiveTab(summaryTab.id as typeof activeTab)}
            className={`py-2 px-4 border-b-2 font-semibold text-sm flex items-center space-x-2 rounded-t-lg transition-all ${
              activeTab === summaryTab.id
                ? 'border-blue-500 text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg'
                : 'border-transparent text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg'
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
