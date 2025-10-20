import { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { ConfirmPage } from './pages/ConfirmPage';
import './styles.css';

function App() {
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [extractionOptions, setExtractionOptions] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractionComplete = (runId: string, url: string, options: any) => {
    setCurrentRunId(runId);
    setCurrentUrl(url);
    setExtractionOptions(options);
  };

  const handleContinueRun = (runId: string) => {
    setCurrentRunId(runId);
    // We'll need to get the URL and options from the run data
    // For now, we'll set placeholder values
    setCurrentUrl('https://example.com');
    setExtractionOptions({});
  };

  const handleBackToExtraction = () => {
    setCurrentRunId(null);
    setCurrentUrl(null);
    setExtractionOptions(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!currentRunId ? (
        <MainMenu 
          onExtractionComplete={handleExtractionComplete}
          isExtracting={isExtracting}
          setIsExtracting={setIsExtracting}
          onContinueRun={handleContinueRun}
        />
      ) : (
        <ConfirmPage 
          runId={currentRunId}
          url={currentUrl || ''}
          extractionOptions={extractionOptions}
          onBack={handleBackToExtraction}
        />
      )}
    </div>
  );
}

export default App;
