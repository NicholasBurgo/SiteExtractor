import React from 'react';

interface ProgressProps {
  lines: string[];
  status: 'idle' | 'running' | 'success' | 'confirmation' | 'error';
}

export function Progress({ lines, status }: ProgressProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <span className="badge pending">Running...</span>;
      case 'success':
        return <span className="badge ok">Success</span>;
      case 'confirmation':
        return <span className="badge ok">Ready for Review</span>;
      case 'error':
        return <span className="badge fail">Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className="card">
      <h3>
        Progress 
        {getStatusBadge()}
      </h3>
      <pre>{lines.join('')}</pre>
    </div>
  );
}

