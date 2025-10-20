import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Scale, FileText, Check } from 'lucide-react';

interface LegalSubTabProps {
  runId: string;
  url?: string;
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

interface LegalData {
  privacyPolicy?: string;
  termsOfService?: string;
  cookiePolicy?: string;
  disclaimer?: string;
  copyright?: string;
  extraction_date?: string;
  url?: string;
  error?: string;
}

export function LegalSubTab({ runId, url, onConfirm, isConfirmed = false }: LegalSubTabProps) {
  const [legalData, setLegalData] = useState<LegalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    loadLegalData();
  }, [runId]);

  const loadLegalData = async () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem(`legal-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setLegalData(parsed);
        setIsLoading(false);
        return;
      }

      // If no saved data, try to extract
      await retryLegalExtraction();
    } catch (error) {
      console.error('Error loading legal data:', error);
      setIsLoading(false);
    }
  };

  const retryLegalExtraction = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/extract/legal', {
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
        localStorage.setItem(`legal-${runId}`, JSON.stringify(dataToSave));
        
        setLegalData(data);
      } else {
        console.error('Legal extraction failed');
      }
    } catch (error) {
      console.error('Error retrying legal extraction:', error);
    } finally {
      setIsRetrying(false);
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (legalData) {
      const confirmedData = {
        ...legalData,
        confirmedAt: new Date().toISOString()
      };
      localStorage.setItem(`legal-${runId}`, JSON.stringify(confirmedData));
      onConfirm?.();
    }
  };

  const handleEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = () => {
    if (legalData && editingField) {
      const updatedData = {
        ...legalData,
        [editingField]: editValue,
        editedAt: new Date().toISOString()
      };
      setLegalData(updatedData);
      localStorage.setItem(`legal-${runId}`, JSON.stringify(updatedData));
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (label: string, field: string, value: any, icon: React.ReactNode) => {
    const isEditing = editingField === field;
    
    return (
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3 flex-1">
          {icon}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{label}</h4>
            {isEditing ? (
              <div className="flex items-center space-x-2 mt-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                  rows={3}
                />
                <div className="flex flex-col space-y-1">
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
              </div>
            ) : (
              <div className="mt-1">
                {value ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
                ) : (
                  <p className="text-sm text-gray-600">Not found</p>
                )}
              </div>
            )}
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => handleEdit(field, value || '')}
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
            <p className="text-gray-600">Loading legal information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!legalData) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Legal Data Found</h3>
          <p className="text-gray-600 mb-4">Unable to extract legal information from the website.</p>
          <button
            onClick={retryLegalExtraction}
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
          <h2 className="text-xl font-semibold text-gray-900">Legal Information</h2>
          <p className="text-gray-600 mt-1">Review and confirm legal documents and policies</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={retryLegalExtraction}
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
        {renderField('Privacy Policy', 'privacyPolicy', legalData.privacyPolicy, <FileText className="w-5 h-5 text-blue-600" />)}
        {renderField('Terms of Service', 'termsOfService', legalData.termsOfService, <Scale className="w-5 h-5 text-green-600" />)}
        {renderField('Cookie Policy', 'cookiePolicy', legalData.cookiePolicy, <FileText className="w-5 h-5 text-purple-600" />)}
        {renderField('Disclaimer', 'disclaimer', legalData.disclaimer, <FileText className="w-5 h-5 text-orange-600" />)}
        {renderField('Copyright Notice', 'copyright', legalData.copyright, <FileText className="w-5 h-5 text-red-600" />)}
      </div>

      {legalData.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error: {legalData.error}</p>
        </div>
      )}
    </div>
  );
}
