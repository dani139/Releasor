const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const CommandRunner = require('./src/main/command-runner');

// Hot reload in development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

let mainWindow;
let commandRunner;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // Point to Vite dev server in dev, or built index.html in prod
  const isDev = !app.isPackaged;
  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, 'frontend/dist/index.html')}`;
  
  mainWindow.loadURL(url);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Development tools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize command runner
  commandRunner = new CommandRunner();
  
  // Set up IPC handlers
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Execute command
  ipcMain.handle('execute-command', async (event, commandKey, environment = null) => {
    try {
      const result = await commandRunner.execute(commandKey, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get command output stream
  ipcMain.handle('start-command-stream', async (event, commandKey, environment = null) => {
    try {
      const streamId = await commandRunner.startStream(commandKey, environment);
      return { success: true, streamId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Stop command stream
  ipcMain.handle('stop-command-stream', async (event, streamId) => {
    try {
      await commandRunner.stopStream(streamId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get configuration
  ipcMain.handle('get-config', async () => {
    try {
      const config = commandRunner.getConfig();
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update configuration
  ipcMain.handle('update-config', async (event, newConfig) => {
    try {
      await commandRunner.updateConfig(newConfig);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Stream data events
  commandRunner.on('stream-data', (streamId, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-data', { streamId, data });
    }
  });

  commandRunner.on('stream-end', (streamId) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-end', { streamId });
    }
  });

  commandRunner.on('stream-error', (streamId, error) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-error', { streamId, error });
    }
  });
} 