// Type definitions for Electron main process
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Fix cache issues on Windows
const userDataPath = app.getPath('userData');
const cachePath = path.join(userDataPath, 'cache');

// Set cache directory before app ready
app.setPath('cache', cachePath);
app.setPath('userCache', cachePath);

let win: BrowserWindow | null = null;
function createWin() {
  win = new BrowserWindow({
    width: 1200, 
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Additional cache settings to prevent Windows cache errors
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: false
    },
    // Additional window options to prevent cache issues
    show: false
  });
  
  // Maximize the window on startup
  win.maximize();
  
  // Show window when ready to prevent flash
  win.once('ready-to-show', () => {
    win?.show();
  });
  
  // Add keyboard shortcuts for fullscreen toggle
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'f') {
      if (win?.isFullScreen()) {
        win.setFullScreen(false);
      } else {
        win?.setFullScreen(true);
      }
    }
  });
  
  // Load from development server in development mode
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    // Load from built files in production
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// Additional app configuration to prevent cache issues
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(() => {
  // Create cache directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }
  createWin();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWin(); });

ipcMain.handle('choose-dir', async () => {
  const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('open-path', async (_e, p: string) => { 
  await shell.openPath(p); 
  return true; 
});

ipcMain.handle('run-pipeline', async (_e, args: { url: string; out: string; base: string; pages: number; noLLM: boolean }) => {
  const { url, out, base, pages, noLLM } = args;
  
  // Ensure the output directory exists - resolve relative to project root
  const projectRoot = path.join(__dirname, '..', '..', '..');
  const outputDir = path.resolve(projectRoot, out);
  const fs = await import('fs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Use Python truth-extractor directly
  const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
  const flags = [
    '-m', 'truth_extractor',
    url,
    '--out', outputDir,
    '--max-pages', String(pages)
  ];
  
  if (noLLM) {
    // Note: The current truth-extractor doesn't have --no-llm flag, 
    // but we can add it later or handle it differently
    console.log('Deterministic mode requested (no LLM)');
  }
  
  // Note: Playwright is now enabled by default in the config

  // Use the project root as working directory
  const workingDir = projectRoot;
  console.log('Running Python extraction:');
  console.log('  Command:', pythonCmd, flags.join(' '));
  console.log('  Working dir:', workingDir);
  console.log('  Output dir:', outputDir);
  console.log('  Current working directory:', process.cwd());
  console.log('  Resolved output dir:', path.resolve(out));
  
  const child = spawn(pythonCmd, flags, { 
    cwd: workingDir, 
    env: process.env 
  });

  child.stdout.on('data', d => {
    const msg = d.toString();
    console.log('[Python stdout]:', msg);
    win?.webContents.send('pipe-log', msg);
  });
  
  child.stderr.on('data', d => {
    const msg = d.toString();
    console.log('[Python stderr]:', msg);
    win?.webContents.send('pipe-log', msg);
  });

  return await new Promise<{ code: number|null; outputPath: string }>((resolve) => {
    child.on('close', code => {
      console.log('Python process exited with code:', code);
      console.log('Returning output path:', outputDir);
      // Return the actual output path that was used
      resolve({ code, outputPath: outputDir });
    });
  });
});

ipcMain.handle('load-extracted-data', async (_e, outputPath: string) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Look for .page.json files in the output directory
    const files = fs.readdirSync(outputPath);
    const pageFile = files.find(f => f.endsWith('.page.json'));
    
    if (pageFile) {
      const filePath = path.join(outputPath, pageFile);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load extracted data:', error);
    return null;
  }
});

ipcMain.handle('load-truth-data', async (_e, outputPath: string) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    console.log('=== LOADING TRUTH DATA ===');
    console.log('Output path:', outputPath);
    console.log('Resolved path:', path.resolve(outputPath));
    
    // Resolve relative to project root if it's a relative path
    let resolvedOutputPath = outputPath;
    if (!path.isAbsolute(outputPath)) {
      const projectRoot = path.join(__dirname, '..', '..', '..');
      resolvedOutputPath = path.resolve(projectRoot, outputPath);
    }
    console.log('Final resolved path:', resolvedOutputPath);
    
    // Check if the path is already a truth.json file
    if (resolvedOutputPath.endsWith('truth.json')) {
      console.log('Direct truth.json file path provided');
      if (fs.existsSync(resolvedOutputPath)) {
        console.log('✓ Found truth.json at:', resolvedOutputPath);
        const data = fs.readFileSync(resolvedOutputPath, 'utf8');
        const parsed = JSON.parse(data);
        console.log('✓ Loaded truth data for:', parsed.domain);
        return parsed;
      } else {
        console.error('✗ Truth.json file not found at:', resolvedOutputPath);
        return null;
      }
    }
    
    // Otherwise, treat it as a directory and look for truth.json
    console.log('Directory path provided, looking for truth.json');
    
    // First, try to find truth.json directly in the output path
    let truthFilePath = path.join(resolvedOutputPath, 'truth.json');
    console.log('Checking direct path:', truthFilePath);
    
    if (fs.existsSync(truthFilePath)) {
      console.log('✓ Found truth.json at:', truthFilePath);
      const data = fs.readFileSync(truthFilePath, 'utf8');
      const parsed = JSON.parse(data);
      console.log('✓ Loaded truth data for:', parsed.domain);
      return parsed;
    }
    
    // If not found, look for subdirectories (domain folders)
    console.log('Not found directly, checking subdirectories...');
    if (fs.existsSync(resolvedOutputPath)) {
      const files = fs.readdirSync(resolvedOutputPath);
      console.log('Contents of output directory:', files);
      
      // Look for directories that might contain truth.json
      for (const file of files) {
        const fullPath = path.join(resolvedOutputPath, file);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const subTruthPath = path.join(fullPath, 'truth.json');
            console.log('Checking subdirectory:', subTruthPath);
            
            if (fs.existsSync(subTruthPath)) {
              console.log('✓ Found truth.json in subdirectory:', subTruthPath);
              const data = fs.readFileSync(subTruthPath, 'utf8');
              const parsed = JSON.parse(data);
              console.log('✓ Loaded truth data for:', parsed.domain);
              return parsed;
            }
          }
        } catch (err) {
          console.log('Skipping file:', file, err);
        }
      }
    }
    
    console.error('✗ No truth.json found anywhere!');
    console.error('Searched in:', resolvedOutputPath);
    return null;
  } catch (error) {
    console.error('✗ Failed to load truth data:', error);
    return null;
  }
});

