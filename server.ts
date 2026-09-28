import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import archiver from "archiver";
import { databasePhpContent, syncPhpContent } from "./src/data/gstZenFiles";

const app = express();
const PORT = 3000;
const SERVICE_NAME = "GstZenSyncService";

let inMemoryStatus: "running" | "stopped" | "restarting" = "running";
let lastActionTimestamp = new Date().toISOString();

app.use(express.json());

// Helper function to run shell commands
const runCmd = (cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout || stderr);
    });
  });
};

// --- API ROUTES ---

// 1. Get Windows Service Status
app.get("/api/service/status", async (req, res) => {
  const sId = (req.query.serviceId as string) || SERVICE_NAME;

  try {
    // If not running on Windows (e.g. in preview container), return tracked state
    if (process.platform !== "win32") {
      return res.json({
        status: inMemoryStatus,
        serviceId: sId,
        platform: process.platform,
        lastActionTimestamp,
        message: `Service is currently ${inMemoryStatus.toUpperCase()}`
      });
    }

    const stdout = await runCmd(`sc query "${sId}"`);
    if (stdout.includes("RUNNING")) {
      inMemoryStatus = "running";
      res.json({ status: "running", serviceId: sId, lastActionTimestamp });
    } else if (stdout.includes("STOPPED")) {
      inMemoryStatus = "stopped";
      res.json({ status: "stopped", serviceId: sId, lastActionTimestamp });
    } else {
      res.json({ status: "unknown", serviceId: sId, raw: stdout, lastActionTimestamp });
    }
  } catch (e) {
    // If command fails, service is likely not installed or stopped
    res.json({ status: inMemoryStatus, error: String(e), serviceId: sId, lastActionTimestamp });
  }
});

// 2. Control Windows Service (Start / Stop / Restart / Trigger PHP)
app.post("/api/service/action", async (req, res) => {
  const { action, serviceId, phpPath, ciPath, scriptArgs } = req.body;
  const sId = serviceId || SERVICE_NAME;

  if (!action) {
    return res.status(400).json({ success: false, error: "Action is required (start, stop, restart, trigger)" });
  }

  lastActionTimestamp = new Date().toISOString();

  try {
    if (process.platform !== "win32") {
      // Container / Mock Mode Simulation
      if (action === "start") {
        inMemoryStatus = "running";
        return res.json({
          success: true,
          action: "start",
          status: "running",
          message: `Service "${sId}" successfully started.`,
          timestamp: lastActionTimestamp
        });
      } else if (action === "stop") {
        inMemoryStatus = "stopped";
        return res.json({
          success: true,
          action: "stop",
          status: "stopped",
          message: `Service "${sId}" successfully stopped.`,
          timestamp: lastActionTimestamp
        });
      } else if (action === "restart") {
        inMemoryStatus = "running";
        return res.json({
          success: true,
          action: "restart",
          status: "running",
          message: `Service "${sId}" successfully restarted.`,
          timestamp: lastActionTimestamp
        });
      } else if (action === "trigger") {
        return res.json({
          success: true,
          action: "trigger",
          status: inMemoryStatus,
          message: `Triggered CodeIgniter controller Sync::index() via PHP CLI.`,
          output: `Refreshing... ${new Date().toLocaleTimeString()}\nChecking pending e-invoices in trans_b2beinvoice_mas...\nSync cycle completed.`,
          timestamp: lastActionTimestamp
        });
      }
    }

    // Windows Production Execution
    let output = "";
    if (action === "start") {
      inMemoryStatus = "running";
      output = await runCmd(`net start "${sId}"`).catch(async () => {
        return await runCmd(`nssm start "${sId}"`);
      });
    } else if (action === "stop") {
      inMemoryStatus = "stopped";
      output = await runCmd(`net stop "${sId}"`).catch(async () => {
        return await runCmd(`nssm stop "${sId}"`);
      });
    } else if (action === "restart") {
      inMemoryStatus = "running";
      output = await runCmd(`nssm restart "${sId}"`).catch(async () => {
        await runCmd(`net stop "${sId}"`).catch(() => {});
        return await runCmd(`net start "${sId}"`);
      });
    } else if (action === "trigger") {
      // Execute PHP CLI directly if configured
      const php = phpPath || "php";
      const script = ciPath || "index.php";
      const args = scriptArgs || "Sync index";
      output = await runCmd(`"${php}" "${script}" ${args}`);
    }

    res.json({
      success: true,
      action,
      status: inMemoryStatus,
      serviceId: sId,
      message: `Action "${action}" applied to service "${sId}"`,
      output,
      timestamp: lastActionTimestamp
    });
  } catch (e) {
    res.status(500).json({ success: false, action, error: String(e), timestamp: lastActionTimestamp });
  }
});

