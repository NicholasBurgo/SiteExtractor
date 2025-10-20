import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: true,
    // Add proxy for local assets in development
    proxy: {
      '/assets': {
        target: 'file://',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Handle local file serving for assets
            const assetPath = req.url?.replace('/assets/', '');
            if (assetPath) {
              // Try to serve from common output directories
              const possiblePaths = [
                resolve(process.cwd(), 'out', assetPath),
                resolve(process.cwd(), 'build', 'site', assetPath),
                resolve(process.cwd(), 'build', 'extract', assetPath)
              ];
              
              for (const filePath of possiblePaths) {
                try {
                  const fs = require('fs');
                  if (fs.existsSync(filePath)) {
                    const fileContent = fs.readFileSync(filePath);
                    const ext = filePath.split('.').pop()?.toLowerCase();
                    const mimeType = ext === 'png' ? 'image/png' : 
                                    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                                    ext === 'gif' ? 'image/gif' :
                                    ext === 'svg' ? 'image/svg+xml' :
                                    ext === 'webp' ? 'image/webp' : 'application/octet-stream';
                    
                    res.setHeader('Content-Type', mimeType);
                    res.setHeader('Content-Length', fileContent.length);
                    res.end(fileContent);
                    return;
                  }
                } catch (err) {
                  // Continue to next path
                }
              }
              
              res.statusCode = 404;
              res.end('Asset not found');
            }
          });
        }
      }
    }
  },
  // Add alias for easier asset imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, '../out'),
      '@build': resolve(__dirname, '../build')
    }
  }
})


