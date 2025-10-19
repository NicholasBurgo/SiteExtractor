import React from 'react';

interface ResultProps {
  out: string;
}

export function Result({ out }: ResultProps) {
  const handleOpenFolder = () => {
    console.log('Opening folder:', out);
    // Ensure we have a valid path
    const pathToOpen = out && out !== '.' ? out : './build/extract';
    window.SG.openPath(pathToOpen);
  };

  const handleOpenIndex = () => {
    console.log('Opening index:', out);
    const pathToOpen = out && out !== '.' ? out : './build/extract';
    window.SG.openPath(pathToOpen + '/index.html');
  };

  const handleCopyPreviewUrl = () => {
    const previewUrl = `file://${out}/index.html`;
    navigator.clipboard.writeText(previewUrl);
  };

  return (
    <div className="card">
      <h3>✅ Generation Complete!</h3>
      <p>Your site has been generated successfully.</p>
      <div className="row">
        <button onClick={handleOpenFolder}>
          📁 Open Folder
        </button>
        <button onClick={handleOpenIndex}>
          🌐 Open index.html
        </button>
        <button className="secondary" onClick={handleCopyPreviewUrl}>
          📋 Copy Preview URL
        </button>
      </div>
    </div>
  );
}
