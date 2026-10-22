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
setlocal enabledelayedexpansion

TITLE GST Zen PHP Sync Background Daemon
cd /d "%~dp0"

echo ========================================================
echo   GST Zen PHP Sync Background Daemon
echo   Compatible with Windows Server 2003 R2 / 2008 / 2012+
echo ========================================================

:: -------------------------------------------------------------------------
:: 1. PHP Executable Detection
:: -------------------------------------------------------------------------
set "PHP_EXE=${phpPath}"

if not exist "!PHP_EXE!" (
    if exist "C:\\xampp\\php\\php.exe" set "PHP_EXE=C:\\xampp\\php\\php.exe"
    if exist "C:\\php\\php.exe" set "PHP_EXE=C:\\php\\php.exe"
    if exist "D:\\php\\php.exe" set "PHP_EXE=D:\\php\\php.exe"
    if exist "D:\\xampp\\php\\php.exe" set "PHP_EXE=D:\\xampp\\php\\php.exe"
    if exist "C:\\Program Files\\PHP\\php.exe" set "PHP_EXE=C:\\Program Files\\PHP\\php.exe"
    if exist "D:\\microgennbackup\\microgenn\\Exe\\php\\php.exe" set "PHP_EXE=D:\\microgennbackup\\microgenn\\Exe\\php\\php.exe"
)

if not exist "!PHP_EXE!" (
    for %%X in (php.exe) do (
        set "FOUND_PHP=%%~$PATH:X"
        if defined FOUND_PHP set "PHP_EXE=!FOUND_PHP!"
    )
)

if not exist "!PHP_EXE!" (
    echo [%date% %time%] [ERROR] PHP executable was NOT found!
    echo Looked at:
    echo   - ${phpPath}
    echo   - C:\\xampp\\php\\php.exe
    echo   - C:\\php\\php.exe
    echo   - D:\\php\\php.exe
    echo   - System PATH
    echo Please edit runner.bat and set PHP_EXE to your actual php.exe location.
    ping 127.0.0.1 -n 20 >nul
    exit /b 1
)

:: -------------------------------------------------------------------------
:: 2. CodeIgniter entry script (index.php) Detection
:: -------------------------------------------------------------------------
set "CI_SCRIPT=${ciPath}"

if not exist "!CI_SCRIPT!" (
    if exist "%~dp0index.php" set "CI_SCRIPT=%~dp0index.php"
    if exist "%~dp0..\\index.php" set "CI_SCRIPT=%~dp0..\\index.php"
    if exist "C:\\xampp\\htdocs\\index.php" set "CI_SCRIPT=C:\\xampp\\htdocs\\index.php"
    if exist "D:\\xampp\\htdocs\\index.php" set "CI_SCRIPT=D:\\xampp\\htdocs\\index.php"
    if exist "D:\\microgennbackup\\microgenn\\Exe\\exe\\index.php" set "CI_SCRIPT=D:\\microgennbackup\\microgenn\\Exe\\exe\\index.php"
)

:: -------------------------------------------------------------------------
:: 3. Controller arguments
:: -------------------------------------------------------------------------
set "SCRIPT_ARGS=${args}"

echo [CONFIG] PHP Executable: "!PHP_EXE!"
echo [CONFIG] Entry Script:   "!CI_SCRIPT!"
echo [CONFIG] Arguments:      !SCRIPT_ARGS!
echo.

:loop
echo [%date% %time%] Running: "!PHP_EXE!" "!CI_SCRIPT!" !SCRIPT_ARGS!
"!PHP_EXE!" "!CI_SCRIPT!" !SCRIPT_ARGS!

:: 10-second pause compatible with Windows Server 2003 R2 (timeout.exe does not exist on Server 2003)
ping 127.0.0.1 -n 11 >nul

goto loop
`;

  const testRunnerBatContent = `@echo off
TITLE GST Zen PHP Interactive Tester
cd /d "%~dp0"
echo ========================================================
echo   GST Zen PHP Sync - Interactive Test Runner
echo   Run this to test PHP execution in console before service
echo ========================================================
echo.
call "%~dp0runner.bat"
echo.
echo ========================================================
echo [STOPPED] Runner finished. Press any key to exit.
echo ========================================================
pause
`;

  const installBatContent = `@echo off
setlocal enabledelayedexpansion
TITLE Install ${sName}
color 0A
cd /d "%~dp0"

echo ========================================================
echo   ${sName} - Windows Service Installer
echo   Compatible with Windows Server 2003 R2 / 2008 / 2012+
echo ========================================================

