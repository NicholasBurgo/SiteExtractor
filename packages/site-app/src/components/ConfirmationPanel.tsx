import React, { useState } from 'react';
import { ImageConfirmation } from './ImageConfirmation';
import { ContentConfirmation } from './ContentConfirmation';
import { TruthConfirmation } from './TruthConfirmation';
import { Button } from './ui/Button';
import { Image, FileText, CheckCircle, AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

interface ConfirmationPanelProps {
  page: any;
  onComplete: () => void;
  onBack: () => void;
}

type TabType = 'truth' | 'images' | 'paragraphs' | 'misc' | 'summary';

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({ page, onComplete, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('truth');
  const [confirmedTabs, setConfirmedTabs] = useState<Set<TabType>>(new Set());
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  console.log('ConfirmationPanel rendered with page:', page);

  const getConfirmationState = (fieldId: string) => {
    // Simple confirmation state tracking
    return 'pending';
  };

  const confirmItem = (fieldId: string) => {
    console.log('Confirming item:', fieldId);
  };

  const confirmCurrentTab = () => {
    console.log('Confirming current tab:', activeTab);
    setConfirmedTabs(prev => new Set(prev).add(activeTab));
  };

  const handleEditedValuesChange = (newEditedValues: Record<string, any>) => {
    setEditedValues(newEditedValues);
  };

  const retryItem = (fieldId: string) => {
    console.log('Retrying item:', fieldId);
  };

  const editItem = (fieldId: string) => {
    console.log('Editing item:', fieldId);
  };

  const denyItem = (fieldId: string) => {
    console.log('Denying item:', fieldId);
  };

  const approvePage = () => {
    console.log('Approving page');
    onComplete();
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'truth':
        return 'Truth Table';
      case 'images':
        return 'Images extracted';
      case 'paragraphs':
        return 'Paragraphs Extracted';
      case 'misc':
        return 'Misc';
      case 'summary':
        return 'Summary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-success';
      case 'denied':
        return 'text-destructive';
      case 'pending':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'denied':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <RotateCcw className="w-4 h-4 text-warning" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const tabs: TabType[] = ['truth', 'images', 'paragraphs', 'misc', 'summary'];
  
  const getWebsiteName = () => {
    if (page?.source?.url) {
      try {
        return new URL(page.source.url).hostname;
      } catch {
        return 'Website name';
      }
    }
    return 'Website name';
  };

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-4">No Data Available</h2>
          <p className="text-muted-foreground mb-4">No extracted data found to confirm.</p>
          <Button onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Extraction</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          {/* Back to extraction button */}
          <Button
            onClick={onBack}
            variant="outline"
            size="md"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to extraction</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          {/* Center content */}
          <div className="flex-1 flex items-center justify-center space-x-4 sm:space-x-8 mx-4">
            {/* Confirmation title */}
            <div className="text-center">
              <h1 className="text-base sm:text-lg font-semibold text-foreground">Confirmation the Extracted Data</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">Review and validate extracted content</p>
            </div>
            
            {/* Website name */}
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Website</div>
              <div className="text-sm sm:text-base font-medium text-primary truncate max-w-32 sm:max-w-none">{getWebsiteName()}</div>
            </div>
          </div>
          
          {/* Approve All button */}
          <Button
            onClick={approvePage}
            variant="success"
            size="lg"
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Approve All</span>
            <span className="sm:hidden">Approve</span>
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border/30 px-4 sm:px-6 py-4">
        <div className="flex space-x-3 overflow-x-auto">
          {tabs.map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'default' : 'ghost'}
              size="md"
              className="whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                {getTabLabel(tab)}
                {confirmedTabs.has(tab) && (
                  <CheckCircle className="w-4 h-4" />
                )}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background">
        {activeTab === 'truth' && (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="w-full max-w-5xl">
              {(() => {
                const truthData = page?.truth?.value || {};
                console.log('=== RENDERING TRUTH TABLE ===');
                console.log('Page object keys:', page ? Object.keys(page) : 'no page');
                console.log('Truth data:', truthData);
                console.log('Has fields?', !!truthData.fields);
                if (truthData.fields) {
                  console.log('Field keys:', Object.keys(truthData.fields));
                  console.log('Brand name value:', truthData.fields.brand_name?.value);
                  console.log('Email value:', truthData.fields.email?.value);
                }
                return (
                  <TruthConfirmation
                    truthData={truthData}
                    confirmItem={confirmItem}
                    retryItem={retryItem}
                    editItem={editItem}
                    denyItem={denyItem}
                    getConfirmationState={getConfirmationState}
                    onConfirmAll={confirmCurrentTab}
                    editedValues={editedValues}
                    onEditedValuesChange={handleEditedValuesChange}
                  />
                );
              })()}
            </div>
          </div>
        )}
        
        {activeTab === 'images' && (
          <ImageConfirmation 
            page={page}
            confirmItem={confirmItem}
            retryItem={retryItem}
            editItem={editItem}
            denyItem={denyItem}
            getConfirmationState={getConfirmationState}
          />
        )}
        
        {activeTab === 'paragraphs' && (
          <div className="p-6 text-muted-foreground">
            Paragraphs content coming soon...
          </div>
        )}
        
        {activeTab === 'misc' && (
          <div className="p-6 text-muted-foreground">
            Miscellaneous content coming soon...
          </div>
        )}
        
        {activeTab === 'summary' && (
          <div className="p-6 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Extraction Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-foreground/80">Images Found</div>
                  <div className="text-2xl font-bold text-foreground">
                    {page?.images?.value?.length || 0}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-foreground/80">Content Blocks</div>
                  <div className="text-2xl font-bold text-foreground">
                    {page?.blocks?.value?.length || 0}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-foreground/80">Navigation Items</div>
                  <div className="text-2xl font-bold text-foreground">
                    {page?.navbar?.value?.length || 0}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-foreground/80">Links Found</div>
                  <div className="text-2xl font-bold text-foreground">
                    {page?.links?.value?.length || 0}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Page Metadata</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-foreground/80">Title:</span>
                  <span className="text-foreground">{page?.meta?.value?.title || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/80">Description:</span>
                  <span className="text-foreground">{page?.meta?.value?.description || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/80">Canonical URL:</span>
                  <span className="text-foreground">{page?.meta?.value?.canonical || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};