import React from 'react';
import { PageSummary } from '../lib/types';

interface RunTableProps {
  pages: PageSummary[];
  onPageSelect: (pageId: string) => void;
  selectedPageId?: string;
}

export function RunTable({ pages, onPageSelect, selectedPageId }: RunTableProps) {
  if (pages.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">No pages found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-900">Title</th>
              <th className="text-center p-3 font-medium text-gray-900">Type</th>
              <th className="text-center p-3 font-medium text-gray-900">Words</th>
              <th className="text-center p-3 font-medium text-gray-900">Images</th>
              <th className="text-center p-3 font-medium text-gray-900">Links</th>
              <th className="text-center p-3 font-medium text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pages.map((page) => (
              <tr
                key={page.pageId}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedPageId === page.pageId ? 'bg-blue-50' : ''
                }`}
                onClick={() => onPageSelect(page.pageId)}
              >
                <td className="p-3">
                  <div className="font-medium text-gray-900 truncate max-w-xs">
                    {page.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {page.url}
                  </div>
                </td>
                <td className="text-center p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    page.type === 'HTML' ? 'bg-blue-100 text-blue-800' :
                    page.type === 'PDF' ? 'bg-red-100 text-red-800' :
                    page.type === 'DOCX' ? 'bg-green-100 text-green-800' :
                    page.type === 'JSON' ? 'bg-yellow-100 text-yellow-800' :
                    page.type === 'CSV' ? 'bg-purple-100 text-purple-800' :
                    page.type === 'IMG' ? 'bg-pink-100 text-pink-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {page.type || 'Unknown'}
                  </span>
                </td>
                <td className="text-center p-3 text-gray-900">
                  {page.words.toLocaleString()}
                </td>
                <td className="text-center p-3 text-gray-900">
                  {page.images}
                </td>
                <td className="text-center p-3 text-gray-900">
                  {page.links}
                </td>
                <td className="text-center p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    page.status === 200 ? 'bg-green-100 text-green-800' :
                    page.status && page.status >= 400 ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {page.status || 'Unknown'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}