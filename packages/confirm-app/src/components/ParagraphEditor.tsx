import React, { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  RotateCcw,
  AlertCircle,
  FileText
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'
import { ParagraphData } from '../types'
import { toast } from 'react-hot-toast'

export function ParagraphEditor() {
  const { pages, confirmationStates, setConfirmationState } = useDataStore()
  const [editingParagraph, setEditingParagraph] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Get all paragraphs from all pages
  const allParagraphs = pages.flatMap(page => 
    page.paragraphs.map(paragraph => ({
      ...paragraph,
      pageSlug: page.slug,
      id: `${page.slug}-${paragraph.text.slice(0, 20)}`
    }))
  )

  // Filter paragraphs
  const filteredParagraphs = allParagraphs.filter(paragraph => {
    const matchesType = filterType === 'all' || paragraph.type === filterType
    const matchesSearch = paragraph.text.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  const handleEdit = (id: string, currentText: string) => {
    setEditingParagraph(id)
    setEditValue(currentText)
  }

  const handleSave = (id: string) => {
    toast.success('Paragraph updated')
    setEditingParagraph(null)
    setEditValue('')
  }

  const handleCancel = () => {
    setEditingParagraph(null)
    setEditValue('')
  }

  const handleConfirm = (id: string) => {
    setConfirmationState(id, { confirmed: true, denied: false })
    toast.success('Paragraph confirmed')
  }

  const handleDeny = (id: string) => {
    setConfirmationState(id, { denied: true, confirmed: false })
    toast.success('Paragraph denied')
  }

  const handleRetry = (id: string) => {
    toast.success('Retrying paragraph extraction')
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'heading': return 'text-accent'
      case 'paragraph': return 'text-text'
      case 'list': return 'text-success'
      case 'quote': return 'text-warning'
      case 'table': return 'text-error'
      default: return 'text-text/60'
    }
  }

  const getTypeIcon = (type: string) => {
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Paragraph Editor</h1>
        <p className="text-text/60 mt-2">
          Review and edit extracted text content
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search paragraphs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input"
          >
            <option value="all">All Types</option>
            <option value="paragraph">Paragraphs</option>
            <option value="heading">Headings</option>
            <option value="list">Lists</option>
            <option value="quote">Quotes</option>
            <option value="table">Tables</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{allParagraphs.length}</div>
            <div className="text-sm text-text/60">Total Paragraphs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {allParagraphs.filter(p => p.type === 'heading').length}
            </div>
            <div className="text-sm text-text/60">Headings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {allParagraphs.filter(p => p.type === 'paragraph').length}
            </div>
            <div className="text-sm text-text/60">Paragraphs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">
              {allParagraphs.reduce((sum, p) => sum + p.wordCount, 0)}
            </div>
            <div className="text-sm text-text/60">Total Words</div>
          </div>
        </div>
      </div>

      {/* Paragraphs */}
      <div className="space-y-4">
        {filteredParagraphs.map((paragraph) => {
          const state = confirmationStates[paragraph.id] || {}
          
          return (
            <div key={paragraph.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getTypeColor(paragraph.type)} bg-current/10`}>
                      {paragraph.type}
                    </span>
                    <span className="text-xs text-text/60">
                      {paragraph.wordCount} words
                    </span>
                    <span className="text-xs text-text/60">
                      {paragraph.pageSlug}
                    </span>
                    {paragraph.level && (
                      <span className="text-xs text-text/60">
                        H{paragraph.level}
                      </span>
                    )}
                  </div>
                  
                  {editingParagraph === paragraph.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="input w-full h-32 resize-none"
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSave(paragraph.id)}
                          className="btn btn-success text-sm"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="btn btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <p className="text-text whitespace-pre-wrap">
                        {paragraph.text}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {/* Status */}
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
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(paragraph.id, paragraph.text)}
                      className="p-1 text-accent hover:bg-accent/10 rounded"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleConfirm(paragraph.id)}
                      className="p-1 text-success hover:bg-success/10 rounded"
                      title="Confirm"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeny(paragraph.id)}
                      className="p-1 text-error hover:bg-error/10 rounded"
                      title="Deny"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRetry(paragraph.id)}
                      className="p-1 text-warning hover:bg-warning/10 rounded"
                      title="Retry"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

