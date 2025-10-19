import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { ImageManager } from './components/ImageManager'
import { TruthTableEditor } from './components/TruthTableEditor'
import { ParagraphEditor } from './components/ParagraphEditor'
import { NavbarEditor } from './components/NavbarEditor'
import { MiscEditor } from './components/MiscEditor'
import { ExportManager } from './components/ExportManager'
import { useDataStore } from './hooks/useDataStore'
import { PackBundle, ImageData } from './types'

function App() {
  const { loadExtractionData, isLoading } = useDataStore()
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    // Load extraction data on app start
    loadExtractionData()
      .then(() => setHasData(true))
      .catch((error) => {
        console.error('Failed to load extraction data:', error)
        toast.error('Failed to load extraction data. Please check if extraction has been run.')
      })
  }, [loadExtractionData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text">Loading extraction data...</p>
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-text mb-4">No Extraction Data Found</h1>
          <p className="text-text/60 mb-6">
            Please run the extraction process first to generate data for confirmation.
          </p>
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-medium text-text mb-2">Run Extraction:</h3>
            <code className="text-accent text-sm">
              pnpm extractor run --url https://example.com
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/images" element={<ImageManager />} />
        <Route path="/truth-table" element={<TruthTableEditor />} />
        <Route path="/paragraphs" element={<ParagraphEditor />} />
        <Route path="/navbar" element={<NavbarEditor />} />
        <Route path="/misc" element={<MiscEditor />} />
        <Route path="/export" element={<ExportManager />} />
      </Routes>
    </Layout>
  )
}

export default App

