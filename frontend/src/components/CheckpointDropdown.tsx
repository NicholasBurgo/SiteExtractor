/**
 * Checkpoint dropdown component for showing available runs.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface RunInfo {
  runId: string;
  status: string;
  started_at: number;
  completed_at?: number;
  url?: string;
}

interface CheckpointDropdownProps {
  className?: string;
}

const CheckpointDropdown: React.FC<CheckpointDropdownProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadRuns();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/runs/list');
      if (response.ok) {
        const runsData = await response.json();
        setRuns(runsData);
      }
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deletingAll) return;

    const confirmed = window.confirm('Are you sure you want to delete all checkpoints? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingAll(true);
      const response = await fetch('/api/runs/delete-all', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete all failed with status ${response.status}`);
      }

      await loadRuns();
      setIsOpen(false);
    } catch (error) {
      console.error('Error deleting all runs:', error);
      alert('Failed to delete all checkpoints. Please try again.');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleRunSelect = (runId: string) => {
    navigate(`/checkpoint/${runId}`);
    setIsOpen(false);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'stopped':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-2.5 bg-white/80 border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm hover:bg-white transition-colors"
      >
        <span>🕒</span>
        Checkpoint
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Available Runs</h3>
            <p className="text-xs text-gray-600 mt-1">Select a run to view its checkpoint</p>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading runs...</p>
              </div>
            ) : runs.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-2xl mb-2">📭</div>
                <p className="text-sm text-gray-600">No runs found</p>
                <p className="text-xs text-gray-500 mt-1">Start a run to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {runs.map((run) => (
                  <button
                    key={run.runId}
                    onClick={() => handleRunSelect(run.runId)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Run {run.runId}</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(run.status)}`}>
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Started: {formatTimestamp(run.started_at)}</div>
                      {run.completed_at && (
                        <div>Completed: {formatTimestamp(run.completed_at)}</div>
                      )}
                      {run.url && (
                        <div className="truncate max-w-xs">
                          <span className="text-blue-600">{run.url}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll || runs.length === 0}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deletingAll ? 'Deleting...' : 'Delete All Checkpoints'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckpointDropdown;