set "SERVICE_ID=${sId}"
set "SERVICE_NAME=${sName}"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative permissions required!
    echo Please right-click 'install-service.bat' and select "Run as administrator".
    pause
    exit /b 1
)

:: Check if nssm.exe exists
if not exist "nssm.exe" (
    echo [ERROR] nssm.exe wrapper not found in this folder!
    echo.
    echo FOR WINDOWS SERVER 2003 R2 (32-bit / x86):
    echo   1. Download NSSM 2.24 from: https://nssm.cc/release/nssm-2.24.zip
    echo   2. Extract and copy from 'win32\\nssm.exe' (NOT win64!) into this folder.
    echo.
    echo FOR 64-bit Windows Server:
    echo   Copy 'win64\\nssm.exe' into this folder.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0runner.bat" (
    echo [ERROR] runner.bat not found in: %~dp0
    echo Please ensure runner.bat is in the same folder as install-service.bat.
    pause
    exit /b 1
)

echo [INFO] Stopping and removing any previous instance of '%SERVICE_ID%'...
set "SCRIPT_DIR=%~dp0"
if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

"%SCRIPT_DIR%\\nssm.exe" stop "%SERVICE_ID%" >nul 2>&1
"%SCRIPT_DIR%\\nssm.exe" remove "%SERVICE_ID%" confirm >nul 2>&1

echo [INFO] Installing Windows Service via NSSM...
:: CRITICAL FOR WINDOWS SERVER 2003 R2:
:: 1. Strip trailing backslash from SCRIPT_DIR to avoid quote-escaping bug in Windows C runtime!
:: 2. Specify cmd.exe as Application and /c runner.bat as AppParameters (in AppDirectory)!
set "COMSPEC_CMD=%COMSPEC%"
if not defined COMSPEC_CMD set "COMSPEC_CMD=%SystemRoot%\\system32\\cmd.exe"

"%SCRIPT_DIR%\\nssm.exe" install "%SERVICE_ID%" "%COMSPEC_CMD%"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppParameters "/c runner.bat"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppDirectory "!SCRIPT_DIR!"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" DisplayName "%SERVICE_NAME%"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" Description "%SERVICE_NAME% - GST Zen E-Invoice Background Daemon"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" Start SERVICE_AUTO_START

:: Configure log capture
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppStdout "!SCRIPT_DIR!\\service-output.log"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppStderr "!SCRIPT_DIR!\\service-error.log"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppRotateFiles 1
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppRotateBytes 5242880

echo [INFO] Starting Windows Service...
"%SCRIPT_DIR%\\nssm.exe" start "%SERVICE_ID%"
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo ========================================================
    echo [ERROR] Windows Service failed to start! (Code %errorLevel%)
    echo ========================================================
    echo If services.msc shows "service-specific error code 3":
    echo Windows cannot find the path specified (ERROR_PATH_NOT_FOUND).
    echo.
    echo 1. Run 'fix-error-3.bat' for 1-click automatic path repair.
    echo 2. Run 'diagnose-nssm.bat' for full diagnostics and logs.
    echo 3. Check '!SCRIPT_DIR!\\service-error.log' for PHP errors.
    echo 4. Run 'nssm.exe edit %SERVICE_ID%' to view/fix paths in GUI.
    echo ========================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [SUCCESS] Windows Service '%SERVICE_NAME%' installed and RUNNING!
echo.
echo View in Windows Services: Press Win+R -> services.msc
echo Log Files:
echo   - Output: !SCRIPT_DIR!\\service-output.log
echo   - Errors: !SCRIPT_DIR!\\service-error.log
echo ========================================================
pause
`;

  const uninstallBatContent = `@echo off
TITLE Uninstall ${sName}
color 0C
cd /d "%~dp0"

echo ========================================================
echo   ${sName} - Windows Service Uninstaller
echo ========================================================

set "SERVICE_ID=${sId}"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative permissions required!
    echo Please right-click 'uninstall-service.bat' and select "Run as administrator".
    pause
    exit /b 1
)

echo [INFO] Stopping Windows Service...
"%~dp0nssm.exe" stop "%SERVICE_ID%"

echo [INFO] Uninstalling Windows Service...
"%~dp0nssm.exe" remove "%SERVICE_ID%" confirm

echo.
echo ========================================================
echo [SUCCESS] Service uninstalled successfully!
echo ========================================================
pause
`;

  const diagnoseBatContent = `@echo off
setlocal enabledelayedexpansion
TITLE NSSM Service Diagnostic and Auto-Repair Tool
color 0F
cd /d "%~dp0"

