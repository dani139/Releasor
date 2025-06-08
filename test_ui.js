const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let testWindow;

// Simple function to check if a port is available
async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request({ port, method: 'HEAD' }, () => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

// Find the actual Vite port
async function findVitePort() {
  const ports = [5173, 5174, 5175, 5176, 5177, 5178];
  for (const port of ports) {
    if (await checkPort(port)) {
      console.log(`Found Vite running on port ${port}`);
      return port;
    }
  }
  return 5173; // fallback
}

// Minimal IPC handlers to prevent errors
function setupMinimalIpcHandlers() {
  ipcMain.handle('get-config', async () => {
    return { 
      success: true, 
      data: {
        environments: ['development', 'production'],
        commands: {},
        defaultEnvironment: 'development'
      }
    };
  });

  ipcMain.handle('get-all-containers-status', async () => {
    return { 
      success: true, 
      data: [
        { name: 'backend', status: 'running' },
        { name: 'postgres', status: 'running' },
        { name: 'wuzapi', status: 'stopped' }
      ]
    };
  });
}

async function createTestWindow() {
  setupMinimalIpcHandlers();
  
  testWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Find the actual Vite port
  const vitePort = await findVitePort();
  const url = `http://localhost:${vitePort}`;
  
  console.log(`Loading test URL: ${url}`);
  
  try {
    await testWindow.loadURL(url);
    testWindow.show();

    // Wait a bit for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, `ui-test-${timestamp}.png`);
    
    const image = await testWindow.capturePage();
    fs.writeFileSync(screenshotPath, image.toPNG());
    console.log(`Screenshot saved: ${screenshotPath}`);
    
    // Close window and quit immediately
    testWindow.close();
    process.exit(0);
    
  } catch (error) {
    console.error('Failed to load URL or take screenshot:', error);
    process.exit(1);
  }
}

app.whenReady().then(() => {
  createTestWindow().catch(console.error);
});

app.on('window-all-closed', () => {
  app.quit();
}); 