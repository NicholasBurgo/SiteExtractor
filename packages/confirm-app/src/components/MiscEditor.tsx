import React, { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  RotateCcw,
  AlertCircle,
  Settings,
  Link,
  FileText
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'
import { MiscData } from '../types'
import { toast } from 'react-hot-toast'

export function MiscEditor() {
  const { pages, confirmationStates, setConfirmationState } = useDataStore()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')

  const handleEdit = (field: string, currentValue: any) => {
    setEditingField(field)
    setEditValue(currentValue)
  }

  const handleSave = (field: string, pageSlug: string) => {
    toast.success(`Updated ${field} for ${pageSlug}`)
    setEditingField(null)
    setEditValue('')
  }

  const handleCancel = () => {
    setEditingField(null)
    setEditValue('')
  }

  const handleConfirm = (field: string, pageSlug: string) => {
    const key = `${pageSlug}-${field}`
    setConfirmationState(key, { confirmed: true, denied: false })
    toast.success(`Confirmed ${field} for ${pageSlug}`)
  }

  const handleDeny = (field: string, pageSlug: string) => {
    const key = `${pageSlug}-${field}`
    setConfirmationState(key, { denied: true, confirmed: false })
    toast.success(`Denied ${field} for ${pageSlug}`)
  }

  const handleRetry = (field: string, pageSlug: string) => {
    toast.success(`Retrying ${field} extraction for ${pageSlug}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Miscellaneous Editor</h1>
        <p className="text-text/60 mt-2">
          Review and edit metadata, links, and diagnostic information
        </p>
      </div>

      {/* Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{pages.length}</div>
            <div className="text-sm text-text/60">Pages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {pages.reduce((sum, page) => sum + page.misc.links.internal.length + page.misc.links.external.length, 0)}
            </div>
            <div className="text-sm text-text/60">Total Links</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {pages.reduce((sum, page) => sum + page.misc.diagnostics.wordCount, 0)}
            </div>
            <div className="text-sm text-text/60">Total Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {pages.filter(page => page.misc.diagnostics.hasSchemaOrg).length}
            </div>
            <div className="text-sm text-text/60">With Schema</div>
          </div>
        </div>
      </div>

      {/* Pages */}
      <div className="space-y-6">
        {pages.map(page => (
          <div key={page.slug} className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">{page.slug}</h3>
                <p className="text-sm text-text/60">{page.metadata.sourceUrl}</p>
              </div>
            </div>

            {/* Meta Data */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-text mb-3 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Meta Data
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(page.misc.meta).map(([key, value]) => {
                  const fieldKey = `${page.slug}-meta-${key}`
                  const state = confirmationStates[fieldKey] || {}
                  
                  return (
                    <div key={key} className="p-3 bg-surface/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <div className="flex items-center space-x-1">
                          {state.confirmed && (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                          {state.denied && (
                            <XCircle className="h-4 w-4 text-error" />
                          )}
                          {!state.confirmed && !state.denied && (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </div>
                      
                      {editingField === fieldKey ? (
                        <div className="space-y-2">
                          {key === 'keywords' ? (
                            <textarea
                              value={Array.isArray(editValue) ? editValue.join(', ') : editValue}
                              onChange={(e) => setEditValue(e.target.value.split(',').map(k => k.trim()))}
                              className="input w-full text-sm"
                            />
                          ) : (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="input w-full text-sm"
                            />
                          )}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSave(fieldKey, page.slug)}
                              className="p-1 text-success hover:bg-success/10 rounded"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-error hover:bg-error/10 rounded"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-text/80">
                            {Array.isArray(value) ? value.join(', ') : String(value || 'N/A')}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEdit(fieldKey, value)}
                              className="p-1 text-accent hover:bg-accent/10 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleConfirm(fieldKey, page.slug)}
                              className="p-1 text-success hover:bg-success/10 rounded"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeny(fieldKey, page.slug)}
                              className="p-1 text-error hover:bg-error/10 rounded"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRetry(fieldKey, page.slug)}
                              className="p-1 text-warning hover:bg-warning/10 rounded"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Links */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-text mb-3 flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Links
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-surface/50 rounded-lg">
                  <h5 className="text-sm font-medium text-text mb-2">
                    Internal Links ({page.misc.links.internal.length})
                  </h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {page.misc.links.internal.map((link, index) => (
                      <div key={index} className="text-xs text-text/60 truncate">
                        {link}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-surface/50 rounded-lg">
                  <h5 className="text-sm font-medium text-text mb-2">
                    External Links ({page.misc.links.external.length})
                  </h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {page.misc.links.external.map((link, index) => (
                      <div key={index} className="text-xs text-text/60 truncate">
                        {link}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostics */}
            <div>
              <h4 className="text-md font-semibold text-text mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Diagnostics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(page.misc.diagnostics).map(([key, value]) => {
                  const fieldKey = `${page.slug}-diagnostics-${key}`
                  const state = confirmationStates[fieldKey] || {}
                  
                  return (
                    <div key={key} className="p-3 bg-surface/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <div className="flex items-center space-x-1">
                          {state.confirmed && (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                          {state.denied && (
                            <XCircle className="h-4 w-4 text-error" />
                          )}
                          {!state.confirmed && !state.denied && (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-text/80">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

