import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Users, Plus, Trash2, Check } from 'lucide-react';
import { ServiceItem } from '@sg/types';

interface ServicesSubTabProps {
  runId: string;
  url?: string;
  onConfirm?: () => void;
  isConfirmed?: boolean;
  hasExtracted?: boolean; // Add this prop
}

export function ServicesSubTab({ runId, url, onConfirm, isConfirmed = false, hasExtracted = false }: ServicesSubTabProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  });

  useEffect(() => {
    loadServicesData();
  }, [runId, hasExtracted]);

  const loadServicesData = async () => {
    setIsLoading(true);
    try {
      // Only load from localStorage - no individual API calls
      const savedData = localStorage.getItem(`services-${runId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setServices(parsed);
      } else if (hasExtracted) {
        // Only show "No Data Found" if extraction has been attempted
        setServices([]);
      } else {
        // If no extraction has been attempted yet, don't show error
        setServices([]);
      }
    } catch (error) {
      console.error('Error loading services data:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const retryServicesExtraction = async () => {
    setIsRetrying(true);
    try {
      // Use unified extraction instead of individual services extraction
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
        const servicesData = result.extractedData?.services || [];
        
        // Save to localStorage
        const dataToSave = {
          ...servicesData,
          loadedAt: new Date().toISOString(),
          retriedAt: new Date().toISOString()
        };
        localStorage.setItem(`services-${runId}`, JSON.stringify(dataToSave));
        
        setServices(servicesData);
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
    const confirmedData = {
      ...services,
      confirmedAt: new Date().toISOString()
    };
    localStorage.setItem(`services-${runId}`, JSON.stringify(confirmedData));
    onConfirm?.();
  };

  const handleServiceStatusChange = (serviceId: string, confirmed: boolean) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId ? { ...service, confirmed } : service
    ));
    saveServicesData();
  };

  const handleEditService = (serviceId: string) => {
    setEditingService(editingService === serviceId ? null : serviceId);
  };

  const handleSaveServiceEdit = (serviceId: string, field: string, value: string) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId ? { ...service, [field]: value } : service
    ));
    setEditingService(null);
    saveServicesData();
  };

  const handleDeleteService = (serviceId: string) => {
    setServices(prev => prev.filter(service => service.id !== serviceId));
    saveServicesData();
  };

  const handleAddService = () => {
    if (newService.name.trim()) {
      const service: ServiceItem = {
        id: `svc-${Date.now()}`,
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        price: newService.price.trim() || null,
        category: newService.category.trim() || null,
        confirmed: false
      };
      
      setServices(prev => [...prev, service]);
      setNewService({ name: '', description: '', price: '', category: '' });
      setShowAddModal(false);
      saveServicesData();
    }
  };

  const saveServicesData = () => {
    try {
      const dataToSave = {
        ...services,
        savedAt: new Date().toISOString(),
        runId
      };
      localStorage.setItem(`services-${runId}`, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save services data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Services</h2>
          <p className="text-gray-600 mt-1">Review and confirm business services</p>
          <p className="text-sm text-gray-500 mt-1">
            {services.filter(s => s.confirmed).length} of {services.length} services confirmed
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={isConfirmed}
            className={`px-6 py-2 text-sm font-medium border border-transparent rounded-full transition-all ${
              isConfirmed 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isConfirmed ? "Section is locked - unconfirm to edit" : "Add new service"}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Service
          </button>
          <button
            onClick={retryServicesExtraction}
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

      {services.length === 0 ? (
        <div className="text-center py-12">
          {hasExtracted ? (
            <>
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Found</h3>
              <p className="text-gray-600 mb-4">No services have been extracted or added yet.</p>
              <button
                onClick={() => setShowAddModal(true)}
                disabled={isConfirmed}
                className={`px-6 py-2 rounded-full transition-all ${
                  isConfirmed 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Add Your First Service
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Extracting Services...</h3>
              <p className="text-gray-600 mb-4">Please wait while we extract business services from the website.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div 
              key={service.id} 
              className={`p-4 border rounded-lg transition-all ${
                service.confirmed 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    {service.category && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {service.category}
                      </span>
                    )}
                  </div>
                  
                  {service.description && (
                    <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                  )}
                  
                  {service.price && (
                    <p className="text-sm font-medium text-green-600">Price: {service.price}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleServiceStatusChange(service.id, !service.confirmed)}
                    disabled={isConfirmed}
                    className={`p-2 rounded-full transition-all ${
                      isConfirmed 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : service.confirmed
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={isConfirmed ? "Section is locked - unconfirm to edit" : service.confirmed ? "Unconfirm service" : "Confirm service"}
                  >
                    {service.confirmed ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => handleEditService(service.id)}
                    disabled={isConfirmed}
                    className={`p-2 rounded-full transition-all ${
                      isConfirmed 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isConfirmed ? "Section is locked - unconfirm to edit" : "Edit service"}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    disabled={isConfirmed}
                    className={`p-2 rounded-full transition-all ${
                      isConfirmed 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                    title={isConfirmed ? "Section is locked - unconfirm to edit" : "Delete service"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Edit Form */}
              {editingService === service.id && !isConfirmed && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        defaultValue={service.name}
                        onChange={(e) => handleSaveServiceEdit(service.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        defaultValue={service.category || ''}
                        onChange={(e) => handleSaveServiceEdit(service.id, 'category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        defaultValue={service.description || ''}
                        onChange={(e) => handleSaveServiceEdit(service.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="text"
                        defaultValue={service.price || ''}
                        onChange={(e) => handleSaveServiceEdit(service.id, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Service</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter service name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newService.category}
                  onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Enter service description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="text"
                  value={newService.price}
                  onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter price"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                disabled={!newService.name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