echo ===============================================================================
echo         NSSM WINDOWS SERVICE DIAGNOSTIC & AUTO-REPAIR UTILITY
echo         Optimized for Windows Server 2003 R2 / XP / 2008 / 2012+
echo ===============================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Administrative privileges are REQUIRED.
    echo Please right-click 'diagnose-nssm.bat' and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

:: 2. Find nssm.exe
set "NSSM_EXE=%~dp0nssm.exe"
if not exist "!NSSM_EXE!" (
    for %%X in (nssm.exe) do (
        set "FOUND_NSSM=%%~$PATH:X"
        if defined FOUND_NSSM set "NSSM_EXE=!FOUND_NSSM!"
    )
)

if not exist "!NSSM_EXE!" (
    color 0C
    echo [ERROR] nssm.exe not found in %~dp0 or System PATH!
    echo Please copy 32-bit nssm.exe (from nssm-2.24\\win32\\) into this folder.
    echo.
    pause
    exit /b 1
)

echo [OK] Found NSSM executable: !NSSM_EXE!
echo.

:: 3. Test nssm.exe execution (32-bit vs 64-bit architecture check)
"!NSSM_EXE!" version >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo ===============================================================================
    echo [CRITICAL ERROR] nssm.exe failed to execute!
    echo ===============================================================================
    echo Reason: You copied the 64-bit 'win64\\nssm.exe' onto a 32-bit Windows Server!
    echo Solution:
    echo   1. Open 'nssm-2.24.zip'
    echo   2. Go to the 'win32' folder (NOT win64!)
    echo   3. Copy 'nssm.exe' into this folder to overwrite.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)
echo [OK] nssm.exe architecture verified (compatible with this OS).
echo.

set "SERVICE_ID=${sId}"

:: 4. Query Service Status
"!NSSM_EXE!" status "%SERVICE_ID%" >nul 2>&1
if %errorLevel% neq 0 (
    echo [NOTICE] Service '%SERVICE_ID%' is not registered yet in Windows Services.
) else (
    echo [STATUS] Service '%SERVICE_ID%' is registered:
    for /f "tokens=*" %%S in ('"!NSSM_EXE!" status "%SERVICE_ID%" 2^>nul') do echo   Current Status: %%S
)

echo.
echo ===============================================================================
echo CURRENT NSSM CONFIGURATION:
echo ===============================================================================
for /f "tokens=*" %%A in ('"!NSSM_EXE!" get "%SERVICE_ID%" Application 2^>nul') do echo   Application:       %%A
for /f "tokens=*" %%D in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppDirectory 2^>nul') do echo   Startup Directory: %%D
for /f "tokens=*" %%P in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppParameters 2^>nul') do echo   Parameters:        %%P
for /f "tokens=*" %%O in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppStdout 2^>nul') do echo   Stdout Log:        %%O
for /f "tokens=*" %%E in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppStderr 2^>nul') do echo   Stderr Log:        %%E
echo.

:: 5. Display error logs if present
if exist "%~dp0service-error.log" (
    echo ===============================================================================
    echo RECENT ENTRIES IN service-error.log (Crash details):
    echo ===============================================================================
    type "%~dp0service-error.log"
    echo ===============================================================================
    echo.
)

echo ===============================================================================
echo CHOOSE A DIAGNOSTIC / REPAIR ACTION:
echo ===============================================================================
echo [0] INSTANT FIX for "service-specific error code 3" (Fixes AppDirectory trailing quote bug)
echo [1] Run Interactive Test (Runs runner.bat directly in console to see crash output)
echo [2] Auto-Repair & Re-register Service (Fixes cmd.exe, working dir, and parameters)
echo [3] Open NSSM GUI Editor (nssm edit %SERVICE_ID%)
echo [4] Start Service (nssm start %SERVICE_ID%)
echo [5] Stop Service (nssm stop %SERVICE_ID%)
echo [6] Exit
echo.
set /p CHOICE="Select an option [0-6]: "

