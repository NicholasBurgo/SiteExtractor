import React from 'react';
import { PageDetail as PageDetailType } from '../lib/types';

interface PageDetailProps {
  page: PageDetailType | null;
}

export function PageDetail({ page }: PageDetailProps) {
  if (!page) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">Select a page to view details</p>
      </div>
    );
  }

  const { summary, meta, text, headings, images, links, tables, structuredData, stats } = page;

  return (
    <div className="bg-white rounded-lg border p-4 h-full overflow-auto">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {summary.title || 'Untitled'}
          </h2>
          <div className="text-sm text-gray-500 break-all">
            {summary.url}
          </div>
          <div className="flex gap-2 mt-2">
            <span className={`px-2 py-1 rounded text-xs ${
              summary.type === 'HTML' ? 'bg-blue-100 text-blue-800' :
              summary.type === 'PDF' ? 'bg-red-100 text-red-800' :
              summary.type === 'DOCX' ? 'bg-green-100 text-green-800' :
              summary.type === 'JSON' ? 'bg-yellow-100 text-yellow-800' :
              summary.type === 'CSV' ? 'bg-purple-100 text-purple-800' :
              summary.type === 'IMG' ? 'bg-pink-100 text-pink-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {summary.type}
            </span>
            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
              {summary.words} words
            </span>
          </div>
        </div>

        {/* Metadata */}
        {Object.keys(meta).length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Metadata</h3>
            <div className="bg-gray-50 rounded p-3 text-sm">
              <pre className="whitespace-pre-wrap">{JSON.stringify(meta, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Text Content */}
        {text && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Content</h3>
            <div className="bg-gray-50 rounded p-3 text-sm max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap">{text}</pre>
            </div>
          </div>
        )}

        {/* Headings */}
        {headings.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Headings</h3>
            <div className="space-y-1">
              {headings.map((heading, index) => (
                <div key={index} className="text-sm text-gray-700">
                  {heading}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Images ({images.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {images.slice(0, 6).map((image, index) => (
                <div key={index} className="text-xs text-gray-600 truncate">
                  {image}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Links ({links.length})</h3>
            <div className="space-y-1 max-h-32 overflow-auto">
              {links.slice(0, 10).map((link, index) => (
                <div key={index} className="text-sm">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {link}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        {Object.keys(stats).length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Statistics</h3>
            <div className="bg-gray-50 rounded p-3 text-sm">
              <pre className="whitespace-pre-wrap">{JSON.stringify(stats, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}