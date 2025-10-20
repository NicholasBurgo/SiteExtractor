interface MiscTabProps {
  runId?: string;
}

export function MiscTab({ runId }: MiscTabProps) {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Miscellaneous</h2>
      </div>

      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Not yet implemented</p>
        </div>
      </div>
    </div>
  );
}
