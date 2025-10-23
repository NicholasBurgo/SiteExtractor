/**
 * Checkpoint component for showing run progress and management options.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface RunProgress {
  runId: string;
  queued: number;
  visited: number;
  errors: number;
  etaSeconds: number | null;
  hosts: Record<string, number>;
}

interface RunMeta {
  run_id: string;
  started_at: number;
  status: string;
  completed_at?: number;
  url?: string;
  maxPages?: number;
  maxDepth?: number;
}

interface CheckpointProps {
  onContinue?: () => void;
  onDelete?: () => void;
}

const Checkpoint: React.FC<CheckpointProps> = ({ onContinue, onDelete }) => {
  const navigate = useNavigate();
  const { runId } = useParams<{ runId: string }>();
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [meta, setMeta] = useState<RunMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (runId) {
      loadCheckpointData();
    }
  }, [runId]);

  const loadCheckpointData = async () => {
    if (!runId) return;
    
    try {
      setLoading(true);
      
      // Load progress data
      const progressResponse = await fetch(`/api/runs/${runId}/progress`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setProgress(progressData);
      }

      // Load meta data
      const metaResponse = await fetch(`/api/runs/${runId}/meta`);
      if (metaResponse.ok) {
        const metaData = await metaResponse.json();
        setMeta(metaData);
      }
    } catch (error) {
      console.error('Error loading checkpoint data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!runId) return;
    
    if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/runs/${runId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (onDelete) {
          onDelete();
        } else {
          navigate('/');
        }
      } else {
        alert('Failed to delete run');
      }
    } catch (error) {
      console.error('Error deleting run:', error);
      alert('Failed to delete run');
    } finally {
      setDeleting(false);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else if (runId) {
      navigate(`/confirm/${runId}`);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
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

  const getProgressPercentage = () => {
    if (!progress || !meta) return 0;
    
    const total = progress.queued + progress.visited;
    if (total === 0) return 0;
    
    return Math.round((progress.visited / total) * 100);
  };

  if (!runId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No run ID provided</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-4"
          >
            Back to Generator
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkpoint...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-xl font-semibold">Run Checkpoint</h1>
              <p className="text-sm text-gray-600 mt-1">Run ID: {runId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Run Overview Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Run Overview</h2>
            {meta && (
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(meta.status)}`}>
                {meta.status.charAt(0).toUpperCase() + meta.status.slice(1)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Run Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Run Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Started:</span>
                  <span>{meta ? formatTimestamp(meta.started_at) : 'Unknown'}</span>
                </div>
                {meta?.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span>{formatTimestamp(meta.completed_at)}</span>
                  </div>
                )}
                {meta?.url && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">URL:</span>
                    <span className="text-blue-600 truncate max-w-xs" title={meta.url}>
                      {meta.url}
                    </span>
                  </div>
                )}
                {meta?.maxPages && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Pages:</span>
                    <span>{meta.maxPages}</span>
                  </div>
                )}
                {meta?.maxDepth && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Depth:</span>
                    <span>{meta.maxDepth}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Stats */}
            {progress && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Progress Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages Visited:</span>
                    <span className="font-medium">{progress.visited}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages Queued:</span>
                    <span className="font-medium">{progress.queued}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Errors:</span>
                    <span className="font-medium text-red-600">{progress.errors}</span>
                  </div>
                  {progress.etaSeconds && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ETA:</span>
                      <span className="font-medium">{formatDuration(progress.etaSeconds)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress && meta?.status === 'running' && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue to Confirmation
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Run'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkpoint;
