"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const child_process_1 = require("child_process");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
        },
        title: 'Site Generator',
        icon: (0, path_1.join)(__dirname, '../assets/icon.png'), // You can add an icon later
    });
    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC handlers for extraction
electron_1.ipcMain.handle('extract-truth-table', async (event, url, options) => {
    return new Promise((resolve, reject) => {
        // Run the Python truth extractor
        const pythonProcess = (0, child_process_1.spawn)('py', ['truth_extractor.py', url, options.maxPages || 20, options.timeout || 10, options.usePlaywright || true], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let output = '';
        let errorOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Extract run ID from the output
                    const lines = output.trim().split('\n');
                    const runId = lines[lines.length - 1].replace('SUCCESS: ', '');
                    // Read the truth.json file that was created
                    const fs = require('fs');
                    const path = require('path');
                    const truthPath = path.join(process.cwd(), '..', '..', 'runs', runId, 'truth.json');
                    if (fs.existsSync(truthPath)) {
                        const truthData = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
                        resolve({ success: true, runId, truthData });
                    }
                    else {
                        resolve({ success: true, runId, truthData: null });
                    }
                }
                catch (parseError) {
                    reject(new Error(`Failed to parse extraction results: ${parseError}`));
                }
            }
            else {
                reject(new Error(`Extraction failed: ${errorOutput}`));
            }
        });
        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to start Python subprocess: ${err.message}`));
        });
    });
});
// IPC handler for retry truth table extraction
electron_1.ipcMain.handle('retry-truth-table', async (event, url, options) => {
    return new Promise((resolve, reject) => {
        // Run the Python truth extractor again
        const pythonProcess = (0, child_process_1.spawn)('py', ['truth_extractor.py', url, options.maxPages || 20, options.timeout || 10, options.usePlaywright || true], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let output = '';
        let errorOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Extract run ID from the output
                    const lines = output.trim().split('\n');
                    const runId = lines[lines.length - 1].replace('SUCCESS: ', '');
                    // Read the truth.json file that was created
                    const fs = require('fs');
                    const path = require('path');
                    const truthPath = path.join(process.cwd(), '..', '..', 'runs', runId, 'truth.json');
                    if (fs.existsSync(truthPath)) {
                        const truthData = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
                        resolve({ success: true, runId, truthData });
                    }
                    else {
                        resolve({ success: true, runId, truthData: null });
                    }
                }
                catch (parseError) {
                    reject(new Error(`Failed to parse extraction results: ${parseError}`));
                }
            }
            else {
                reject(new Error(`Retry extraction failed: ${errorOutput}`));
            }
        });
        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to start Python subprocess: ${err.message}`));
        });
    });
});
electron_1.ipcMain.handle('get-extraction-data', async (event, runId) => {
    // Return the extracted data from the runs directory
    const fs = require('fs').promises;
    const path = require('path');
    try {
        const runPath = path.join(process.cwd(), '..', '..', 'runs', runId);
        const truthPath = path.join(runPath, 'truth.json');
        const data = await fs.readFile(truthPath, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        throw new Error(`Failed to load extraction data: ${error}`);
    }
});
//# sourceMappingURL=main.js.map