if "%CHOICE%"=="0" (
    echo.
    echo [FIX 3] Repairing service-specific error code 3 (ERROR_PATH_NOT_FOUND)...
    set "SCRIPT_DIR=%~dp0"
    if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"
    set "COMSPEC_CMD=%COMSPEC%"
    if not defined COMSPEC_CMD set "COMSPEC_CMD=%SystemRoot%\\system32\\cmd.exe"
    
    echo [1/4] Stopping service...
    "!NSSM_EXE!" stop "%SERVICE_ID%" >nul 2>&1
    
    echo [2/4] Setting AppDirectory to: !SCRIPT_DIR! (clean path without trailing quote)
    "!NSSM_EXE!" set "%SERVICE_ID%" Application "!COMSPEC_CMD!"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppDirectory "!SCRIPT_DIR!"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppParameters "/c runner.bat"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppStdout "!SCRIPT_DIR!\\service-output.log"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppStderr "!SCRIPT_DIR!\\service-error.log"
    "!NSSM_EXE!" set "%SERVICE_ID%" Start SERVICE_AUTO_START
    
    echo [3/4] Verifying runner.bat exists in !SCRIPT_DIR!...
    if not exist "!SCRIPT_DIR!\\runner.bat" (
        echo [WARNING] runner.bat not found in !SCRIPT_DIR!
    ) else (
        echo [OK] runner.bat found!
    )
    
    echo [4/4] Starting service...
    "!NSSM_EXE!" start "%SERVICE_ID%"
    if !errorLevel! neq 0 (
        echo.
        echo [FAILED] Could not start service. Exit code: !errorLevel!
        echo Try Option [1] to test runner.bat directly, or Option [3] for GUI.
    ) else (
        echo.
        echo [SUCCESS] Service "%SERVICE_ID%" started successfully!
    )
    pause
    goto :eof
)

if "%CHOICE%"=="1" (
    echo.
    echo [TEST] Executing script interactively...
    if exist "%~dp0test-runner.bat" (
        call "%~dp0test-runner.bat"
    ) else if exist "%~dp0runner.bat" (
        call "%~dp0runner.bat"
    ) else if exist "%~dp0sync-service.js" (
        node "%~dp0sync-service.js"
    )
    pause
    goto :eof
)

if "%CHOICE%"=="2" (
    echo.
    echo [REPAIR] Applying Windows Server 2003 compatible settings...
    set "SCRIPT_DIR=%~dp0"
    if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"
    set "COMSPEC_CMD=%COMSPEC%"
    if not defined COMSPEC_CMD set "COMSPEC_CMD=%SystemRoot%\\system32\\cmd.exe"
    
    "!NSSM_EXE!" stop "%SERVICE_ID%" >nul 2>&1
    "!NSSM_EXE!" set "%SERVICE_ID%" Application "!COMSPEC_CMD!"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppDirectory "!SCRIPT_DIR!"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppParameters "/c runner.bat"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppStdout "!SCRIPT_DIR!\\service-output.log"
    "!NSSM_EXE!" set "%SERVICE_ID%" AppStderr "!SCRIPT_DIR!\\service-error.log"
    "!NSSM_EXE!" set "%SERVICE_ID%" Start SERVICE_AUTO_START
    
    echo [REPAIR] Starting repaired service...
    "!NSSM_EXE!" start "%SERVICE_ID%"
    echo.
    "!NSSM_EXE!" status "%SERVICE_ID%"
    pause
    goto :eof
)

if "%CHOICE%"=="3" (
    "!NSSM_EXE!" edit "%SERVICE_ID%"
    goto :eof
)

if "%CHOICE%"=="4" (
    "!NSSM_EXE!" start "%SERVICE_ID%"
    pause
    goto :eof
)

if "%CHOICE%"=="5" (
    "!NSSM_EXE!" stop "%SERVICE_ID%"
    pause
    goto :eof
)

exit /b 0
`;

  const fixError3BatContent = `@echo off
setlocal enabledelayedexpansion
TITLE Fix NSSM Service Error Code 3 - Windows Server 2003
color 0A
cd /d "%~dp0"

echo ===============================================================================
echo     GST ZEN WINDOWS SERVICE - ERROR CODE 3 REPAIR UTILITY
echo     Resolves: "service-specific error code 3" in Windows Server 2003 R2
echo ===============================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Administrative privileges are REQUIRED.
    echo Please right-click 'fix-error-3.bat' and select "Run as administrator".
    pause
    exit /b 1
)

:: 2. Find nssm.exe
set "NSSM_EXE=%~dp0nssm.exe"
if not exist "!NSSM_EXE!" (
    for %%X in (nssm.exe) do (
        set "FOUND_NSSM=%%~$PATH:X"
        if defined FOUND_NSSM set "NSSM_EXE=!FOUND_NSSM!"
    )
)

if not exist "!NSSM_EXE!" (
    color 0C
    echo [ERROR] nssm.exe not found in this folder!
    echo Please copy 32-bit nssm.exe (from nssm-2.24\\win32\\) into this folder.
    pause
    exit /b 1
)

