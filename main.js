const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const CommandRunner = require('./src/main/command-runner');

// Hot reload in development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
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
  const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test');
  
  // In test mode, always use the built version
  // Use environment variable for port or try common ports
  const devPort = process.env.VITE_PORT || '5175';
  const url = (isDev && !isTest)
    ? `http://localhost:${devPort}`
    : `file://${path.join(__dirname, 'frontend/dist/index.html')}`;
  
  console.log(`Loading URL: ${url} (isDev: ${isDev}, isTest: ${isTest})`);
  
  mainWindow.loadURL(url);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Development tools - don't open during tests
  if (isDev && !isTest) {
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

  // Container operations
  ipcMain.handle('start-container', async (event, containerName, environment) => {
    try {
      const result = await commandRunner.startContainer(containerName, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stop-container', async (event, containerName, environment) => {
    try {
      const result = await commandRunner.stopContainer(containerName, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('restart-container', async (event, containerName, environment) => {
    try {
      const result = await commandRunner.restartContainer(containerName, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-container-status', async (event, containerName, environment) => {
    try {
      const result = await commandRunner.getContainerStatus(containerName, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-all-containers-status', async (event, environment) => {
    try {
      const result = await commandRunner.getAllContainersStatus(environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Service operations
  ipcMain.handle('start-service', async (event, serviceName, environment) => {
    try {
      const result = await commandRunner.startService(serviceName, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stop-service', async (event, serviceName, environment) => {
    try {
      const result = await commandRunner.stopService(serviceName, environment);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-service-status', async (event, serviceName, environment) => {
    try {
      const result = await commandRunner.getServiceStatus(serviceName, environment);
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

  // Start dynamic command stream
  ipcMain.handle('start-dynamic-command-stream', async (event, command, streamId) => {
    try {
      const actualStreamId = await commandRunner.startDynamicStream(command, streamId);
      return { success: true, streamId: actualStreamId };
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