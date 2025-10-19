import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Image, 
  FileText, 
  Navigation, 
  Settings, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useDataStore } from '../hooks/useDataStore'

export function Dashboard() {
  const { pages, confirmationStates } = useDataStore()

  // Calculate statistics
  const totalImages = pages.reduce((sum, page) => sum + page.images.length, 0)
  const totalParagraphs = pages.reduce((sum, page) => sum + page.paragraphs.length, 0)
  const totalNavItems = pages.reduce((sum, page) => sum + page.navbar.length, 0)
  
  const confirmedImages = pages.reduce((sum, page) => 
    sum + page.images.filter(img => confirmationStates[img.id]?.confirmed).length, 0
  )
  const deniedImages = pages.reduce((sum, page) => 
    sum + page.images.filter(img => confirmationStates[img.id]?.denied).length, 0
  )
  const pendingImages = totalImages - confirmedImages - deniedImages

  const stats = [
    {
      name: 'Total Pages',
      value: pages.length,
      icon: FileText,
      color: 'text-accent'
    },
    {
      name: 'Total Images',
      value: totalImages,
      icon: Image,
      color: 'text-accent'
    },
    {
      name: 'Confirmed Images',
      value: confirmedImages,
      icon: CheckCircle,
      color: 'text-success'
    },
    {
      name: 'Denied Images',
      value: deniedImages,
      icon: XCircle,
      color: 'text-error'
    },
    {
      name: 'Pending Images',
      value: pendingImages,
      icon: Clock,
      color: 'text-warning'
    },
    {
      name: 'Paragraphs',
      value: totalParagraphs,
      icon: FileText,
      color: 'text-accent'
    },
    {
      name: 'Nav Items',
      value: totalNavItems,
      icon: Navigation,
      color: 'text-accent'
    }
  ]

  const quickActions = [
    {
      name: 'Manage Images',
      description: 'Review and edit extracted images',
      href: '/images',
      icon: Image,
      color: 'bg-accent/10 text-accent'
    },
    {
      name: 'Edit Truth Table',
      description: 'Review and edit truth table data',
      href: '/truth-table',
      icon: FileText,
      color: 'bg-success/10 text-success'
    },
    {
      name: 'Edit Paragraphs',
      description: 'Review and edit text content',
      href: '/paragraphs',
      icon: FileText,
      color: 'bg-warning/10 text-warning'
    },
    {
      name: 'Edit Navigation',
      description: 'Review and edit navigation structure',
      href: '/navbar',
      icon: Navigation,
      color: 'bg-error/10 text-error'
    },
    {
      name: 'Miscellaneous',
      description: 'Review metadata and diagnostics',
      href: '/misc',
      icon: Settings,
      color: 'bg-accent/10 text-accent'
    },
    {
      name: 'Export Bundle',
      description: 'Export confirmed data for generation',
      href: '/export',
      icon: Download,
      color: 'bg-success/10 text-success'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Dashboard</h1>
        <p className="text-text/60 mt-2">
          Review and confirm extracted data before generating your site
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-text/60">{stat.name}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Confirmation Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-text/60 mb-1">
              <span>Images</span>
              <span>{confirmedImages} / {totalImages}</span>
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div 
                className="bg-success h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalImages > 0 ? (confirmedImages / totalImages) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {totalImages === 0 && (
            <div className="flex items-center text-warning">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">No images found. Run extraction first.</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="block p-4 rounded-lg border border-border hover:border-accent transition-colors"
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <h4 className="font-medium text-text ml-3">{action.name}</h4>
              </div>
              <p className="text-sm text-text/60">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Pages */}
      {pages.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text mb-4">Extracted Pages</h3>
          <div className="space-y-2">
            {pages.slice(0, 5).map((page) => (
              <div key={page.slug} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg">
                <div>
                  <p className="font-medium text-text">{page.slug}</p>
                  <p className="text-sm text-text/60">{page.metadata.sourceUrl}</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-text/60">
                  <span>{page.images.length} images</span>
                  <span>•</span>
                  <span>{page.paragraphs.length} paragraphs</span>
                </div>
              </div>
            ))}
            {pages.length > 5 && (
              <p className="text-sm text-text/60 text-center pt-2">
                And {pages.length - 5} more pages...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

