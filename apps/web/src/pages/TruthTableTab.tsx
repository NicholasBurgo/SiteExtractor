import { useState, useEffect } from 'react';

interface TruthTableTabProps {
  runId: string;
  url?: string;
  extractionOptions?: any;
  onConfirm?: () => void;
  onConfirmAll?: () => void;
  isConfirmed?: boolean;
}

interface TruthTableField {
  field: string;
  value: string | null | string[];
  confidence: number;
  status: 'Found' | 'Not Found' | 'Pending' | 'Edited' | 'Removed';
}

export function TruthTableTab({ runId, url, extractionOptions, onConfirm, onConfirmAll, isConfirmed = false }: TruthTableTabProps) {
  const [fields, setFields] = useState<TruthTableField[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Field mapping from Python script to display names
  const fieldMapping: { [key: string]: string } = {
    'brand_name': 'Brand Name',
    'location': 'Location',
    'email': 'Email',
    'phone': 'Phone',
    'socials': 'Social Media',
    'services': 'Services',
    'brand_colors': 'Colors',
    'logo': 'Logo',
    'background': 'Background',
    'slogan': 'Slogan',
  };

  useEffect(() => {
    loadTruthTableData();
  }, [runId]);

  const loadTruthTableData = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        // Desktop app mode - get data from Electron
        const data = await window.electronAPI.getExtractionData(runId);
        if (data && data.fields) {
          const formattedFields = Object.entries(data.fields).map(([key, field]: [string, any]) => ({
            field: fieldMapping[key] || key,
            value: field.value,
            confidence: field.confidence,
            status: field.value ? 'Found' : 'Not Found'
          }));
          setFields(formattedFields);
        }
      } else {
        // Web mode - mock data
        setFields([
          { field: 'Brand Name', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Location', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Email', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Phone', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Social Media', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Services', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Colors', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Logo', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Background', value: null, confidence: 0.00, status: 'Not Found' },
          { field: 'Slogan', value: null, confidence: 0.00, status: 'Not Found' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load truth table data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!url || !window.electronAPI) return;
    
    setIsRetrying(true);
    try {
      const result = await window.electronAPI.retryTruthTable(url, extractionOptions);
      if (result.success && result.truthData) {
        const formattedFields = Object.entries(result.truthData.fields).map(([key, field]: [string, any]) => ({
          field: fieldMapping[key] || key,
          value: field.value,
          confidence: field.confidence,
          status: field.value ? 'Found' : 'Not Found'
        }));
        setFields(formattedFields);
        
        // Save the retry results
        localStorage.setItem(`truth-table-${runId}`, JSON.stringify({
          fields: formattedFields,
          retriedAt: new Date().toISOString(),
          runId,
          isRetry: true
        }));
        
        console.log('Retry results saved successfully');
      }
    } catch (error) {
      console.error('Retry failed:', error);
      alert(`Retry failed: ${error}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const saveTruthTableData = async () => {
    try {
      // Save the current truth table state
      console.log('Saving truth table data:', fields);
      
      localStorage.setItem(`truth-table-${runId}`, JSON.stringify({
        fields,
        confirmedAt: new Date().toISOString(),
        runId,
        editedFields: fields.filter(f => f.status === 'Edited' || f.status === 'Removed').map(f => ({
          field: f.field,
          originalValue: f.status === 'Removed' ? 'original_value_here' : f.value,
          newValue: f.value,
          status: f.status
        }))
      }));
      
      console.log('Truth table data saved successfully');
    } catch (error) {
      console.error('Failed to save truth table data:', error);
    }
  };

  const handleConfirmAll = async () => {
    // Save truth table data first
    await saveTruthTableData();
    
    // Confirm only the truth table tab
    const truthTableData = localStorage.getItem(`truth-table-${runId}`);
    if (truthTableData) {
      const parsed = JSON.parse(truthTableData);
      localStorage.setItem(`truth-table-${runId}`, JSON.stringify({
        ...parsed,
        confirmedAt: new Date().toISOString()
      }));
    }

    // Trigger the confirm callback to update tab checkmark
    onConfirm?.();
    
    console.log('Truth table tab confirmed');
  };

  const startEditing = (fieldName: string, currentValue: string | null | string[]) => {
    if (isConfirmed) return; // Prevent editing when confirmed
    setEditingField(fieldName);
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || ''));
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = (fieldName: string) => {
    const trimmedValue = editValue.trim();
    
    setFields(prevFields => prevFields.map(field => {
      if (field.field === fieldName) {
        const newStatus = trimmedValue === '' ? 'Removed' : 'Edited';
        const newValue = trimmedValue === '' ? null : trimmedValue;
        
        return {
          ...field,
          value: newValue,
          status: newStatus,
          confidence: newStatus === 'Removed' ? 0 : field.confidence
        };
      }
      return field;
    }));
    
    setEditingField(null);
    setEditValue('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Found':
        return 'text-green-600 bg-green-100';
      case 'Not Found':
        return 'text-red-600 bg-red-100';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'Edited':
        return 'text-blue-600 bg-blue-100';
      case 'Removed':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) {
      return 'text-green-700 bg-green-100'; // High confidence - Green
    } else if (confidence >= 0.6) {
      return 'text-yellow-700 bg-yellow-100'; // Medium confidence - Yellow
    } else if (confidence >= 0.3) {
      return 'text-orange-700 bg-orange-100'; // Low confidence - Orange
    } else {
      return 'text-red-700 bg-red-100'; // Very low/no confidence - Red
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Truth Table</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleRetry}
            disabled={isRetrying || !url}
            className="px-4 py-2 text-sm font-medium text-black bg-yellow-400 border border-transparent rounded-full hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button 
            onClick={() => {
              if (isConfirmed) {
                onConfirm?.();
              } else {
                handleConfirmAll();
              }
            }}
            className={`px-4 py-2 text-sm font-medium border border-transparent rounded-full focus:outline-none focus:ring-2 ${
              isConfirmed 
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isConfirmed ? 'Unconfirm All' : 'Confirm All'}
          </button>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  FIELD
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VALUE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CONFIDENCE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {field.field}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    {editingField === field.field ? (
                      <div className="flex flex-col space-y-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(field.field);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(field.field)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`px-2 py-1 rounded break-words ${
                          isConfirmed 
                            ? 'cursor-not-allowed bg-gray-100 text-gray-500' 
                            : 'cursor-pointer hover:bg-gray-100'
                        }`}
                        onClick={() => startEditing(field.field, field.value)}
                        title={isConfirmed ? "Section is locked - unconfirm to edit" : "Click to edit"}
                      >
                        {field.value || 'null'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(field.confidence)}`}>
                      {field.confidence.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(field.status)}`}>
                      {field.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
