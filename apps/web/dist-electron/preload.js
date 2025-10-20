"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    extractTruthTable: (url, options) => electron_1.ipcRenderer.invoke('extract-truth-table', url, options),
    retryTruthTable: (url, options) => electron_1.ipcRenderer.invoke('retry-truth-table', url, options),
    getExtractionData: (runId) => electron_1.ipcRenderer.invoke('get-extraction-data', runId),
});
//# sourceMappingURL=preload.js.map