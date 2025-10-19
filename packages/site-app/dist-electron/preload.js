"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('SG', {
    chooseDir: () => electron_1.ipcRenderer.invoke('choose-dir'),
    openPath: (p) => electron_1.ipcRenderer.invoke('open-path', p),
    runPipeline: (args) => electron_1.ipcRenderer.invoke('run-pipeline', args),
    loadExtractedData: (path) => electron_1.ipcRenderer.invoke('load-extracted-data', path),
    loadTruthData: (path) => electron_1.ipcRenderer.invoke('load-truth-data', path),
    loadImageAsDataUrl: (path) => electron_1.ipcRenderer.invoke('load-image-as-data-url', path),
    onLog: (cb) => {
        electron_1.ipcRenderer.on('pipe-log', (_, line) => cb(line));
    },
    removeLogListener: () => {
        electron_1.ipcRenderer.removeAllListeners('pipe-log');
    }
});