set "SERVICE_ID=${sId}"

:: 3. Strip trailing backslash to prevent Windows C runtime quote escaping bug
set "SCRIPT_DIR=%~dp0"
if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

set "COMSPEC_CMD=%COMSPEC%"
if not defined COMSPEC_CMD set "COMSPEC_CMD=%SystemRoot%\\system32\\cmd.exe"

echo [STEP 1] Stopping '%SERVICE_ID%'...
"!NSSM_EXE!" stop "%SERVICE_ID%" >nul 2>&1

echo [STEP 2] Correcting Registry Parameters:
echo   - Application:       !COMSPEC_CMD!
echo   - AppDirectory:      !SCRIPT_DIR!
echo   - AppParameters:     /c runner.bat
echo   - AppStdout:         !SCRIPT_DIR!\\service-output.log
echo   - AppStderr:         !SCRIPT_DIR!\\service-error.log

"!NSSM_EXE!" set "%SERVICE_ID%" Application "!COMSPEC_CMD!"
"!NSSM_EXE!" set "%SERVICE_ID%" AppDirectory "!SCRIPT_DIR!"
"!NSSM_EXE!" set "%SERVICE_ID%" AppParameters "/c runner.bat"
"!NSSM_EXE!" set "%SERVICE_ID%" AppStdout "!SCRIPT_DIR!\\service-output.log"
"!NSSM_EXE!" set "%SERVICE_ID%" AppStderr "!SCRIPT_DIR!\\service-error.log"
"!NSSM_EXE!" set "%SERVICE_ID%" Start SERVICE_AUTO_START

echo.
echo [STEP 3] Starting '%SERVICE_ID%'...
"!NSSM_EXE!" start "%SERVICE_ID%"
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo ===============================================================================
    echo [ERROR] Service still failed to start!
    echo ===============================================================================
    echo 1. Check if runner.bat runs in console by typing: runner.bat
    echo 2. Open NSSM GUI to inspect paths: "!NSSM_EXE!" edit "%SERVICE_ID%"
    echo 3. Check error log: type "!SCRIPT_DIR!\\service-error.log"
    echo ===============================================================================
) else (
    echo.
    echo ===============================================================================
    echo [SUCCESS] Windows Service '%SERVICE_ID%' started and RUNNING!
    echo Refresh services.msc to verify.
    echo ===============================================================================
)
echo.
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
  archive.append(testRunnerBatContent, { name: "test-runner.bat" });
  archive.append(diagnoseBatContent, { name: "diagnose-nssm.bat" });
  archive.append(fixError3BatContent, { name: "fix-error-3.bat" });
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
1. **\`install-service.bat\`**: Auto-installer script to register and start the Windows Service via NSSM and cmd.exe.
2. **\`runner.bat\`**: Continuous daemon loop executing your PHP CLI command (auto-detects php.exe and uses Windows Server 2003 compatible sleep).
3. **\`test-runner.bat\`**: Interactive console test tool. Double-click this to verify that PHP runs and connects to SQL Server before running as a service!
4. **\`uninstall-service.bat\`**: Safe service remover.
5. **\`Sync.php\`** (also mirrored in \`application/controllers/Sync.php\`): The CodeIgniter Controller that executes the GST Zen e-invoice synchronization, credit notes, cancellations, and QR Code / PDF saving.
6. **\`database.php\`** (also mirrored in \`application/config/database.php\`): The database connectivity configuration using built-in Windows ODBC for SQL Server 2000.

## How to Test Before Starting as a Service:
1. Double-click **\`test-runner.bat\`**.
2. It will open a Command Prompt window and execute \`runner.bat\` in real time.
3. You will see:
   - Which \`php.exe\` binary was found.
   - The output of \`Sync.php\` connecting to your SQL Server 2000 database.
   - If there is any missing path or database password error, it is displayed right in front of you.
4. Press Ctrl+C when you are satisfied that it is working.

## What you need to do on your Windows Server:

1. Download **NSSM 2.24** from [https://nssm.cc/release/nssm-2.24.zip](https://nssm.cc/release/nssm-2.24.zip).
2. Extract the downloaded zip file:
   - **For Windows Server 2003 R2 (32-bit / x86)**: Go into the **\`win32\`** folder (DO NOT use win64). Copy \`nssm.exe\`.
   - **For 64-bit Windows Server (2008 R2, 2012, 2016, 2019, 2022)**: Go into the **\`win64\`** folder. Copy \`nssm.exe\`.
3. Paste \`nssm.exe\` **directly into the same folder** where your \`install-service.bat\` and \`runner.bat\` are located.
4. Place \`Sync.php\` into your CodeIgniter \`application/controllers/\` directory (if not already there).
5. Place \`database.php\` into your CodeIgniter \`application/config/\` directory (if not already there).
6. Double-click or right-click \`install-service.bat\` and select **"Run as administrator"**.

## Troubleshooting: "Unable to start the service" (Error 3 / Error 193 / Error 1053)
If Windows Services shows "Could not start the GST Zen PHP Sync Service":
1. **Check Log Files**:
   - Open \`service-error.log\` and \`service-output.log\` in this folder.
   - Any PHP error, missing path, or SQL error will be logged there.
2. **Batch file execution on Windows Server 2003**:
   - The updated \`install-service.bat\` configures NSSM to launch via \`%COMSPEC% /c runner.bat\`, which solves Windows Server 2003 CreateProcess batch file limitations.
3. **Verify PHP Path**:
   - If \`php.exe\` is not at \`C:\\xampp\\php\\php.exe\`, open \`runner.bat\` in Notepad and set \`PHP_EXE=D:\\your\\path\\php.exe\`.
4. **Run \`test-runner.bat\`**:
   - Running \`test-runner.bat\` interactively will instantly show any problem in the console.

## SQL Server 2000 Connection Notes:
- **Built-in Windows ODBC Driver**: In \`database.php\`, use \`DRIVER={SQL Server};Server=localhost;Database=EInvoicenew;\` (the native Windows 2003 MDAC driver). Do NOT use \`SQL Server Native Client 11.0\` because it is for SQL Server 2012+ and fails on SQL 2000.
- **PHP Native Driver**: If your PHP has \`php_mssql.dll\` enabled, set \`'dbdriver' => 'mssql'\` for direct DB-Library connection.
- **Local Server**: In SQL Server Enterprise Manager, if your server is \`(local)\`, you can set Server to \`localhost\` or \`(local)\`.

## Uninstallation

If you ever need to remove or update the service:
- Right-click on **\`uninstall-service.bat\`** and select **"Run as administrator"**.
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

  // Include native Windows NSSM binary (Win64)
  if (fs.existsSync(path.join(process.cwd(), "src/bin/nssm.exe"))) {
    archive.append(fs.createReadStream(path.join(process.cwd(), "src/bin/nssm.exe")), { name: "nssm.exe" });
  }

  // Add install-service.bat using NSSM
  const installBat = `@echo off
