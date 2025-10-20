import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Building2, Tag, Palette, FileText, Check } from 'lucide-react';
import { Meta, BusinessType } from '@sg/types';

interface IdentitySubTabProps {
  runId: string;
  url?: string;
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

export function IdentitySubTab({ runId, url, onConfirm, isConfirmed = false }: IdentitySubTabProps) {
  const [metaData, setMetaData] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    loadMetaData();
  }, [runId]);

  const loadMetaData = async () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem(`meta-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setMetaData(parsed);
        setIsLoading(false);
        return;
      }

      // If no saved data, try to extract
      await retryMetaExtraction();
    } catch (error) {
      console.error('Error loading meta data:', error);
      setIsLoading(false);
    }
  };

  const retryMetaExtraction = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/extract/meta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url || 'https://example.com',
          runId: runId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.result;
        
        // Save to localStorage
        const dataToSave = {
          ...data,
          loadedAt: new Date().toISOString(),
          retriedAt: new Date().toISOString()
        };
        localStorage.setItem(`meta-${runId}`, JSON.stringify(dataToSave));
        
        setMetaData(data);
      } else {
        console.error('Meta extraction failed');
      }
    } catch (error) {
      console.error('Error retrying meta extraction:', error);
    } finally {
      setIsRetrying(false);
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (metaData) {
      const confirmedData = {
        ...metaData,
        confirmedAt: new Date().toISOString()
      };
      localStorage.setItem(`meta-${runId}`, JSON.stringify(confirmedData));
      onConfirm?.();
    }
  };

  const handleEdit = (field: string, value: string | string[] | null) => {
    setEditingField(field);
    setEditValue(Array.isArray(value) ? value.join(', ') : value || '');
  };

  const handleSaveEdit = () => {
    if (metaData && editingField) {
      let updatedValue: any = editValue;
      
      // Handle special cases
      if (editingField === 'colors') {
        updatedValue = editValue.split(',').map(c => c.trim()).filter(c => c);
      } else if (editingField === 'businessType') {
        updatedValue = editValue as BusinessType;
      }
      
      const updatedData = {
        ...metaData,
        [editingField]: updatedValue,
        editedAt: new Date().toISOString()
      };
      setMetaData(updatedData);
      localStorage.setItem(`meta-${runId}`, JSON.stringify(updatedData));
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (label: string, field: string, value: any, icon: React.ReactNode, required = false) => {
    const isEditing = editingField === field;
    
    return (
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3 flex-1">
          {icon}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">{label}</h4>
              {required && <span className="text-red-500 text-sm">*</span>}
            </div>
            {isEditing ? (
              <div className="flex items-center space-x-2 mt-1">
                {field === 'businessType' ? (
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="services">Services</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="law">Law</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                    placeholder={field === 'colors' ? 'Enter colors separated by commas' : ''}
                  />
                )}
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded-full hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1">
                {field === 'colors' && Array.isArray(value) ? (
                  value.length > 0 ? (
                    <div className="flex items-center space-x-2">
                      {value.map((color, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <div 
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm text-gray-700">{color}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No colors found</p>
                  )
                ) : (
                  <p className="text-sm text-gray-600">{value || 'Not found'}</p>
                )}
              </div>
            )}
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => handleEdit(field, value)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading business identity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metaData) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Identity Data Found</h3>
          <p className="text-gray-600 mb-4">Unable to extract business identity information from the website.</p>
          <button
            onClick={retryMetaExtraction}
            disabled={isRetrying}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry Extraction'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Business Identity</h2>
          <p className="text-gray-600 mt-1">Review and confirm business identity information</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={retryMetaExtraction}
            disabled={isRetrying}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 text-sm font-medium border border-transparent rounded-full focus:outline-none focus:ring-2 ${
              isConfirmed 
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isConfirmed ? (
              <>
                <XCircle className="w-4 h-4 inline mr-2" />
                Unconfirm
              </>
            ) : (
              <>
                <Check className="w-4 h-4 inline mr-2" />
                Confirm
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {renderField('Business Name', 'businessName', metaData.businessName, <Building2 className="w-5 h-5 text-blue-600" />, true)}
        {renderField('Business Type', 'businessType', metaData.businessType, <Tag className="w-5 h-5 text-green-600" />, true)}
        {renderField('Slogan', 'slogan', metaData.slogan, <FileText className="w-5 h-5 text-purple-600" />)}
        {renderField('Background', 'background', metaData.background, <FileText className="w-5 h-5 text-orange-600" />)}
        {renderField('Brand Colors', 'colors', metaData.colors, <Palette className="w-5 h-5 text-pink-600" />)}
      </div>

      {metaData.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error: {metaData.error}</p>
        </div>
      )}
    </div>
  );
}