// 3. Download Windows Service Deployment Package
app.post("/api/service/download", (req, res) => {
  const { phpPath, ciPath, scriptArgs, serviceId, serviceName } = req.body;

  if (!phpPath || !ciPath) {
    return res.status(400).json({ error: "Missing phpPath or ciPath" });
  }

  const sId = serviceId || 'GstZenSyncService';
  const sName = serviceName || 'GST Zen PHP Sync Service';
  const args = scriptArgs || '';

  const runnerBatContent = `@echo off
echo Starting PHP Sync Service Loop...

:: -------------------------------------------------------------------------
:: CONFIGURATION
:: -------------------------------------------------------------------------
:: 1. Path to your PHP executable
set PHP_PATH="${phpPath}"

:: 2. Path to your CodeIgniter or PHP script
set SCRIPT_PATH="${ciPath}"

:: 3. The Controller and Method (or script arguments) to run
set SCRIPT_ARGS=${args}
:: -------------------------------------------------------------------------

:loop
echo [%time%] Running PHP Sync...

:: Execute the script via PHP CLI
%PHP_PATH% %SCRIPT_PATH% %SCRIPT_ARGS%

:: Wait 10 seconds before the next sync
timeout /t 10 /nobreak > NUL

goto loop
`;

  const installBatContent = `@echo off
echo ==========================================
echo   ${sName} - Installer
echo ==========================================

set "SERVICE_ID=${sId}"
set "SERVICE_NAME=${sName}"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrative permissions confirmed.
) else (
    echo [ERROR] Please right-click and run this script as Administrator.
    pause
    exit /b 1
)

:: Check if the service executable exists
if not exist "nssm.exe" (
    echo [ERROR] nssm.exe Wrapper not found. 
    echo Please download NSSM manually from http://nssm.cc/ 
    echo Extract it, find win64/nssm.exe, and copy it to this folder.
    pause
    exit /b 1
)

echo [INFO] Installing Windows Service...
nssm.exe install "%SERVICE_ID%" "%~dp0runner.bat"
nssm.exe set "%SERVICE_ID%" Description "%SERVICE_NAME%"
nssm.exe set "%SERVICE_ID%" AppDirectory "%~dp0"

echo [INFO] Starting Windows Service...
nssm.exe start "%SERVICE_ID%"

echo.
echo ==========================================
echo [SUCCESS] Service installed and started!
echo ==========================================
pause
`;

  const uninstallBatContent = `@echo off
echo ==========================================
echo   ${sName} - Uninstaller
echo ==========================================

set "SERVICE_ID=${sId}"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrative permissions confirmed.
) else (
    echo [ERROR] Please right-click and run this script as Administrator.
    pause
    exit /b 1
)

echo [INFO] Stopping Windows Service...
nssm.exe stop "%SERVICE_ID%"

echo [INFO] Uninstalling Windows Service...
nssm.exe remove "%SERVICE_ID%" confirm

echo.
echo ==========================================
echo [SUCCESS] Service uninstalled successfully!
echo ==========================================
pause
`;

  res.attachment(`${sId}-package.zip`);
  
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (err) => {
    console.error("Archive error:", err);
    res.status(500).end();
  });

  archive.pipe(res);

  // Add the customized scripts
  archive.append(runnerBatContent, { name: "runner.bat" });
  archive.append(installBatContent, { name: "install-service.bat" });
  archive.append(uninstallBatContent, { name: "uninstall-service.bat" });

  // Add the GST Zen CodeIgniter files requested
  archive.append(syncPhpContent, { name: "Sync.php" });
  archive.append(databasePhpContent, { name: "database.php" });
  archive.append(syncPhpContent, { name: "application/controllers/Sync.php" });
  archive.append(databasePhpContent, { name: "application/config/database.php" });

  const readmeContent = `# ${sName} - Deployment Package

This folder contains a fully automated deployment package to run your PHP CodeIgniter script continuously as a Windows Service. 

## Included Files in this Package:
1. **\`install-service.bat\`**: Auto-installer script to register and start the Windows Service.
2. **\`runner.bat\`**: Continuous loop executing your PHP CLI command.
3. **\`uninstall-service.bat\`**: Safe service remover.
4. **\`Sync.php\`** (also mirrored in \`application/controllers/Sync.php\`): The CodeIgniter Controller that executes the GST Zen e-invoice synchronization, credit notes, cancellations, and QR Code / PDF saving.
5. **\`database.php\`** (also mirrored in \`application/config/database.php\`): The database connectivity configuration using ODBC with SQL Server Native Client.

## What you need to do on your Windows Server:

1. Download **NSSM** manually from [http://nssm.cc/](http://nssm.cc/).
2. Extract the downloaded zip file and go into the \`win64\` folder.
3. Copy the \`nssm.exe\` file.
4. Paste the \`nssm.exe\` file **directly into the same folder** where your \`install-service.bat\` and \`runner.bat\` are located.
5. Place \`Sync.php\` into your CodeIgniter \`application/controllers/\` directory (if not already there).
6. Place \`database.php\` into your CodeIgniter \`application/config/\` directory (if not already there).
7. Right click the \`install-service.bat\` script and run as **Administrator**.

The batch script will see the \`nssm.exe\` sitting right next to it and use it automatically to install your service!

## Uninstallation

If you ever need to remove or update the service:
- Right-click on **\`uninstall-service.bat\`** and select **"Run as Administrator"**.
`;
  archive.append(readmeContent, { name: "README.md" });

  archive.finalize();
});

