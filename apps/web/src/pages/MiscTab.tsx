import { useState } from 'react';

interface MiscTabProps {
  runId?: string;
}

export function MiscTab({ runId }: MiscTabProps) {
  const [misc] = useState({}); // TODO: Load from API

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Miscellaneous</h2>
        <div className="flex space-x-2">
          <button className="btn btn-secondary">Reset</button>
          <button className="btn btn-primary">Save Changes</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Colors</h3>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-500 text-sm">No colors detected</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Open Graph</h3>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-500 text-sm">No OG tags found</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Schema.org</h3>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-500 text-sm">No schema.org data found</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Favicon</h3>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-500 text-sm">No favicon found</p>
          </div>
        </div>
      </div>
    </div>
  );
}
