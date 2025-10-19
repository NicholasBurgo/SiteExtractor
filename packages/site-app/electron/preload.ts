import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('SG', {
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  openPath: (p: string) => ipcRenderer.invoke('open-path', p),
  runPipeline: (args: { url: string; out: string; base: string; pages: number; noLLM: boolean }) => 
    ipcRenderer.invoke('run-pipeline', args),
  loadExtractedData: (path: string) => ipcRenderer.invoke('load-extracted-data', path),
  loadTruthData: (path: string) => ipcRenderer.invoke('load-truth-data', path),
  loadImageAsDataUrl: (path: string) => ipcRenderer.invoke('load-image-as-data-url', path),
  onLog: (cb: (line: string) => void) => {
    ipcRenderer.on('pipe-log', (_, line) => cb(line));
  },
  removeLogListener: () => {
    ipcRenderer.removeAllListeners('pipe-log');
  }
});

declare global { 
  interface Window { 
    SG: {
      chooseDir: () => Promise<string | null>;
      openPath: (p: string) => Promise<boolean>;
      runPipeline: (args: { url: string; out: string; base: string; pages: number; noLLM: boolean }) => Promise<{ code: number | null; outputPath?: string }>;
      loadExtractedData: (path: string) => Promise<any>;
      loadTruthData: (path: string) => Promise<any>;
      loadImageAsDataUrl: (path: string) => Promise<string | null>;
      onLog: (cb: (line: string) => void) => void;
      removeLogListener: () => void;
    }
  } 
}
