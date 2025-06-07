const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Command execution
  executeCommand: (commandKey, environment) => 
    ipcRenderer.invoke('execute-command', commandKey, environment),
  
  startCommandStream: (commandKey, environment) => 
    ipcRenderer.invoke('start-command-stream', commandKey, environment),
  
  stopCommandStream: (streamId) => 
    ipcRenderer.invoke('stop-command-stream', streamId),

  // Configuration
  getConfig: () => 
    ipcRenderer.invoke('get-config'),
  
  updateConfig: (newConfig) => 
    ipcRenderer.invoke('update-config', newConfig),

  // Stream events
  onStreamData: (callback) => 
    ipcRenderer.on('stream-data', callback),
  
  onStreamEnd: (callback) => 
    ipcRenderer.on('stream-end', callback),
  
  onStreamError: (callback) => 
    ipcRenderer.on('stream-error', callback),

  // Remove listeners
  removeAllListeners: (channel) => 
    ipcRenderer.removeAllListeners(channel)
}); 