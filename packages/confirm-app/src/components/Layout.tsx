import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Image, 
  FileText, 
  Navigation, 
  Settings, 
  Download,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Images', href: '/images', icon: Image },
  { name: 'Truth Table', href: '/truth-table', icon: FileText },
  { name: 'Paragraphs', href: '/paragraphs', icon: FileText },
  { name: 'Navigation', href: '/navbar', icon: Navigation },
  { name: 'Misc', href: '/misc', icon: Settings },
  { name: 'Export', href: '/export', icon: Download },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold text-text">Site Generator</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-text hover:text-accent"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent/20 text-accent border-r-2 border-accent'
                      : 'text-text hover:bg-surface/50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-surface border-r border-border">
          <div className="flex items-center px-4 py-6">
            <h1 className="text-xl font-bold text-text">Site Generator</h1>
          </div>
          <nav className="mt-8 flex-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent/20 text-accent border-r-2 border-accent'
                      : 'text-text hover:bg-surface/50'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-surface border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text hover:text-accent"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-text/60">
                Confirmation & Packing Interface
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