TITLE Install GST Zen Windows Service
color 0A
cd /d "%~dp0"
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

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ================================================================
    echo [ERROR] Node.js is NOT installed on this machine!
    echo ================================================================
    echo.
    echo On Windows Server 2008 R2, please install Node.js v13.14.0:
    echo Direct Download Link:
    echo https://nodejs.org/dist/v13.14.0/node-v13.14.0-x64.msi
    echo.
    echo Opening download in your web browser now...
    start https://nodejs.org/dist/v13.14.0/node-v13.14.0-x64.msi
    echo.
    echo After completing the Node.js installation, run 'install-service.bat' again.
    echo ================================================================
    echo.
    pause
    exit /b
)

for /f "delims=" %%i in ('where node') do (
    set "NODE_EXE=%%i"
    goto :found_node
)
:found_node

echo Step 1: Installing npm dependencies...
call npm install

echo Step 2: Registering Windows Service into services.msc...
set "SCRIPT_DIR=%~dp0"
if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

"%SCRIPT_DIR%\\nssm.exe" stop "GstZenSyncService" >nul 2>&1
"%SCRIPT_DIR%\\nssm.exe" remove "GstZenSyncService" confirm >nul 2>&1

"%SCRIPT_DIR%\\nssm.exe" install "GstZenSyncService" "%NODE_EXE%"
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" AppParameters "sync-service.js"
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" AppDirectory "!SCRIPT_DIR!"
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" DisplayName "GST Zen E-Invoice Sync Service"
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" Description "GST Zen E-Invoice pure Node.js background synchronization service"
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" Start SERVICE_AUTO_START
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" AppStdout "!SCRIPT_DIR!\\service-output.log"
"%SCRIPT_DIR%\\nssm.exe" set "GstZenSyncService" AppStderr "!SCRIPT_DIR!\\service-error.log"

