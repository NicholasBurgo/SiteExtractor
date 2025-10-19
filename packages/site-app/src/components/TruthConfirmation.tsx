import React, { useState } from 'react';
import { Button } from './ui/Button';
import { CheckCircle, XCircle, RotateCcw, Edit3 } from 'lucide-react';

interface TruthConfirmationProps {
  truthData: any;
  confirmItem: (fieldId: string) => void;
  retryItem: (fieldId: string) => void;
  editItem: (fieldId: string) => void;
  denyItem: (fieldId: string) => void;
  getConfirmationState: (fieldId: string) => string;
  onConfirmAll?: () => void;
  editedValues: Record<string, any>;
  onEditedValuesChange: (values: Record<string, any>) => void;
}

export const TruthConfirmation: React.FC<TruthConfirmationProps> = ({
  truthData,
  confirmItem,
  retryItem,
  editItem,
  denyItem,
  getConfirmationState,
  onConfirmAll,
  editedValues,
  onEditedValuesChange
}) => {
  const [confirmationStates, setConfirmationStates] = useState<Record<string, string>>({});
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [editInputValues, setEditInputValues] = useState<Record<string, string>>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-success';
      case 'denied':
        return 'text-destructive';
      case 'pending':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) {
      return 'text-[#5bd778]'; // Green for high confidence
    } else if (confidence >= 0.5) {
      return 'text-[#ffcc66]'; // Yellow/orange for medium confidence
    } else {
      return 'text-[#ff5c5c]'; // Red for low confidence
    }
  };

  const formatFieldValue = (fieldKey: string, value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }

    switch (fieldKey) {
      case 'socials':
        if (typeof value === 'object' && value !== null) {
          const platforms = Object.values(value).filter(v => v !== null && v !== undefined);
          return `${platforms.length} platforms`;
        }
        return 'null';
      
      case 'services':
        if (Array.isArray(value)) {
          if (value.length === 0) return 'null';
          if (value.length <= 2) {
            return value.join(', ');
          } else {
            return `${value.slice(0, 2).join(', ')} (+${value.length - 2} more)`;
          }
        }
        return 'null';
      
      case 'brand_colors':
        if (Array.isArray(value) && value.length > 0) {
          return value[0]; // Show primary color
        }
        return 'null';
      
      case 'background':
      case 'slogan':
        if (typeof value === 'string') {
          if (value.length > 50) {
            return value.substring(0, 47) + '...';
          }
          return value;
        }
        return 'null';
      
      default:
        return String(value);
    }
  };

  const getFieldStatus = (fieldKey: string, value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'Not Found';
    }
    
    if (fieldKey === 'socials' && typeof value === 'object') {
      const platforms = Object.values(value).filter(v => v !== null && v !== undefined);
      return platforms.length > 0 ? 'Found' : 'Not Found';
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 ? 'Found' : 'Not Found';
    }
    
    return 'Found';
  };

  const fieldDisplayNames: Record<string, string> = {
    brand_name: 'Brand Name',
    location: 'Location',
    email: 'Email',
    phone: 'Phone',
    socials: 'Social Media',
    services: 'Services',
    brand_colors: 'Colors',
    logo: 'Logo',
    background: 'Background',
    slogan: 'Slogan'
  };

  const handleAction = (fieldKey: string, action: string) => {
    setConfirmationStates(prev => ({
      ...prev,
      [fieldKey]: action
    }));

    switch (action) {
      case 'confirm':
        confirmItem(fieldKey);
        if (fieldKey === 'all' && onConfirmAll) {
          onConfirmAll();
        }
        break;
      case 'retry':
        retryItem(fieldKey);
        break;
      case 'edit':
        editItem(fieldKey);
        break;
      case 'deny':
        denyItem(fieldKey);
        break;
    }
  };

  // Always get the fields data, even if it's empty
  const fields = truthData?.fields || {};

  return (
    <div>
      {/* Table Container with Sleek Tech theme colors */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-6 px-6 py-4 border-b border-border bg-background/50">
          <div className="col-span-3 text-xs font-semibold text-foreground uppercase tracking-wider">FIELD</div>
          <div className="col-span-4 text-xs font-semibold text-foreground uppercase tracking-wider">VALUE</div>
          <div className="col-span-2 text-xs font-semibold text-foreground uppercase tracking-wider">CONFIDENCE</div>
          <div className="col-span-3 text-xs font-semibold text-foreground uppercase tracking-wider">STATUS</div>
        </div>

        {/* Table Rows - ALWAYS show all 10 fields */}
        {Object.entries(fieldDisplayNames).map(([fieldKey, displayName], index) => {
          const fieldData = fields[fieldKey];
          const originalValue = fieldData?.value;
          const isEdited = editedValues.hasOwnProperty(fieldKey);
          const value = isEdited ? editedValues[fieldKey] : originalValue;
          
          // Calculate confidence: 0 if edited and empty, otherwise use original
          const confidence = isEdited && (editedValues[fieldKey] === '' || editedValues[fieldKey] === null) 
            ? 0 
            : (fieldData?.confidence || 0);
          
          const status = getFieldStatus(fieldKey, value);
          const displayValue = formatFieldValue(fieldKey, value);
          const isEditingThis = editingFields.has(fieldKey);
          const currentInputValue = editInputValues[fieldKey] || '';

          const handleValueClick = () => {
            setEditingFields(prev => new Set(prev).add(fieldKey));
            setEditInputValues(prev => ({ ...prev, [fieldKey]: String(value || '') }));
          };

          const handleSaveEdit = () => {
            onEditedValuesChange({ ...editedValues, [fieldKey]: currentInputValue });
            setEditingFields(prev => {
              const newSet = new Set(prev);
              newSet.delete(fieldKey);
              return newSet;
            });
          };

          const handleCancelEdit = () => {
            setEditingFields(prev => {
              const newSet = new Set(prev);
              newSet.delete(fieldKey);
              return newSet;
            });
            setEditInputValues(prev => {
              const newValues = { ...prev };
              delete newValues[fieldKey];
              return newValues;
            });
          };

          return (
            <div 
              key={fieldKey} 
              className={`grid grid-cols-12 gap-6 px-6 py-4 hover:bg-muted/30 transition-colors ${index < Object.keys(fieldDisplayNames).length - 1 ? 'border-b border-border' : ''}`}
            >
              {/* Field Name */}
              <div className="col-span-3 text-sm font-medium text-foreground">
                {displayName}
              </div>
              
              {/* Value - Clickable to edit */}
              <div className="col-span-4 text-sm">
                {isEditingThis ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={currentInputValue}
                      onChange={(e) => setEditInputValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border-2 border-primary rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-1.5 bg-success text-success-foreground rounded-full text-xs font-semibold hover:bg-success/90 transition-all shadow-md hover:shadow-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-1.5 bg-muted text-foreground rounded-full text-xs font-semibold hover:bg-muted/80 transition-all shadow-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handleValueClick}
                    className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                  >
                    {displayValue}
                  </div>
                )}
              </div>
              
              {/* Confidence - Show confidence value or 0.00 for empty edits */}
              <div className={`col-span-2 text-sm font-semibold ${getConfidenceColor(confidence)}`}>
                {confidence.toFixed(2)}
              </div>
              
              {/* Status */}
              <div className={`col-span-3 text-sm font-semibold ${status === 'Found' ? 'text-success' : 'text-destructive'}`}>
                {status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons - Pill Shaped with Theme Colors */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <Button
          onClick={() => handleAction('all', 'confirm')}
          variant="success"
          size="lg"
        >
          Confirm
        </Button>
        
        <Button
          onClick={() => handleAction('all', 'retry')}
          variant="warning"
          size="lg"
        >
          Retry
        </Button>
      </div>
    </div>
  );
};
