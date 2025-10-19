import React, { useState } from 'react';
import { Button } from './ui/Button';
import { CheckCircle, XCircle, RotateCcw, Edit3, Eye, EyeOff } from 'lucide-react';
import { TruthConfirmation } from './TruthConfirmation';

interface ContentConfirmationProps {
  page: any;
  confirmItem: (fieldId: string) => void;
  retryItem: (fieldId: string) => void;
  editItem: (fieldId: string) => void;
  denyItem: (fieldId: string) => void;
  getConfirmationState: (fieldId: string) => string;
}

export const ContentConfirmation: React.FC<ContentConfirmationProps> = ({
  page,
  confirmItem,
  retryItem,
  editItem,
  denyItem,
  getConfirmationState
}) => {
  const [showNotes, setShowNotes] = useState(false);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <RotateCcw className="w-4 h-4 text-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const FieldItem: React.FC<{ 
    fieldId: string; 
    title: string; 
    content: any; 
    notes?: string;
  }> = ({ fieldId, title, content, notes }) => {
    const status = getConfirmationState(fieldId);

    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <h4 className="font-medium text-foreground">{title}</h4>
            <div className="text-sm text-foreground/90">
              {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </div>
            {notes && (
              <div className="text-xs text-muted-foreground">
                <strong>Notes:</strong> {notes}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {getStatusIcon(status)}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="success"
            onClick={() => confirmItem(fieldId)}
            className="flex items-center space-x-1"
          >
            <CheckCircle className="w-3 h-3" />
            <span>Confirm</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => retryItem(fieldId)}
            className="flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => editItem(fieldId)}
            className="flex items-center space-x-1"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => denyItem(fieldId)}
            className="flex items-center space-x-1"
          >
            <XCircle className="w-3 h-3" />
            <span>Deny</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Content Confirmation</h2>
        <div className="text-sm text-muted-foreground">
          Review and confirm extracted content
        </div>
      </div>

      {/* Meta Information */}
      {page?.meta?.value && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Page Metadata</h3>
          <FieldItem
            fieldId="meta-title"
            title="Title"
            content={page.meta.value.title}
            notes={page.meta.notes}
          />
          <FieldItem
            fieldId="meta-description"
            title="Description"
            content={page.meta.value.description}
            notes={page.meta.notes}
          />
          <FieldItem
            fieldId="meta-canonical"
            title="Canonical URL"
            content={page.meta.value.canonical}
            notes={page.meta.notes}
          />
        </div>
      )}

      {/* Navigation */}
      {page?.navbar?.value && page.navbar.value.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Navigation</h3>
          <FieldItem
            fieldId="navbar"
            title="Navigation Items"
            content={page.navbar.value}
            notes={page.navbar.notes}
          />
        </div>
      )}

      {/* Content Blocks */}
      {page?.blocks?.value && page.blocks.value.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Content Blocks</h3>
          <FieldItem
            fieldId="blocks"
            title="Content Blocks"
            content={page.blocks.value}
            notes={page.blocks.notes}
          />
        </div>
      )}

      {/* Links */}
      {page?.links?.value && page.links.value.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Links</h3>
          <FieldItem
            fieldId="links"
            title="Page Links"
            content={page.links.value}
            notes={page.links.notes}
          />
        </div>
      )}

      {/* Truth Table */}
      {page?.truth?.value && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Truth Table</h3>
          <TruthConfirmation
            truthData={page.truth.value}
            confirmItem={confirmItem}
            retryItem={retryItem}
            editItem={editItem}
            denyItem={denyItem}
            getConfirmationState={getConfirmationState}
          />
        </div>
      )}

      {/* Diagnostics */}
      {page?.diagnostics?.value && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Diagnostics</h3>
          <FieldItem
            fieldId="diagnostics"
            title="Page Diagnostics"
            content={page.diagnostics.value}
            notes={page.diagnostics.notes}
          />
        </div>
      )}
    </div>
  );
};