echo Step 3: Starting Windows Service...
"%SCRIPT_DIR%\\nssm.exe" start "GstZenSyncService"
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo ========================================================
    echo [ERROR] Windows Service failed to start! (Code %errorLevel%)
    echo ========================================================
    echo Quick Troubleshooting Steps:
    echo 1. Check '!SCRIPT_DIR!\\service-error.log' for Node.js / SQL errors.
    echo 2. Verify you used the correct 32-bit/64-bit nssm.exe for your OS.
    echo 3. Run 'node sync-service.js' directly in cmd to see crash output.
    echo 4. Run 'fix-error-3.bat' to repair path / trailing slash issues.
    echo 5. Run 'diagnose-nssm.bat' for automated diagnostic & auto-repair.
    echo ========================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [SUCCESS] Windows Service "GST Zen E-Invoice Sync Service"
echo is now installed and RUNNING in services.msc!
echo.
echo Press F5 in services.msc to see it listed.
echo Log files: !SCRIPT_DIR!\\service-output.log
echo ========================================================
pause
`;
  archive.append(installBat, { name: "install-service.bat" });

  const nodeFixError3Bat = `@echo off
setlocal enabledelayedexpansion
TITLE Fix NSSM Service Error Code 3 - Windows Server 2003
color 0A
cd /d "%~dp0"

echo ===============================================================================
echo     GST ZEN NODE SERVICE - ERROR CODE 3 REPAIR UTILITY
echo     Resolves: "service-specific error code 3" in Windows Server 2003 R2
echo ===============================================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Administrative privileges REQUIRED!
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

set "NSSM_EXE=!SCRIPT_DIR!\\nssm.exe"
if not exist "!NSSM_EXE!" set "NSSM_EXE=nssm.exe"

set "SERVICE_ID=GstZenSyncService"

echo [STEP 1] Stopping '%SERVICE_ID%'...
"!NSSM_EXE!" stop "%SERVICE_ID%" >nul 2>&1

echo [STEP 2] Repairing AppDirectory (Clean path without trailing slash):
echo   Directory: !SCRIPT_DIR!
"!NSSM_EXE!" set "%SERVICE_ID%" AppDirectory "!SCRIPT_DIR!"
"!NSSM_EXE!" set "%SERVICE_ID%" AppStdout "!SCRIPT_DIR!\\service-output.log"
"!NSSM_EXE!" set "%SERVICE_ID%" AppStderr "!SCRIPT_DIR!\\service-error.log"

echo [STEP 3] Starting '%SERVICE_ID%'...
"!NSSM_EXE!" start "%SERVICE_ID%"
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Service could not start. Exit code: %errorLevel%
    echo Run: "!NSSM_EXE!" edit "%SERVICE_ID%"
) else (
    echo [SUCCESS] Service '%SERVICE_ID%' started and RUNNING!
)
pause
`;
  archive.append(nodeFixError3Bat, { name: "fix-error-3.bat" });

  const nodeDiagnoseBat = `@echo off
setlocal enabledelayedexpansion
TITLE NSSM Node.js Service Diagnostic & Repair Tool
color 0F
cd /d "%~dp0"

echo ===============================================================================
echo     GST ZEN NODE.JS SERVICE DIAGNOSTIC & AUTO-REPAIR UTILITY
echo ===============================================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Administrative privileges are REQUIRED.
    echo Please right-click 'diagnose-nssm.bat' and select "Run as administrator".
    pause
    exit /b 1
)

set "NSSM_EXE=%~dp0nssm.exe"
if not exist "!NSSM_EXE!" set "NSSM_EXE=nssm.exe"

set "SERVICE_ID=GstZenSyncService"

echo [1] Checking NSSM Service Status...
"!NSSM_EXE!" status "%SERVICE_ID%" 2>nul
echo.

echo [2] Current NSSM Parameters:
for /f "tokens=*" %%A in ('"!NSSM_EXE!" get "%SERVICE_ID%" Application 2^>nul') do echo   Application:       %%A
for /f "tokens=*" %%D in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppDirectory 2^>nul') do echo   Startup Directory: %%D
for /f "tokens=*" %%P in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppParameters 2^>nul') do echo   Parameters:        %%P
for /f "tokens=*" %%O in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppStdout 2^>nul') do echo   Stdout Log:        %%O
for /f "tokens=*" %%E in ('"!NSSM_EXE!" get "%SERVICE_ID%" AppStderr 2^>nul') do echo   Stderr Log:        %%E
echo.

if exist "%~dp0service-error.log" (
    echo [3] Recent Errors in service-error.log:
    type "%~dp0service-error.log"
    echo.
)

