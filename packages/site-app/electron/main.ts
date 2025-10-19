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
  
  // Always load from built files - no web server needed
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
  
  // Ensure the output directory exists
  const outputDir = path.resolve(out);
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
  const workingDir = path.join(__dirname, '..', '..', '..');
  console.log('Running Python extraction:');
  console.log('  Command:', pythonCmd, flags.join(' '));
  console.log('  Working dir:', workingDir);
  console.log('  Output dir:', outputDir);
  
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
    
    // First, try to find truth.json directly in the output path
    let truthFilePath = path.join(outputPath, 'truth.json');
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
    if (fs.existsSync(outputPath)) {
      const files = fs.readdirSync(outputPath);
      console.log('Contents of output directory:', files);
      
      // Look for directories that might contain truth.json
      for (const file of files) {
        const fullPath = path.join(outputPath, file);
        
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
    console.error('Searched in:', outputPath);
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
    
    // Resolve the path
    const resolvedPath = path.resolve(imagePath);
    console.log('Resolved image path:', resolvedPath);
    
    if (!fs.existsSync(resolvedPath)) {
      console.error('Image file not found:', resolvedPath);
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
