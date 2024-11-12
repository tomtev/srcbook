import { app, BrowserWindow } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let apiProcess: any = null;

function startApiServer() {
  const apiPath = isDev 
    ? path.join(__dirname, '../../../api/dist/index.js')  // Development path
    : path.join(process.resourcesPath, 'api/dist/index.js');  // Production path

  apiProcess = spawn('node', [apiPath], {
    stdio: 'pipe'  // or 'inherit' for debugging
  });

  apiProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`API: ${data}`);
  });

  apiProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`API Error: ${data}`);
  });
}

async function createWindow() {
  // Start the API server first
  startApiServer();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const webBuildPath = path.join(process.resourcesPath, 'web-build', 'index.html');
    await mainWindow.loadFile(webBuildPath);
  }
}

app.whenReady().then(createWindow);

// Quit the API server when the app closes
app.on('window-all-closed', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 