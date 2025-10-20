import { useState } from 'react';
import { ExtractionForm } from './components/ExtractionForm';
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

  const handleBackToExtraction = () => {
    setCurrentRunId(null);
    setCurrentUrl(null);
    setExtractionOptions(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!currentRunId ? (
        <ExtractionForm 
          onExtractionComplete={handleExtractionComplete}
          isExtracting={isExtracting}
          setIsExtracting={setIsExtracting}
        />
      ) : (
        <ConfirmPage 
          runId={currentRunId}
          url={currentUrl}
          extractionOptions={extractionOptions}
          onBack={handleBackToExtraction}
        />
      )}
    </div>
  );
}

export default App;
