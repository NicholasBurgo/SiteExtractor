import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  extractTruthTable: (url: string, options?: any) => 
    ipcRenderer.invoke('extract-truth-table', url, options),
  retryTruthTable: (url: string, options?: any) => 
    ipcRenderer.invoke('retry-truth-table', url, options),
  getExtractionData: (runId: string) => 
    ipcRenderer.invoke('get-extraction-data', runId),
});