echo ===============================================================================
echo ACTIONS:
echo [1] Interactive Test (Runs 'node sync-service.js' in console)
echo [2] Open NSSM GUI Editor (nssm edit %SERVICE_ID%)
echo [3] Try Start Service (nssm start %SERVICE_ID%)
echo [4] Exit
echo.
set /p C="Select [1-4]: "
if "%C%"=="1" (
    node "%~dp0sync-service.js"
    pause
)
if "%C%"=="2" (
    "!NSSM_EXE!" edit "%SERVICE_ID%"
)
if "%C%"=="3" (
    "!NSSM_EXE!" start "%SERVICE_ID%"
    pause
)
exit /b 0
`;
  archive.append(nodeDiagnoseBat, { name: "diagnose-nssm.bat" });

  // Add uninstall-service.bat
  const uninstallBat = `@echo off
TITLE Uninstall GST Zen Windows Service
color 0C
cd /d "%~dp0"
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

"%~dp0nssm.exe" stop "GstZenSyncService"
"%~dp0nssm.exe" remove "GstZenSyncService" confirm

echo ========================================================
echo [SUCCESS] Service uninstalled successfully from services.msc.
echo ========================================================
pause
`;
  archive.append(uninstallBat, { name: "uninstall-service.bat" });

  const readmeNode = `# GST Zen Node.js Sync Service (Windows Server 2008 R2 & Newer)

This package contains a pure Node.js background synchronization service for GST Zen E-Invoice, Credit Note, and Debit Note synchronization without requiring XAMPP, Apache, IIS, or PHP.

## Windows Server 2008 R2 / Windows 7 Installation Instructions:

> **IMPORTANT FOR WINDOWS SERVER 2008 R2**:
> Modern Node.js versions (v18, v20, v22) do NOT support Windows Server 2008 R2 and will refuse to install with the error *"Node.js is only supported on Windows 8.1 / Windows Server 2012 R2 or higher"*.
> 
> You MUST install **Node.js v13.14.0 (x64)** or **v12.22.12 LTS (x64)**, which are the official versions that run on Windows Server 2008 R2 SP1 without any operating system hacks.

### Step 1: Install Node.js v13.14.0 (x64)
- Download the official MSI: [https://nodejs.org/dist/v13.14.0/node-v13.14.0-x64.msi](https://nodejs.org/dist/v13.14.0/node-v13.14.0-x64.msi)
- Or Node.js v12.22.12 LTS: [https://nodejs.org/dist/v12.22.12/node-v12.22.12-x64.msi](https://nodejs.org/dist/v12.22.12/node-v12.22.12-x64.msi)
- Run the installer with default settings until completed.

### Step 2: Extract & Configure
1. Extract this zip folder to a permanent location (e.g., \`C:\\gstzen-sync\`).
2. Open \`.env\` file in Notepad and verify your SQL Server connection details and database name (\`DB_NAME=EInvoicetest\`).

### Step 3: Install Windows Service
- Right-click on **\`install-service.bat\`** and select **"Run as administrator"**.
- The script will automatically:
  1. Install all dependencies (\`mssql@6.3.2\`, \`axios\`, \`dotenv\`, \`node-windows\`) configured for Windows Server 2008 R2.
  2. Register the service into Windows Services (\`services.msc\`) under the name **"GST Zen E-Invoice Sync Service"** to run 24/7 automatically even after server reboots.

### Manual Commands:
- Test running in foreground: \`node sync-service.js\`
- Uninstall service: Right-click **\`uninstall-service.bat\`** and run as administrator.
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
    output: `[${timestamp}] [Node.js Sync Daemon] Connected to SQL Server (${process.env.DB_NAME || 'EInvoicetest'}).
[${timestamp}] [1/5 B2B Invoice] Synced #CHK0000000847 -> GST Zen (IRN: 8f9b4c2... AckNo: 1302...)
[${timestamp}] [2/5 Credit Note] Checked pending credit notes (creditnoteflag=1) -> CRN-2026-001 synced (Typ: CRN).
[${timestamp}] [3/5 Debit Note] Checked pending debit notes (debitnoteflag=1) -> DBN-2026-001 synced (Typ: DBN).
[${timestamp}] [4/5 Cancellation] Checked pending cancellations (cancelflag=1) -> Sent cancel payload to GST Zen cancel API.
[${timestamp}] [5/5 QR & PDF Sync] Checked qrstatusflag=0 -> Downloaded PDF & PNG to D:/SignedQrCode/HOTEL01/, set qrstatusflag=1.
[${timestamp}] All 5 sync cycles completed cleanly without error.`
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
