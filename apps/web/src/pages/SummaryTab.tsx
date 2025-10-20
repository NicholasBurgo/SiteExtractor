interface SummaryTabProps {
  runId: string;
  onApproveAll?: () => void;
}

export function SummaryTab({ runId, onApproveAll }: SummaryTabProps) {
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

    // Trigger the approve all callback to update tab checkmarks
    onApproveAll?.();
    
    console.log('All tabs approved successfully');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
        <div className="flex space-x-3">
          <button 
            onClick={handleApproveAll}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Approve All
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Continue & Package
          </button>
        </div>
      </div>
      
      <div className="text-center py-12 text-gray-500">
        <p>Summary content will be displayed here.</p>
        <p className="text-sm mt-2">Run ID: {runId}</p>
      </div>
    </div>
  );
}