ipcMain.handle('load-image-as-data-url', async (_e, imagePath: string) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    console.log('Loading image from:', imagePath);
    
    // Use consistent project root calculation
    const projectRoot = path.join(__dirname, '..', '..', '..');
    
    // Handle different path formats
    let resolvedPath: string;
    
    // If it's a URL, log an error and return null
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.error('ERROR: URL passed to load-image-as-data-url instead of local path:', imagePath);
      console.error('This indicates the image downloading process failed or the path mapping is incorrect.');
      return null;
    }
    
    // If it's already a full absolute path, use it directly
    if (path.isAbsolute(imagePath)) {
      resolvedPath = imagePath;
    } else if (imagePath.startsWith('assets/')) {
      // Handle assets/ paths - look in multiple possible locations
      const assetName = imagePath.replace('assets/', '');
      const possiblePaths = [
        path.join(projectRoot, 'out', assetName),
        path.join(projectRoot, 'out', 'assets', assetName),
        path.join(projectRoot, 'assets', assetName),
        path.join(projectRoot, 'build', 'site', assetName),
        path.join(projectRoot, 'build', 'site', 'assets', assetName),
        path.join(projectRoot, 'build', 'extract', assetName),
        path.join(projectRoot, 'build', 'extract', 'assets', assetName),
        path.join(projectRoot, assetName)
      ];
      
      // Also check domain-specific directories
      const outDir = path.join(projectRoot, 'out');
      if (fs.existsSync(outDir)) {
        const domains = fs.readdirSync(outDir).filter(item => {
          const fullPath = path.join(outDir, item);
          return fs.statSync(fullPath).isDirectory() && item !== '.cache';
        });
        
        for (const domain of domains) {
          possiblePaths.push(path.join(outDir, domain, 'assets', assetName));
          possiblePaths.push(path.join(outDir, domain, assetName));
        }
      }
      
      for (const possiblePath of possiblePaths) {
        console.log('Checking path:', possiblePath);
        if (fs.existsSync(possiblePath)) {
          console.log('✓ Found image at:', possiblePath);
          resolvedPath = possiblePath;
          break;
        }
      }
      
      if (!resolvedPath!) {
        console.log('No image found in any of the expected locations, falling back to:', path.resolve(imagePath));
        resolvedPath = path.resolve(imagePath);
      }
    } else if (imagePath.includes('\\') || imagePath.includes('/')) {
      // Handle paths that start with / (which on Windows resolves to drive root)
      if (imagePath.startsWith('/') && !imagePath.startsWith('//')) {
        // This is a relative path starting with / - treat as relative to project root
        resolvedPath = path.resolve(projectRoot, imagePath);
      } else {
        // Already a relative path - resolve it relative to project root
        resolvedPath = path.resolve(projectRoot, imagePath);
      }
    } else {
      // Just a filename - look in common directories
      const possiblePaths = [
        path.join(projectRoot, 'out', imagePath),
        path.join(projectRoot, 'out', 'assets', imagePath),
        path.join(projectRoot, 'assets', imagePath),
        path.join(projectRoot, 'build', 'site', imagePath),
        path.join(projectRoot, 'build', 'site', 'assets', imagePath),
        path.join(projectRoot, 'build', 'extract', imagePath),
        path.join(projectRoot, 'build', 'extract', 'assets', imagePath),
        path.join(projectRoot, imagePath)
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          resolvedPath = possiblePath;
          break;
        }
      }
      
      if (!resolvedPath!) {
        resolvedPath = path.resolve(imagePath);
      }
    }
    
    console.log('Resolved image path:', resolvedPath);
    
    if (!fs.existsSync(resolvedPath)) {
      console.error('Image file not found:', resolvedPath);
      console.log('Searched paths included:');
      console.log('-', path.resolve(imagePath));
      if (imagePath.startsWith('assets/')) {
        const assetName = imagePath.replace('assets/', '');
        console.log('-', path.join(process.cwd(), 'out', assetName));
        console.log('-', path.join(process.cwd(), 'out', 'assets', assetName));
        console.log('-', path.join(process.cwd(), 'assets', assetName));
      }
      return null;
    }
    
    // Read the image file
    const imageBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase().slice(1);
    
    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const mimeType = mimeTypes[ext] || 'image/jpeg';
    
    // Convert to base64 data URL
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    console.log('Successfully loaded image as data URL');
    return dataUrl;
  } catch (error) {
    console.error('Failed to load image:', error);
    return null;
  }
});

