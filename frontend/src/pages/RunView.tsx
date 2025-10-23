import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRunProgress, useRunPages, usePageDetail } from '../lib/api'
import { RunSummary } from '../components/RunSummary'
import { RunFilters } from '../components/RunFilters'
import { RunTable } from '../components/RunTable'
import { PageDetail } from '../components/PageDetail'
import { TopBar } from '../components/TopBar'
import type { FilterOptions, PageResult, SortOptions } from '../lib/types'

export function RunView() {
  const { runId } = useParams<{ runId: string }>()
  const [filters, setFilters] = useState<FilterOptions>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null)
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'processed_at', direction: 'desc' })

  const pageSize = 50

  // Fetch run progress
  const { data: progress, isLoading: progressLoading } = useRunProgress(
    runId!,
    true // Always enabled for this view
  )

  // Fetch pages with current filters and pagination
  const { 
    data: pagesData, 
    isLoading: pagesLoading,
    error: pagesError 
  } = useRunPages(runId!, currentPage, pageSize, filters)

  // Fetch selected page detail
  const { data: pageDetail, isLoading: pageDetailLoading } = usePageDetail(
    runId!,
    selectedPage?.page_id || ''
  )

  // Auto-refresh progress when run is active
  useEffect(() => {
    if (progress?.status === 'running') {
      const interval = setInterval(() => {
        // Progress will auto-refresh due to react-query polling
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [progress?.status])

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageSelect = (page: PageResult) => {
    setSelectedPage(page)
  }

  const handleSortChange = (sort: SortOptions) => {
    setSortOptions(sort)
  }

  const handleExport = () => {
    if (!runId) return
    
    // This would trigger an export API call
    console.log('Export functionality would go here')
  }

  if (!runId) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Invalid run ID</p>
          </div>
        </div>
      </div>
    )
  }

  if (pagesError) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Error loading run data: {pagesError.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to runs
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Run Details</h1>
          <p className="text-muted-foreground mt-2">Run ID: {runId}</p>
        </div>

        {/* Run Summary */}
        <div className="mb-6">
          <RunSummary 
            runId={runId} 
            progress={progress} 
            onExport={handleExport}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <RunFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              totalPages={pagesData?.total || 0}
            />
          </div>

          {/* Center - Pages Table */}
          <div className="lg:col-span-2">
            <RunTable
              pages={pagesData?.pages || []}
              loading={pagesLoading}
              onPageSelect={handlePageSelect}
              selectedPageId={selectedPage?.page_id}
              sortOptions={sortOptions}
              onSortChange={handleSortChange}
            />

            {/* Pagination */}
            {pagesData && pagesData.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {pagesData.total_pages}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(pagesData.total_pages, currentPage + 1))}
                    disabled={currentPage === pagesData.total_pages}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Page Detail */}
          <div className="lg:col-span-1">
            <PageDetail
              page={pageDetail}
              loading={pageDetailLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}


