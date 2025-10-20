"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
// Fix cache issues on Windows
const userDataPath = electron_1.app.getPath('userData');
const cachePath = node_path_1.default.join(userDataPath, 'cache');
// Set cache directory before app ready
electron_1.app.setPath('cache', cachePath);
electron_1.app.setPath('userCache', cachePath);
let win = null;
function createWin() {
    win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: node_path_1.default.join(__dirname, 'preload.js'),
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
            }
            else {
                win?.setFullScreen(true);
            }
        }
    });
    // Always load from built files - no web server needed
    win.loadFile(node_path_1.default.join(__dirname, '..', 'dist', 'index.html'));
}
// Additional app configuration to prevent cache issues
electron_1.app.commandLine.appendSwitch('disable-gpu-sandbox');
electron_1.app.commandLine.appendSwitch('disable-software-rasterizer');
electron_1.app.commandLine.appendSwitch('disable-gpu');
electron_1.app.commandLine.appendSwitch('no-sandbox');
electron_1.app.whenReady().then(() => {
    // Create cache directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
    }
    createWin();
});
electron_1.app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    electron_1.app.quit(); });
electron_1.app.on('activate', () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
    createWin(); });
electron_1.ipcMain.handle('choose-dir', async () => {
    const res = await electron_1.dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths.length)
        return null;
    return res.filePaths[0];
});
electron_1.ipcMain.handle('open-path', async (_e, p) => {
    await electron_1.shell.openPath(p);
    return true;
});
electron_1.ipcMain.handle('run-pipeline', async (_e, args) => {
    const { url, out, base, pages, noLLM } = args;
    // Ensure the output directory exists
    const outputDir = node_path_1.default.resolve(out);
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
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
    const workingDir = node_path_1.default.join(__dirname, '..', '..', '..');
    console.log('Running Python extraction:');
    console.log('  Command:', pythonCmd, flags.join(' '));
    console.log('  Working dir:', workingDir);
    console.log('  Output dir:', outputDir);
    const child = (0, node_child_process_1.spawn)(pythonCmd, flags, {
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
    return await new Promise((resolve) => {
        child.on('close', code => {
            console.log('Python process exited with code:', code);
            console.log('Returning output path:', outputDir);
            // Return the actual output path that was used
            resolve({ code, outputPath: outputDir });
        });
    });
});
electron_1.ipcMain.handle('load-extracted-data', async (_e, outputPath) => {
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        // Look for .page.json files in the output directory
        const files = fs.readdirSync(outputPath);
        const pageFile = files.find(f => f.endsWith('.page.json'));
        if (pageFile) {
            const filePath = path.join(outputPath, pageFile);
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    }
    catch (error) {
        console.error('Failed to load extracted data:', error);
        return null;
    }
});
electron_1.ipcMain.handle('load-truth-data', async (_e, outputPath) => {
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        console.log('=== LOADING TRUTH DATA ===');
        console.log('Output path:', outputPath);
        console.log('Resolved path:', path.resolve(outputPath));
        // Check if the path is already a truth.json file
        if (outputPath.endsWith('truth.json')) {
            console.log('Direct truth.json file path provided');
            if (fs.existsSync(outputPath)) {
                console.log('✓ Found truth.json at:', outputPath);
                const data = fs.readFileSync(outputPath, 'utf8');
                const parsed = JSON.parse(data);
                console.log('✓ Loaded truth data for:', parsed.domain);
                return parsed;
            }
            else {
                console.error('✗ Truth.json file not found at:', outputPath);
                return null;
            }
        }
        // Otherwise, treat it as a directory and look for truth.json
        console.log('Directory path provided, looking for truth.json');
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
                }
                catch (err) {
                    console.log('Skipping file:', file, err);
                }
            }
        }
        console.error('✗ No truth.json found anywhere!');
        console.error('Searched in:', outputPath);
        return null;
    }
    catch (error) {
        console.error('✗ Failed to load truth data:', error);
        return null;
    }
});
electron_1.ipcMain.handle('load-image-as-data-url', async (_e, imagePath) => {
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
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
        const mimeTypes = {
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
    }
    catch (error) {
        console.error('Failed to load image:', error);
        return null;
    }
});