// Download images from URLs to local assets
ipcMain.handle('download-images', async (_e, args: { imageUrls: string[]; outputDir: string }) => {
  try {
    const { imageUrls, outputDir } = args;
    console.log('Starting image download for', imageUrls.length, 'images');
    
    const fs = await import('fs');
    const https = await import('https');
    const http = await import('http');
    
    // Create assets directory
    const assetsDir = path.join(outputDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const downloadedImages: any[] = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      try {
        console.log(`Downloading image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
        
        // Generate filename
        const urlObj = new URL(imageUrl);
        const pathname = urlObj.pathname;
        const extension = pathname.split('.').pop() || 'jpg';
        const filename = `image_${i + 1}.${extension}`;
        const filePath = path.join(assetsDir, filename);
        
        // Download the image
        const file = fs.createWriteStream(filePath);
        const protocol = imageUrl.startsWith('https:') ? https : http;
        
        await new Promise<void>((resolve, reject) => {
          protocol.get(imageUrl, (response) => {
            if (response.statusCode === 200) {
              response.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filename}`);
                resolve();
              });
            } else {
              reject(new Error(`HTTP ${response.statusCode}`));
            }
          }).on('error', reject);
        });
        
        // Add to downloaded images list
        downloadedImages.push({
          id: `downloaded-${i}`,
          src: `assets/${filename}`,
          originalSrc: imageUrl,
          alt: `Downloaded Image ${i + 1}`,
          description: `Downloaded from ${urlObj.hostname}`,
          width: 200,
          height: 200,
          format: extension,
          pageSlug: 'home',
          placement: {
            zone: 'unknown',
            confidence: 0.8,
            reasoning: 'Downloaded from external URL'
          },
          source: 'extracted',
          status: 'pending'
        });
        
      } catch (error) {
        console.warn(`Failed to download image ${imageUrl}:`, error);
      }
    }

    console.log(`Successfully downloaded ${downloadedImages.length} images`);
    return downloadedImages;

  } catch (error) {
    console.error('Image download failed:', error);
    throw error;
  }
});