// 4. Download Pure Node.js Sync Package (XAMPP-Free)
app.post("/api/node-sync/download", async (req, res) => {
  const { nodeSyncJsCode, nodePackageJson, nodeEnvExample } = await import("./src/data/nodeSyncScript");

  res.attachment("gstzen-node-sync-package.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (err) => {
    console.error("Archive error:", err);
    res.status(500).end();
  });

  archive.pipe(res);

  archive.append(nodeSyncJsCode, { name: "sync-service.js" });
  archive.append(nodePackageJson, { name: "package.json" });
  archive.append(nodeEnvExample, { name: ".env" });

  // Add node-windows service installer script
  const serviceInstallJs = `var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name: 'GST Zen E-Invoice Sync Service',
  description: 'Pure Node.js background service for GST Zen E-Invoice and Credit Note synchronization.',
  script: require('path').join(__dirname, 'sync-service.js'),
  nodeOptions: [
    '--max-old-space-size=512'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function(){
  console.log('Service installed successfully!');
  svc.start();
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', function(){
  console.log('This service is already installed.');
});

// Listen for the "start" event
svc.on('start', function(){
  console.log('GST Zen Sync Service started successfully!');
});

svc.install();
`;
  archive.append(serviceInstallJs, { name: "install-service.js" });

  // Add node-windows service uninstaller script
  const serviceUninstallJs = `var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name: 'GST Zen E-Invoice Sync Service',
  script: require('path').join(__dirname, 'sync-service.js')
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function(){
  console.log('Service uninstalled successfully!');
  console.log('The service exists: ', svc.exists);
});

svc.uninstall();
`;
  archive.append(serviceUninstallJs, { name: "uninstall-service.js" });

  // Add install-service.bat
  const installBat = `@echo off
TITLE Install GST Zen Windows Service
color 0A
echo ========================================================
echo Installing GST Zen Node.js Sync as a Windows Service...
echo ========================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required!
    echo Please right-click 'install-service.bat' and select "Run as administrator".
    pause
    exit /b
)

echo Installing npm dependencies including node-windows...
call npm install

echo Installing Windows Service...
node install-service.js

echo ========================================================
echo Installation complete! You can verify in Windows Services (services.msc)
echo ========================================================
pause
`;
  archive.append(installBat, { name: "install-service.bat" });

  // Add uninstall-service.bat
  const uninstallBat = `@echo off
TITLE Uninstall GST Zen Windows Service
color 0C
echo ========================================================
echo Uninstalling GST Zen Windows Service...
echo ========================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required!
    echo Please right-click 'uninstall-service.bat' and select "Run as administrator".
    pause
    exit /b
)

echo Uninstalling Windows Service...
node uninstall-service.js

echo ========================================================
echo Service uninstalled successfully.
echo ========================================================
pause
`;
  archive.append(uninstallBat, { name: "uninstall-service.bat" });

  const readmeNode = `# GST Zen Node.js Sync Service (XAMPP-Free Windows Service)

This package contains a pure Node.js service script that runs your GST Zen E-Invoice & Credit Note synchronization directly as a native **Windows Service** **without requiring XAMPP, Apache, IIS, or PHP**.

## One-Click Windows Service Installation:

1. **Install Node.js** (LTS version) from [https://nodejs.org/](https://nodejs.org/) on your server or PC.
2. Extract this zip folder to a permanent folder on your server (e.g., \`C:\\gstzen-node-sync\`).
3. Update your database credentials and server settings in the \`.env\` file.
4. **To Install Service**: Right-click on \`install-service.bat\` and select **"Run as administrator"**.
   - This automatically installs the dependencies and registers it into Windows Services (\`services.msc\`) under the name **"GST Zen E-Invoice Sync Service"** to run 24/7 automatically even after server reboots.
5. **To Uninstall Service**: Right-click on \`uninstall-service.bat\` and select **"Run as administrator"**.

## Manual Commands:
- Test running interactively: \`npm start\`
`;
  archive.append(readmeNode, { name: "README.md" });
  archive.finalize();
});

// 5. Test Run Node.js Sync Simulation
app.post("/api/node-sync/run", async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  res.json({
    success: true,
    message: "Node.js sync cycle executed successfully.",
    output: `[${timestamp}] [Node.js Sync Daemon] Connected to SQL Server (ODBC/Tedious).
[${timestamp}] Querying trans_b2beinvoice_mas for pending e-invoices...
[${timestamp}] Found 1 pending B2B invoice (#INV-2026-001).
[${timestamp}] Building JSON payload (DocDtls, ValDtls, TranDtls, SellerDtls, BuyerDtls, ItemList).
[${timestamp}] Sending POST request to https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/...
[${timestamp}] API Response: status=1, IRN=8f9b4c2... AckNo=1302...
[${timestamp}] Successfully inserted response into Response_ZenGst table.
[${timestamp}] Downloaded Signed PDF & QR Code PNG to D:/SignedQrCode/HOTEL01/INV-2026-001.pdf
[${timestamp}] Updated trans_b2beinvoice_mas set Syncflag=1.
[${timestamp}] Sync cycle completed cleanly. No errors.`
  });
});



async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
