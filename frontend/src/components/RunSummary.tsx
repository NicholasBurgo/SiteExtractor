import React from 'react';
import { RunProgress } from '../lib/types';

interface RunSummaryProps {
  progress: RunProgress | null;
  isRunning: boolean;
}

export function RunSummary({ progress, isRunning }: RunSummaryProps) {
  if (!progress) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900">Run Summary</h3>
        <p className="text-sm text-gray-500 mt-1">No active run</p>
      </div>
    );
  }

  const { queued, visited, errors, etaSeconds } = progress;
  const total = queued + visited;
  const progressPercent = total > 0 ? (visited / total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Run Progress</h3>
        <span className={`px-2 py-1 rounded text-xs ${
          isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isRunning ? 'Running' : 'Completed'}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{visited} / {total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Queued</div>
            <div className="font-medium">{queued}</div>
          </div>
          <div>
            <div className="text-gray-500">Visited</div>
            <div className="font-medium text-green-600">{visited}</div>
          </div>
          <div>
            <div className="text-gray-500">Errors</div>
            <div className="font-medium text-red-600">{errors}</div>
          </div>
        </div>
        
        {etaSeconds && (
          <div className="text-sm text-gray-500">
            ETA: {Math.round(etaSeconds / 60)} minutes
          </div>
        )}
      </div>
    </div>
  );
}