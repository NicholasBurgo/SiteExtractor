import React, { useState } from 'react'
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Image,
  Navigation,
  Settings,
  Package
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'
import { ExportOptions } from '../types'
import { toast } from 'react-hot-toast'

export function ExportManager() {
  const { 
    pages, 
    userImages, 
    confirmationStates, 
    exportData 
  } = useDataStore()

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeImages: true,
    includeParagraphs: true,
    includeNavbar: true,
    includeMisc: true,
    includeTruthTable: true,
    format: 'json'
  })

  const [isExporting, setIsExporting] = useState(false)

  // Calculate export statistics
  const confirmedImages = pages.reduce((sum, page) => 
    sum + page.images.filter(img => confirmationStates[img.id]?.confirmed).length, 0
  )
  const confirmedUserImages = userImages.filter(img => 
    confirmationStates[img.id]?.confirmed
  ).length

  const confirmedParagraphs = pages.reduce((sum, page) => 
    sum + page.paragraphs.filter(p => 
      confirmationStates[`${page.slug}-${p.text.slice(0, 20)}`]?.confirmed
    ).length, 0
  )

  const confirmedNavItems = pages.reduce((sum, page) => 
    sum + page.navbar.filter(item => 
      confirmationStates[`${page.slug}-${item.href}`]?.confirmed
    ).length, 0
  )

  const confirmedTruthFields = pages.reduce((sum, page) => 
    sum + Object.keys(page.truthTable.table).filter(field => 
      confirmationStates[`${page.slug}-${field}`]?.confirmed
    ).length, 0
  )

  const totalConfirmed = confirmedImages + confirmedUserImages + confirmedParagraphs + confirmedNavItems + confirmedTruthFields

  const handleExport = async () => {
    if (totalConfirmed === 0) {
      toast.error('No confirmed items to export')
      return
    }

    setIsExporting(true)
    try {
      await exportData(exportOptions)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleOptionChange = (option: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [option]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Export Manager</h1>
        <p className="text-text/60 mt-2">
          Export confirmed data for site generation
        </p>
      </div>

      {/* Export Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Export Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-surface/50 rounded-lg">
            <Image className="h-8 w-8 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-text">
              {confirmedImages + confirmedUserImages}
            </div>
            <div className="text-sm text-text/60">Confirmed Images</div>
          </div>
          <div className="text-center p-4 bg-surface/50 rounded-lg">
            <FileText className="h-8 w-8 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-text">{confirmedParagraphs}</div>
            <div className="text-sm text-text/60">Confirmed Paragraphs</div>
          </div>
          <div className="text-center p-4 bg-surface/50 rounded-lg">
            <Navigation className="h-8 w-8 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-text">{confirmedNavItems}</div>
            <div className="text-sm text-text/60">Confirmed Nav Items</div>
          </div>
          <div className="text-center p-4 bg-surface/50 rounded-lg">
            <Settings className="h-8 w-8 text-error mx-auto mb-2" />
            <div className="text-2xl font-bold text-text">{confirmedTruthFields}</div>
            <div className="text-sm text-text/60">Confirmed Truth Fields</div>
          </div>
          <div className="text-center p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <Package className="h-8 w-8 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-text">{totalConfirmed}</div>
            <div className="text-sm text-text/60">Total Confirmed</div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Export Options</h3>
        
        <div className="space-y-4">
          {/* Include Options */}
          <div>
            <h4 className="text-md font-medium text-text mb-3">Include in Export</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeImages}
                  onChange={(e) => handleOptionChange('includeImages', e.target.checked)}
                  className="w-4 h-4 text-accent bg-surface border-border rounded focus:ring-accent"
                />
                <span className="text-text">Images ({confirmedImages + confirmedUserImages})</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeParagraphs}
                  onChange={(e) => handleOptionChange('includeParagraphs', e.target.checked)}
                  className="w-4 h-4 text-accent bg-surface border-border rounded focus:ring-accent"
                />
                <span className="text-text">Paragraphs ({confirmedParagraphs})</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeNavbar}
                  onChange={(e) => handleOptionChange('includeNavbar', e.target.checked)}
                  className="w-4 h-4 text-accent bg-surface border-border rounded focus:ring-accent"
                />
                <span className="text-text">Navigation ({confirmedNavItems})</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMisc}
                  onChange={(e) => handleOptionChange('includeMisc', e.target.checked)}
                  className="w-4 h-4 text-accent bg-surface border-border rounded focus:ring-accent"
                />
                <span className="text-text">Miscellaneous Data</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeTruthTable}
                  onChange={(e) => handleOptionChange('includeTruthTable', e.target.checked)}
                  className="w-4 h-4 text-accent bg-surface border-border rounded focus:ring-accent"
                />
                <span className="text-text">Truth Table ({confirmedTruthFields})</span>
              </label>
            </div>
          </div>

          {/* Format Options */}
          <div>
            <h4 className="text-md font-medium text-text mb-3">Export Format</h4>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportOptions.format === 'json'}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                  className="w-4 h-4 text-accent bg-surface border-border focus:ring-accent"
                />
                <span className="text-text">JSON</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportOptions.format === 'csv'}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                  className="w-4 h-4 text-accent bg-surface border-border focus:ring-accent"
                />
                <span className="text-text">CSV</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="zip"
                  checked={exportOptions.format === 'zip'}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                  className="w-4 h-4 text-accent bg-surface border-border focus:ring-accent"
                />
                <span className="text-text">ZIP Archive</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Export Preview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Export Preview</h3>
        <div className="bg-surface/50 rounded-lg p-4">
          <div className="text-sm text-text/60 mb-2">Export will include:</div>
          <ul className="space-y-1 text-sm text-text">
            {exportOptions.includeImages && (
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                {confirmedImages + confirmedUserImages} confirmed images
              </li>
            )}
            {exportOptions.includeParagraphs && (
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                {confirmedParagraphs} confirmed paragraphs
              </li>
            )}
            {exportOptions.includeNavbar && (
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                {confirmedNavItems} confirmed navigation items
              </li>
            )}
            {exportOptions.includeMisc && (
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                Miscellaneous data from {pages.length} pages
              </li>
            )}
            {exportOptions.includeTruthTable && (
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                {confirmedTruthFields} confirmed truth table fields
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Export Actions */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Ready to Export</h3>
            <p className="text-text/60 mt-1">
              Export confirmed data as {exportOptions.format.toUpperCase()} bundle
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {totalConfirmed === 0 && (
              <div className="flex items-center text-warning">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">No confirmed items</span>
              </div>
            )}
            <button
              onClick={handleExport}
              disabled={totalConfirmed === 0 || isExporting}
              className="btn btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Bundle
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Export History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Export History</h3>
        <div className="text-text/60 text-sm">
          No previous exports found. Export data will be saved to your downloads folder.
        </div>
      </div>
    </div>
  )
}

