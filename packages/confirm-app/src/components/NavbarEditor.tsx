import React, { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  RotateCcw,
  AlertCircle,
  Navigation,
  ExternalLink
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'
import { NavbarItem } from '../types'
import { toast } from 'react-hot-toast'

export function NavbarEditor() {
  const { pages, confirmationStates, setConfirmationState } = useDataStore()
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState({ text: '', href: '' })

  // Get all navbar items from all pages
  const allNavItems = pages.flatMap(page => 
    page.navbar.map(item => ({
      ...item,
      pageSlug: page.slug,
      id: `${page.slug}-${item.href}`
    }))
  )

  const handleEdit = (id: string, currentItem: NavbarItem) => {
    setEditingItem(id)
    setEditValue({ text: currentItem.text, href: currentItem.href })
  }

  const handleSave = (id: string) => {
    toast.success('Navigation item updated')
    setEditingItem(null)
    setEditValue({ text: '', href: '' })
  }

  const handleCancel = () => {
    setEditingItem(null)
    setEditValue({ text: '', href: '' })
  }

  const handleConfirm = (id: string) => {
    setConfirmationState(id, { confirmed: true, denied: false })
    toast.success('Navigation item confirmed')
  }

  const handleDeny = (id: string) => {
    setConfirmationState(id, { denied: true, confirmed: false })
    toast.success('Navigation item denied')
  }

  const handleRetry = (id: string) => {
    toast.success('Retrying navigation extraction')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Navigation Editor</h1>
        <p className="text-text/60 mt-2">
          Review and edit extracted navigation structure
        </p>
      </div>

      {/* Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{allNavItems.length}</div>
            <div className="text-sm text-text/60">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {allNavItems.filter(item => item.isExternal).length}
            </div>
            <div className="text-sm text-text/60">External Links</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {allNavItems.filter(item => !item.isExternal).length}
            </div>
            <div className="text-sm text-text/60">Internal Links</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {new Set(allNavItems.map(item => item.pageSlug)).size}
            </div>
            <div className="text-sm text-text/60">Pages</div>
          </div>
        </div>
      </div>

      {/* Navigation Items by Page */}
      <div className="space-y-6">
        {pages.map(page => (
          <div key={page.slug} className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">{page.slug}</h3>
                <p className="text-sm text-text/60">{page.metadata.sourceUrl}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-text/60">
                  {page.navbar.length} items
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {page.navbar.map((item, index) => {
                const id = `${page.slug}-${item.href}`
                const state = confirmationStates[id] || {}
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Navigation className="h-4 w-4 text-accent" />
                      <div>
                        {editingItem === id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editValue.text}
                              onChange={(e) => setEditValue({ ...editValue, text: e.target.value })}
                              className="input text-sm"
                              placeholder="Text"
                            />
                            <input
                              type="text"
                              value={editValue.href}
                              onChange={(e) => setEditValue({ ...editValue, href: e.target.value })}
                              className="input text-sm"
                              placeholder="URL"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-text">{item.text}</span>
                              {item.isExternal && (
                                <ExternalLink className="h-3 w-3 text-text/60" />
                              )}
                              {item.depth && item.depth > 0 && (
                                <span className="text-xs text-text/60">
                                  Depth: {item.depth}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-text/60">{item.href}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Status */}
                      <div className="flex items-center">
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
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        {editingItem === id ? (
                          <>
                            <button
                              onClick={() => handleSave(id)}
                              className="p-1 text-success hover:bg-success/10 rounded"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-error hover:bg-error/10 rounded"
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(id, item)}
                              className="p-1 text-accent hover:bg-accent/10 rounded"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleConfirm(id)}
                              className="p-1 text-success hover:bg-success/10 rounded"
                              title="Confirm"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeny(id)}
                              className="p-1 text-error hover:bg-error/10 rounded"
                              title="Deny"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRetry(id)}
                              className="p-1 text-warning hover:bg-warning/10 rounded"
                              title="Retry"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

