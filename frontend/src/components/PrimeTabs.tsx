/**
 * Prime tabs component for navigation, footer, and pages management.
 */
import React, { useState } from 'react';
import { PrimeResponse, PrimeSubTab, NavNode } from '../lib/types.confirm';
import { confirmationUtils } from '../lib/api.confirm';

interface PrimeTabsProps {
  data: PrimeResponse;
  onNavigationUpdate: (nav: NavNode[]) => void;
  onFooterUpdate: (footer: any) => void;
  saving: boolean;
}

const PrimeTabs: React.FC<PrimeTabsProps> = ({
  data,
  onNavigationUpdate,
  onFooterUpdate,
  saving
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PrimeSubTab>('nav');
  const [editingNav, setEditingNav] = useState(false);
  const [editingFooter, setEditingFooter] = useState(false);
  const [navData, setNavData] = useState<NavNode[]>(data.nav);
  const [footerData, setFooterData] = useState(data.footer);

  const handleNavSave = () => {
    const errors = confirmationUtils.validateNavigation(navData);
    if (errors.length > 0) {
      alert('Please fix navigation errors:\n' + errors.join('\n'));
      return;
    }
    onNavigationUpdate(navData);
    setEditingNav(false);
  };

  const handleFooterSave = () => {
    onFooterUpdate(footerData);
    setEditingFooter(false);
  };

  const addNavItem = (parentPath: number[] = []) => {
    const newItem: NavNode = { label: 'New Item', href: '#' };
    
    if (parentPath.length === 0) {
      setNavData([...navData, newItem]);
    } else {
      const updatedNav = [...navData];
      let current = updatedNav;
      
      for (let i = 0; i < parentPath.length - 1; i++) {
        current = current[parentPath[i]].children || [];
      }
      
      const parentIndex = parentPath[parentPath.length - 1];
      if (!current[parentIndex].children) {
        current[parentIndex].children = [];
      }
      current[parentIndex].children!.push(newItem);
      
      setNavData(updatedNav);
    }
  };

  const removeNavItem = (path: number[]) => {
    if (path.length === 1) {
      setNavData(navData.filter((_, index) => index !== path[0]));
    } else {
      const updatedNav = [...navData];
      let current = updatedNav;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]].children || [];
      }
      
      const itemIndex = path[path.length - 1];
      current.splice(itemIndex, 1);
      
      setNavData(updatedNav);
    }
  };

  const updateNavItem = (path: number[], field: 'label' | 'href', value: string) => {
    const updatedNav = [...navData];
    let current = updatedNav;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children || [];
    }
    
    const itemIndex = path[path.length - 1];
    current[itemIndex][field] = value;
    
    setNavData(updatedNav);
  };

  const renderNavItem = (item: NavNode, path: number[], level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={path.join('-')} className={`ml-${level * 4} border-l-2 border-gray-200 pl-4 mb-2`}>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={item.label}
            onChange={(e) => updateNavItem(path, 'label', e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="Label"
          />
          <input
            type="text"
            value={item.href}
            onChange={(e) => updateNavItem(path, 'href', e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="URL"
          />
          <button
            onClick={() => addNavItem(path)}
            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
            title="Add child"
          >
            +
          </button>
          <button
            onClick={() => removeNavItem(path)}
            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
            title="Remove"
          >
            ×
          </button>
        </div>
        
        {hasChildren && (
          <div className="mt-2">
            {item.children!.map((child, index) => 
              renderNavItem(child, [...path, index], level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'nav', label: 'Navigation Bar' },
            { id: 'footer', label: 'Footer' },
            { id: 'pages', label: 'All Pages' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as PrimeSubTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Navigation Tab */}
      {activeSubTab === 'nav' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Navigation Structure</h3>
            <div className="space-x-2">
              {editingNav ? (
                <>
                  <button
                    onClick={() => {
                      setNavData(data.nav);
                      setEditingNav(false);
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNavSave}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingNav(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit Navigation
                </button>
              )}
            </div>
          </div>

          {editingNav ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                {navData.map((item, index) => renderNavItem(item, [index]))}
                <button
                  onClick={() => addNavItem()}
                  className="mt-4 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Add Top-Level Item
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded">
              {data.nav.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No navigation items found</p>
              ) : (
                <div className="space-y-2">
                  {confirmationUtils.flattenNavigation(data.nav).map(({ node, level, path }) => (
                    <div key={path.join('-')} className={`ml-${level * 4} flex items-center space-x-2`}>
                      <span className="text-sm font-medium">{node.label}</span>
                      <span className="text-xs text-gray-500">{node.href}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Tab */}
      {activeSubTab === 'footer' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Footer Content</h3>
            <div className="space-x-2">
              {editingFooter ? (
                <>
                  <button
                    onClick={() => {
                      setFooterData(data.footer);
                      setEditingFooter(false);
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFooterSave}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingFooter(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit Footer
                </button>
              )}
            </div>
          </div>

          {editingFooter ? (
            <div className="space-y-4">
              {/* Footer Columns */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Columns</h4>
                <div className="space-y-2">
                  {footerData.columns.map((column, index) => (
                    <div key={index} className="border border-gray-300 rounded p-3">
                      <input
                        type="text"
                        value={column.heading || ''}
                        onChange={(e) => {
                          const updated = { ...footerData };
                          updated.columns[index].heading = e.target.value;
                          setFooterData(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                        placeholder="Column heading"
                      />
                      <div className="space-y-1">
                        {column.links.map((link, linkIndex) => (
                          <div key={linkIndex} className="flex space-x-2">
                            <input
                              type="text"
                              value={link.label}
                              onChange={(e) => {
                                const updated = { ...footerData };
                                updated.columns[index].links[linkIndex].label = e.target.value;
                                setFooterData(updated);
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Link label"
                            />
                            <input
                              type="text"
                              value={link.href}
                              onChange={(e) => {
                                const updated = { ...footerData };
                                updated.columns[index].links[linkIndex].href = e.target.value;
                                setFooterData(updated);
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Link URL"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Social Links</h4>
                <div className="space-y-2">
                  {footerData.socials?.map((social, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={social.platform}
                        onChange={(e) => {
                          const updated = { ...footerData };
                          if (updated.socials) {
                            updated.socials[index].platform = e.target.value;
                            setFooterData(updated);
                          }
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Platform"
                      />
                      <input
                        type="text"
                        value={social.url}
                        onChange={(e) => {
                          const updated = { ...footerData };
                          if (updated.socials) {
                            updated.socials[index].url = e.target.value;
                            setFooterData(updated);
                          }
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="URL"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded">
              {data.footer.columns.length === 0 && (!data.footer.socials || data.footer.socials.length === 0) ? (
                <p className="text-gray-500 text-center py-8">No footer content found</p>
              ) : (
                <div className="space-y-4">
                  {data.footer.columns.map((column, index) => (
                    <div key={index}>
                      {column.heading && <h4 className="font-medium text-gray-900 mb-2">{column.heading}</h4>}
                      <div className="space-y-1">
                        {column.links.map((link, linkIndex) => (
                          <div key={linkIndex} className="text-sm">
                            <a href={link.href} className="text-blue-600 hover:text-blue-800">
                              {link.label}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {data.footer.socials && data.footer.socials.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Social Links</h4>
                      <div className="space-y-1">
                        {data.footer.socials.map((social, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{social.platform}:</span>{' '}
                            <a href={social.url} className="text-blue-600 hover:text-blue-800">
                              {social.url}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* All Pages Tab */}
      {activeSubTab === 'pages' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Pages</h3>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Words</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.pages.map((page, index) => (
                  <tr key={page.pageId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {page.titleGuess || 'Untitled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.path}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        page.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {page.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{page.words || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{page.mediaCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrimeTabs;
