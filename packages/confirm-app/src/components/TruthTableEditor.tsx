import React, { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  RotateCcw,
  AlertCircle,
  Info
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'
import { TruthTableData } from '../types'
import { toast } from 'react-hot-toast'

export function TruthTableEditor() {
  const { pages, confirmationStates, setConfirmationState } = useDataStore()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')

  // Get truth table data from all pages
  const truthTables = pages.map(page => ({
    pageSlug: page.slug,
    sourceUrl: page.metadata.sourceUrl,
    truthTable: page.truthTable
  }))

  // Get all unique fields across all truth tables
  const allFields = new Set<string>()
  truthTables.forEach(({ truthTable }) => {
    Object.keys(truthTable.table).forEach(field => allFields.add(field))
  })

  const handleEdit = (field: string, currentValue: any) => {
    setEditingField(field)
    setEditValue(currentValue)
  }

  const handleSave = (field: string, pageSlug: string) => {
    // In a real implementation, this would update the truth table data
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
    // In a real implementation, this would trigger a retry of the extraction
    toast.success(`Retrying extraction for ${field} in ${pageSlug}`)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success'
    if (confidence >= 0.6) return 'text-warning'
    return 'text-error'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Truth Table Editor</h1>
        <p className="text-text/60 mt-2">
          Review and edit extracted truth table data
        </p>
      </div>

      {/* Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{pages.length}</div>
            <div className="text-sm text-text/60">Pages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{allFields.size}</div>
            <div className="text-sm text-text/60">Unique Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {truthTables.reduce((sum, { truthTable }) => 
                sum + Object.keys(truthTable.table).length, 0
              )}
            </div>
            <div className="text-sm text-text/60">Total Fields</div>
          </div>
        </div>
      </div>

      {/* Truth Tables */}
      <div className="space-y-6">
        {truthTables.map(({ pageSlug, sourceUrl, truthTable }) => (
          <div key={pageSlug} className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">{pageSlug}</h3>
                <p className="text-sm text-text/60">{sourceUrl}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-text/60">
                  {Object.keys(truthTable.table).length} fields
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                    <th>Confidence</th>
                    <th>Provenance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(truthTable.table).map(([field, data]) => {
                    const key = `${pageSlug}-${field}`
                    const state = confirmationStates[key] || {}
                    
                    return (
                      <tr key={field}>
                        <td className="font-medium text-text">{field}</td>
                        <td>
                          {editingField === field ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input flex-1"
                              />
                              <button
                                onClick={() => handleSave(field, pageSlug)}
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
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-text">
                                {typeof data.value === 'object' 
                                  ? JSON.stringify(data.value)
                                  : String(data.value)
                                }
                              </span>
                              <button
                                onClick={() => handleEdit(field, data.value)}
                                className="p-1 text-accent hover:bg-accent/10 rounded"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${getConfidenceColor(data.confidence)}`}>
                              {Math.round(data.confidence * 100)}%
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(data.confidence)} bg-current/10`}>
                              {getConfidenceLabel(data.confidence)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm text-text/60">
                            {data.provenance.map((prov, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                <Info className="h-3 w-3" />
                                <span>{prov.method}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center">
                            {state.confirmed && (
                              <CheckCircle className="h-5 w-5 text-success" />
                            )}
                            {state.denied && (
                              <XCircle className="h-5 w-5 text-error" />
                            )}
                            {!state.confirmed && !state.denied && (
                              <AlertCircle className="h-5 w-5 text-warning" />
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleConfirm(field, pageSlug)}
                              className="p-1 text-success hover:bg-success/10 rounded"
                              title="Confirm"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeny(field, pageSlug)}
                              className="p-1 text-error hover:bg-error/10 rounded"
                              title="Deny"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRetry(field, pageSlug)}
                              className="p-1 text-warning hover:bg-warning/10 rounded"
                              title="Retry"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Field Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Field Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(allFields).map(field => {
            const fieldData = truthTables.map(({ pageSlug, truthTable }) => ({
              pageSlug,
              data: truthTable.table[field]
            })).filter(({ data }) => data)
            
            const avgConfidence = fieldData.reduce((sum, { data }) => 
              sum + data.confidence, 0
            ) / fieldData.length
            
            return (
              <div key={field} className="p-4 bg-surface/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-text">{field}</h4>
                  <span className={`text-sm px-2 py-1 rounded ${getConfidenceColor(avgConfidence)} bg-current/10`}>
                    {Math.round(avgConfidence * 100)}%
                  </span>
                </div>
                <p className="text-sm text-text/60">
                  Found in {fieldData.length} page{fieldData.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-2 space-y-1">
                  {fieldData.map(({ pageSlug, data }) => (
                    <div key={pageSlug} className="flex items-center justify-between text-xs">
                      <span className="text-text/60">{pageSlug}</span>
                      <span className="text-text/60">
                        {typeof data.value === 'object' 
                          ? JSON.stringify(data.value).slice(0, 20) + '...'
                          : String(data.value).slice(0, 20) + (String(data.value).length > 20 ? '...' : '')
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

