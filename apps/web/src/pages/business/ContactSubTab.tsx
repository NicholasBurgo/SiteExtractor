import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Phone, Mail, MapPin, Clock, Share2, Check } from 'lucide-react';

interface ContactSubTabProps {
  runId: string;
  url?: string;
  onConfirm?: () => void;
  isConfirmed?: boolean;
  hasExtracted?: boolean; // Add this prop
}

interface ContactData {
  phone: string[];
  email: string[];
  address: string[];
  hours?: Record<string, string>;
  social?: Record<string, string>;
  mapEmbed?: string;
  contacts: Array<{
    name: string;
    title?: string;
    email?: string;
    phone?: string;
    bio?: string;
    image?: string;
  }>;
  extraction_date?: string;
  url?: string;
  error?: string;
}

export function ContactSubTab({ runId, url, onConfirm, isConfirmed = false, hasExtracted = false }: ContactSubTabProps) {
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    loadContactData();
  }, [runId, hasExtracted]);

  const loadContactData = async () => {
    setIsLoading(true);
    try {
      // Only load from localStorage - no individual API calls
      const savedData = localStorage.getItem(`contact-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setContactData(parsed);
      } else if (hasExtracted) {
        // Only show "No Data Found" if extraction has been attempted
        setContactData(null);
      } else {
        // If no extraction has been attempted yet, don't show error
        setContactData(null);
      }
    } catch (error) {
      console.error('Error loading contact data:', error);
      setContactData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const retryContactExtraction = async () => {
    setIsRetrying(true);
    try {
      // Use unified extraction instead of individual contact extraction
      const response = await fetch('/api/extract/unified', {
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
        const contactData = result.extractedData?.contact;
        
        if (contactData) {
          // Save to localStorage
          const dataToSave = {
            ...contactData,
            loadedAt: new Date().toISOString(),
            retriedAt: new Date().toISOString()
          };
          localStorage.setItem(`contact-${runId}`, JSON.stringify(dataToSave));
          
          setContactData(contactData);
        }
      } else {
        console.error('Unified extraction failed');
      }
    } catch (error) {
      console.error('Error retrying unified extraction:', error);
    } finally {
      setIsRetrying(false);
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (contactData) {
      const confirmedData = {
        ...contactData,
        confirmedAt: new Date().toISOString()
      };
      localStorage.setItem(`contact-${runId}`, JSON.stringify(confirmedData));
      onConfirm?.();
    }
  };

  const handleEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = () => {
    if (contactData && editingField) {
      const updatedData = {
        ...contactData,
        [editingField]: editValue,
        editedAt: new Date().toISOString()
      };
      setContactData(updatedData);
      localStorage.setItem(`contact-${runId}`, JSON.stringify(updatedData));
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
        <div className="flex items-center space-x-3">
          {icon}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{label}</h4>
            {isEditing ? (
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
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
                {Array.isArray(value) ? (
                  value.length > 0 ? (
                    <div className="space-y-1">
                      {value.map((item, index) => (
                        <p key={index} className="text-sm text-gray-700">{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Not found</p>
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
            onClick={() => handleEdit(field, Array.isArray(value) ? value.join(', ') : value || '')}
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
            <p className="text-gray-600">Loading contact information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!contactData) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          {hasExtracted ? (
            <>
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Contact Data Found</h3>
              <p className="text-gray-600 mb-4">Unable to extract contact information from the website.</p>
              <button
                onClick={retryContactExtraction}
                disabled={isRetrying}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
              >
                {isRetrying ? 'Retrying...' : 'Retry Extraction'}
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Extracting Contact Information...</h3>
              <p className="text-gray-600 mb-4">Please wait while we extract contact information from the website.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
          <p className="text-gray-600 mt-1">Review and confirm extracted contact details</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={retryContactExtraction}
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
        {renderField('Phone Number', 'phone', contactData.phone, <Phone className="w-5 h-5 text-blue-600" />)}
        {renderField('Email Address', 'email', contactData.email, <Mail className="w-5 h-5 text-green-600" />)}
        {renderField('Address', 'address', contactData.address, <MapPin className="w-5 h-5 text-red-600" />)}
        
        {contactData.hours && Object.keys(contactData.hours).length > 0 && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-900">Business Hours</h4>
            </div>
            <div className="space-y-2">
              {Object.entries(contactData.hours)
                .sort(([a], [b]) => {
                  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                  return dayOrder.indexOf(a) - dayOrder.indexOf(b);
                })
                .map(([day, hours]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 capitalize">{day}:</span>
                  <span className="text-gray-600">{hours}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {contactData.social && Object.keys(contactData.social).length > 0 && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Share2 className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-gray-900">Social Media</h4>
            </div>
            <div className="space-y-2">
              {Object.entries(contactData.social).map(([platform, url]) => (
                <div key={platform} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 capitalize">{platform}:</span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {contactData.mapEmbed && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-gray-900">Map Embed</h4>
            </div>
            <p className="text-sm text-gray-600 break-all">{contactData.mapEmbed}</p>
          </div>
        )}

        {contactData.contacts && contactData.contacts.length > 0 && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Individual Contacts ({contactData.contacts.length})</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactData.contacts.map((contact, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    {contact.image && (
                      <img 
                        src={contact.image} 
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{contact.name}</h5>
                      {contact.title && (
                        <p className="text-sm text-gray-600">{contact.title}</p>
                      )}
                      {contact.email && (
                        <p className="text-sm text-blue-600">{contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-sm text-gray-700">{contact.phone}</p>
                      )}
                      {contact.bio && (
                        <p className="text-xs text-gray-500 mt-1">{contact.bio}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {contactData.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error: {contactData.error}</p>
        </div>
      )}
    </div>
  );
}
