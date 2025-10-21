import { useState, useEffect } from 'react';

export interface Run {
  id: string;
  url: string;
  timestamp: string;
  status: 'extracted' | 'confirmed' | 'generated';
  files: {
    truth: boolean;
    images: boolean;
    navbar: boolean;
    paragraphs: boolean;
    misc: boolean;
  };
}

export function useRunsManager() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setIsLoading(true);
    try {
      // Load runs from the runs directory
      const response = await fetch('/api/runs/list');
      if (response.ok) {
        const runsData = await response.json();
        setRuns((runsData as any).runs || []);
      } else {
        // Fallback: parse runs from directory structure
        const runsData = await parseRunsFromDirectory();
        setRuns(runsData);
      }
    } catch (error) {
      console.error('Failed to load runs:', error);
      // Fallback: parse runs from directory structure
      const runsData = await parseRunsFromDirectory();
      setRuns(runsData);
    } finally {
      setIsLoading(false);
    }
  };

  const parseRunsFromDirectory = async (): Promise<Run[]> => {
    // This would parse the runs directory structure
    // For now, return mock data based on the runs we saw
    const mockRuns: Run[] = [
      {
        id: 'react-template-com-2025-10-12T03-15-25-524356Z',
        url: 'https://react-template.com',
        timestamp: '2025-10-12T03:15:25',
        status: 'extracted',
        files: {
          truth: true,
          images: true,
          navbar: true,
          paragraphs: true,
          misc: true,
        }
      },
      {
        id: 'www-northshoreexteriorupkeep-com-2025-10-20T10-25-42',
        url: 'https://www.northshoreexteriorupkeep.com',
        timestamp: '2025-10-20T10:25:42',
        status: 'extracted',
        files: {
          truth: true,
          images: true,
          navbar: true,
          paragraphs: true,
          misc: true,
        }
      }
    ];
    return mockRuns;
  };

  const deleteRun = async (runId: string) => {
    try {
      const response = await fetch(`/api/runs/${runId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setRuns(prev => prev.filter(run => run.id !== runId));
      }
    } catch (error) {
      console.error('Failed to delete run:', error);
    }
  };

  return {
    runs,
    isLoading,
    deleteRun,
    refreshRuns: loadRuns,
  };
}
