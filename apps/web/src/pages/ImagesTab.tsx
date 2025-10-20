import { useState } from 'react';

interface ImagesTabProps {
  runId?: string;
}

export function ImagesTab({ runId }: ImagesTabProps) {
  const [images] = useState([]); // TODO: Load from API

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Images</h2>
        <div className="flex space-x-2">
          <button className="btn btn-secondary">Select All</button>
          <button className="btn btn-primary">Bulk Actions</button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No images found for this run.</p>
          <p className="text-sm text-gray-400 mt-2">Run ID: {runId}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* TODO: Render image cards */}
        </div>
      )}
    </div>
  );
}
