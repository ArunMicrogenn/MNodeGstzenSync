import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Settings, Activity, HardDrive, Terminal, Bot, Moon, Upload, Play, Search, Server, FileCode, MessageSquare, ShieldCheck, FileJson, Zap, Trash2, Database, Copy, DownloadCloud, Filter, RefreshCw, Square, RotateCcw, Loader2, CheckCircle2, AlertCircle, Clock, Cpu, Wrench, AlertTriangle, BookOpen, ChevronRight, CheckCircle } from 'lucide-react';
import { databasePhpContent, syncPhpContent } from '../data/gstZenFiles';
import { nodeSyncJsCode, nodePackageJson, nodeEnvExample } from '../data/nodeSyncScript';

export function ServiceSuite() {
  const [activeTab, setActiveTab] = useState('node-sync');
  const [activeFileTab, setActiveFileTab] = useState('sync');
  const [nodeFileTab, setNodeFileTab] = useState<'js' | 'package' | 'env'>('js');
  const [isNodeDownloading, setIsNodeDownloading] = useState(false);
  const [isNodeTesting, setIsNodeTesting] = useState(false);
  const [nodeTestOutput, setNodeTestOutput] = useState('Click "Test Node.js Sync" to execute a live simulation of the XAMPP-free Node.js daemon.');
  const [nodeCopied, setNodeCopied] = useState(false);
  const [diagnoseCopied, setDiagnoseCopied] = useState(false);
  const [phpPath, setPhpPath] = useState('C:\\php\\php.exe');
  const [ciPath, setCiPath] = useState('C:\\xampp\\htdocs\\gstzen\\index.php');
  const [scriptArgs, setScriptArgs] = useState('Sync index');
  const [serviceId, setServiceId] = useState('GstZenSyncService');
  const [serviceName, setServiceName] = useState('GST Zen PHP Sync Service');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preset, setPreset] = useState('gstzen');

  // Service Control State
  const [serviceStatus, setServiceStatus] = useState<'running' | 'stopped' | 'restarting' | 'starting' | 'stopping'>('running');
  const [activeAction, setActiveAction] = useState<'start' | 'stop' | 'restart' | 'trigger' | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastApiOutput, setLastApiOutput] = useState<string>('Service ready. Click Start, Stop, Restart or Run Sync to control.');
  const [lastActionTime, setLastActionTime] = useState<string>(new Date().toLocaleTimeString());

  // Fetch initial service status
  useEffect(() => {
    fetch(`/api/service/status?serviceId=${encodeURIComponent(serviceId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'running' || data.status === 'stopped') {
          setServiceStatus(data.status);
        }
      })
      .catch(() => {});
  }, [serviceId]);

  const handleServiceControl = async (action: 'start' | 'stop' | 'restart' | 'trigger') => {
    setActiveAction(action);
    setActionFeedback(null);
    const actionLabel = action.toUpperCase();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Append initiation log
    setLogs(prev => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        timestamp,
        level: 'INFO',
        message: `[API Control] Executing ${actionLabel} command on service "${serviceId}"...`
      }
    ]);

    try {
      const res = await fetch('/api/service/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          serviceId,
          phpPath,
          ciPath,
          scriptArgs
        })
      });

      const data = await res.json();
      const finishTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setLastActionTime(new Date().toLocaleTimeString());

      if (data.success) {
        if (action === 'start' || action === 'restart') {
          setServiceStatus('running');
        } else if (action === 'stop') {
          setServiceStatus('stopped');
        }

        const msg = data.message || `Service ${actionLabel} completed successfully.`;
        setActionFeedback({ type: 'success', message: msg });
        setLastApiOutput(data.output || msg);

        setLogs(prev => [
          ...prev,
          {
            id: prev.length ? prev[prev.length - 1].id + 1 : 1,
            timestamp: finishTime,
            level: 'INFO',
            message: `[API Control] ${msg}`
          }
        ]);

        if (data.output) {
          setLogs(prev => [
            ...prev,
            {
              id: prev.length ? prev[prev.length - 1].id + 1 : 1,
              timestamp: finishTime,
              level: 'INFO',
              message: `[PHP Output] ${data.output.trim()}`
            }
          ]);
        }
      } else {
        const errorMsg = data.error || `Failed to execute ${actionLabel}`;
        setActionFeedback({ type: 'error', message: errorMsg });
        setLastApiOutput(`Error: ${errorMsg}`);
        setLogs(prev => [
          ...prev,
          {
            id: prev.length ? prev[prev.length - 1].id + 1 : 1,
            timestamp: finishTime,
            level: 'ERROR',
            message: `[API Control Error] ${errorMsg}`
          }
        ]);
      }
    } catch (err) {
      const finishTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const networkError = `Network error calling ${actionLabel}: ${String(err)}`;
      setActionFeedback({ type: 'error', message: networkError });
      setLastApiOutput(networkError);
      setLogs(prev => [
        ...prev,
        {
          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
          timestamp: finishTime,
          level: 'ERROR',
          message: `[API Network Error] ${networkError}`
        }
      ]);
    } finally {
      setActiveAction(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPreset(val);
    if (val === 'gstzen') {
      setPhpPath('C:\\xampp\\php\\php.exe');
      setCiPath('C:\\xampp\\htdocs\\gstzen\\index.php');
      setScriptArgs('Sync index');
      setServiceId('GstZenSyncService');
      setServiceName('GST Zen PHP Sync Service');
    } else if (val === 'whatsapp') {
      setPhpPath('C:\\php\\php.exe');
      setCiPath('C:\\whatsapp-sync\\daemon.php');
      setScriptArgs('');
      setServiceId('WhatsAppSyncService');
      setServiceName('WhatsApp PHP Sync Daemon');
    }
  };

  // Log Monitor State
  const [logs, setLogs] = useState([
    { id: 1, timestamp: new Date(Date.now() - 60000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'Starting GST Zen Sync Service Loop...' },
    { id: 2, timestamp: new Date(Date.now() - 58000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'PHP CLI initialized successfully.' },
    { id: 3, timestamp: new Date(Date.now() - 55000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'Connecting to ODBC database...' },
    { id: 4, timestamp: new Date(Date.now() - 54000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'Database connected. Checking for pending invoices.' },
    { id: 5, timestamp: new Date(Date.now() - 40000).toISOString().replace('T', ' ').substring(0, 19), level: 'WARN', message: 'API rate limit nearing threshold.' },
    { id: 6, timestamp: new Date(Date.now() - 35000).toISOString().replace('T', ' ').substring(0, 19), level: 'ERROR', message: 'Failed to sync Invoice #INV-2023-094: Network timeout.' },
    { id: 7, timestamp: new Date(Date.now() - 25000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'Retrying Invoice #INV-2023-094...' },
    { id: 8, timestamp: new Date(Date.now() - 24000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'Invoice #INV-2023-094 synced successfully.' },
    { id: 9, timestamp: new Date(Date.now() - 10000).toISOString().replace('T', ' ').substring(0, 19), level: 'INFO', message: 'Sync cycle completed. Sleeping for 10 seconds.' },
  ]);
  const [logFilter, setLogFilter] = useState('ALL');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'monitor') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      const interval = setInterval(() => {
        setLogs(prev => {
          const newId = prev.length ? prev[prev.length - 1].id + 1 : 1;
          const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
          
          const randomEvent = Math.random();
          let newLog;
          
          if (randomEvent > 0.9) {
            newLog = { id: newId, timestamp, level: 'ERROR', message: 'Connection lost during payload transfer. Retrying...' };
          } else if (randomEvent > 0.7) {
            newLog = { id: newId, timestamp, level: 'WARN', message: 'Response time degraded (>2000ms).' };
          } else {
             newLog = { id: newId, timestamp, level: 'INFO', message: `Processing batch #${Math.floor(Math.random() * 1000)}...` };
          }
          
          return [...prev, newLog];
        });
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/service/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phpPath, ciPath, scriptArgs, serviceId, serviceName })
      });
      
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${serviceId}-package.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNodeDownload = async () => {
    setIsNodeDownloading(true);
    try {
      const res = await fetch('/api/node-sync/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gstzen-node-sync-package.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download Node package", e);
    } finally {
      setIsNodeDownloading(false);
    }
  };

  const handleNodeTestRun = async () => {
    setIsNodeTesting(true);
    try {
      const res = await fetch('/api/node-sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setNodeTestOutput(data.output);
      } else {
        setNodeTestOutput(`Error: ${data.message}`);
      }
    } catch (e) {
      setNodeTestOutput(`Network error: ${String(e)}`);
    } finally {
      setIsNodeTesting(false);
    }
  };

  const getNodeActiveContent = () => {
    if (nodeFileTab === 'js') return nodeSyncJsCode;
    if (nodeFileTab === 'package') return nodePackageJson;
    return nodeEnvExample;
  };

  const handleNodeCopy = () => {
    navigator.clipboard.writeText(getNodeActiveContent());
    setNodeCopied(true);
    setTimeout(() => setNodeCopied(false), 2000);
  };

  const tabs = [
    { id: 'node-sync', label: 'Node.js Sync (XAMPP-Free)', icon: Zap },
    { id: 'nssm-fixer', label: 'Fix NSSM Service Start', icon: Wrench },
    { id: 'deployment', label: 'Deployment & Files', icon: HardDrive },
    { id: 'config', label: 'Config & Generator', icon: Settings },
    { id: 'simulator', label: 'Service Simulator', icon: Activity },
    { id: 'monitor', label: 'Log Monitor', icon: Terminal },
    { id: 'copilot', label: 'AI Copilot', icon: Bot },
  ];

  const generateXml = () => `<service>
  <id>${serviceId}</id>
  <name>${serviceName}</name>
  <description>Background Windows Service for syncing queues using PHP CLI</description>
  <executable>${phpPath}</executable>
  <arguments>"${ciPath}" ${scriptArgs}</arguments>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>10</keepFiles>
  </log>
  <workingdirectory>${ciPath.substring(0, ciPath.lastIndexOf('\\') > 0 ? ciPath.lastIndexOf('\\') : ciPath.length)}</workingdirectory>
  <startmode>Automatic</startmode>
  <depend>MSSQLSERVER</depend>
  <onfailure action="restart" delay="10sec"/>
  <resetfailure>1 hour</resetfailure>
  <env name="APP_ENV" value="production" />
  <env name="PHP_CLI_SERVER_WORKERS" value="4" />
</service>`;

  const generateInstall = () => `@echo off
setlocal enabledelayedexpansion
TITLE Install ${serviceName}
color 0A
cd /d "%~dp0"

echo ========================================================
echo   ${serviceName} - Windows Service Installer
echo   Compatible with Windows Server 2003 R2 / 2008 / 2012+
echo ========================================================

set "SERVICE_ID=${serviceId}"
set "SERVICE_NAME=${serviceName}"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required!
    echo Please right-click 'install-service.bat' and select "Run as administrator".
    pause
    exit /b 1
)

:: Check if nssm.exe wrapper exists
if not exist "nssm.exe" (
    echo [ERROR] nssm.exe Wrapper not found in this folder!
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

echo [INFO] Stopping and cleaning any previous instance of '%SERVICE_ID%'...
set "SCRIPT_DIR=%~dp0"
if "!SCRIPT_DIR:~-1!"=="\" set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

"%SCRIPT_DIR%\\nssm.exe" stop "%SERVICE_ID%" >nul 2>&1
"%SCRIPT_DIR%\\nssm.exe" remove "%SERVICE_ID%" confirm >nul 2>&1

echo [INFO] Installing Windows Service via NSSM...
:: CRITICAL FOR WINDOWS SERVER 2003 R2:
:: 1. Strip trailing backslash from SCRIPT_DIR so quotes do NOT get escaped in CommandLineToArgvW!
:: 2. Specify cmd.exe as Application and /c runner.bat as AppParameters (in AppDirectory)!
set "COMSPEC_CMD=%COMSPEC%"
if not defined COMSPEC_CMD set "COMSPEC_CMD=%SystemRoot%\\system32\\cmd.exe"

"%SCRIPT_DIR%\\nssm.exe" install "%SERVICE_ID%" "%COMSPEC_CMD%"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppParameters "/c runner.bat"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" AppDirectory "!SCRIPT_DIR!"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" DisplayName "%SERVICE_NAME%"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" Description "%SERVICE_NAME% - GST Zen E-Invoice Background Daemon"
"%SCRIPT_DIR%\\nssm.exe" set "%SERVICE_ID%" Start SERVICE_AUTO_START

:: Configure log capture so you can see why anything fails
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
    echo [ERROR] NSSM could not start the Windows Service!
    echo ========================================================
    echo Exit code: %errorLevel%
    echo.
    echo If services.msc shows "service-specific error code 3":
    echo Windows cannot find the path specified (ERROR_PATH_NOT_FOUND).
    echo.
    echo Immediate Diagnostic Checklist:
    echo 1. Run 'fix-error-3.bat' to fix the trailing slash and quote path bug!
    echo 2. Check '!SCRIPT_DIR!\\service-error.log' for PHP / Node / SQL errors.
    echo 3. Verify you used 32-bit nssm.exe (from nssm-2.24\\win32 folder).
    echo 4. Run 'test-runner.bat' to verify it works interactively in cmd.
    echo 5. Run 'diagnose-nssm.bat' for auto-repair or open GUI editor.
    echo ========================================================
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
pause`;

  const generateDiagnoseNssm = () => `@echo off
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

set "SERVICE_ID=${serviceId}"

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

exit /b 0`;

  const generateFixError3 = () => `@echo off
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

set "SERVICE_ID=${serviceId}"

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
pause`;

  const handleDownloadDiagnoseBat = () => {
    const blob = new Blob([generateDiagnoseNssm()], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagnose-nssm.bat';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadFixError3Bat = () => {
    const blob = new Blob([generateFixError3()], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fix-error-3.bat';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const generateUninstall = () => `@echo off
TITLE Uninstall ${serviceName}
color 0C
cd /d "%~dp0"

echo ========================================================
echo   ${serviceName} - Windows Service Uninstaller
echo ========================================================

set "SERVICE_ID=${serviceId}"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required!
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
pause`;

  const generateRunner = () => `@echo off
setlocal enabledelayedexpansion

TITLE GST Zen PHP Sync Background Daemon
cd /d "%~dp0"

echo ========================================================
echo   ${serviceName} - Continuous Daemon
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
set "SCRIPT_ARGS=${scriptArgs}"

echo [CONFIG] PHP Executable: "!PHP_EXE!"
echo [CONFIG] Entry Script:   "!CI_SCRIPT!"
echo [CONFIG] Arguments:      !SCRIPT_ARGS!
echo.

:loop
echo [%date% %time%] Running: "!PHP_EXE!" "!CI_SCRIPT!" !SCRIPT_ARGS!
"!PHP_EXE!" "!CI_SCRIPT!" !SCRIPT_ARGS!

:: 10-second pause compatible with Windows Server 2003 R2 (timeout.exe does not exist on Server 2003)
ping 127.0.0.1 -n 11 >nul

goto loop`;

  const generateTestRunner = () => `@echo off
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
pause`;

  const generatePs1 = () => `# Manage Background Service
$ServiceName = "${serviceId}"

function Restart-ServiceDaemon {
    Write-Host "Restarting $ServiceName..."
    Restart-Service -Name $ServiceName -Force
    Write-Host "Service Restarted." -ForegroundColor Green
}

function Get-ServiceDaemonStatus {
    Get-Service -Name $ServiceName | Select-Object Status, Name, DisplayName
}`;

  const artifacts = [
    { id: 'sync', name: 'Sync.php (Controller)', icon: FileCode, content: syncPhpContent },
    { id: 'database', name: 'database.php (ODBC DB)', icon: Database, content: databasePhpContent },
    { id: 'runner', name: 'runner.bat (Loop Daemon)', icon: Play, content: generateRunner() },
    { id: 'test-runner', name: 'test-runner.bat (Interactive Test)', icon: Terminal, content: generateTestRunner() },
    { id: 'diagnose', name: 'diagnose-nssm.bat (Fix & Repair)', icon: Wrench, content: generateDiagnoseNssm() },
    { id: 'fix-error-3', name: 'fix-error-3.bat (1-Click Fix)', icon: ShieldCheck, content: generateFixError3() },
    { id: 'install', name: 'install-service.bat (NSSM)', icon: Zap, content: generateInstall() },
    { id: 'uninstall', name: 'uninstall-service.bat', icon: Trash2, content: generateUninstall() },
    { id: 'xml', name: 'WinSW XML Config', icon: FileJson, content: generateXml() },
    { id: 'ps1', name: 'PowerShell Manager', icon: Terminal, content: generatePs1() },
  ];

  const activeArtifact = artifacts.find(a => a.id === activeFileTab);

  const handleCopy = () => {
    if (activeArtifact) {
      navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="flex items-center gap-3 py-3">
          <div className="w-10 h-10 bg-[#009b65] rounded-xl flex items-center justify-center text-white shadow-sm">
            <MessageSquare className="w-5 h-5 fill-current text-white/20" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">PHP Windows Service Suite</h1>
            <p className="text-[11px] text-slate-500 font-medium">Transform any PHP web app or daemon into an enterprise Windows Service</p>
          </div>
        </div>

        <nav className="flex items-center h-full self-stretch pt-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 h-full border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-[#009b65] text-[#009b65] bg-emerald-50/30 font-medium' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 py-2">
          {/* Service Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold shadow-xs">
            <span className={`w-2 h-2 rounded-full ${
              serviceStatus === 'running' 
                ? 'bg-emerald-500 animate-pulse' 
                : 'bg-rose-500'
            }`} />
            <span className={serviceStatus === 'running' ? 'text-emerald-700' : 'text-rose-700'}>
              {serviceStatus.toUpperCase()}
            </span>
          </div>

          {/* Service Control Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleServiceControl('start')}
              disabled={activeAction !== null || serviceStatus === 'running'}
              title="Start Windows Service (net start / nssm start)"
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-md transition-all shadow-xs border border-transparent hover:border-emerald-200"
            >
              {activeAction === 'start' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              )}
              <span>Start</span>
            </button>

            <button
              onClick={() => handleServiceControl('stop')}
              disabled={activeAction !== null || serviceStatus === 'stopped'}
              title="Stop Windows Service (net stop / nssm stop)"
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-md transition-all shadow-xs border border-transparent hover:border-rose-200"
            >
              {activeAction === 'stop' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
              )}
              <span>Stop</span>
            </button>

            <button
              onClick={() => handleServiceControl('restart')}
              disabled={activeAction !== null}
              title="Restart Windows Service (nssm restart)"
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-md transition-all shadow-xs border border-transparent hover:border-amber-200"
            >
              {activeAction === 'restart' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Restart</span>
            </button>
          </div>
        </div>
      </header>

      {/* Action Notification Toast Banner */}
      {actionFeedback && (
        <div className={`px-6 py-2 border-b text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1 ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full py-10 px-6">
        {activeTab === 'node-sync' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Hero */}
            <div className="flex justify-between items-start mb-10">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  <Zap className="w-6 h-6 text-[#009b65]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pure Node.js GST Zen Sync Daemon (XAMPP-Free)</h2>
                  <p className="text-slate-500 mt-1 text-sm">
                    Automated 5-in-1 service for B2B Invoices, Credit Notes (CRN), Debit Notes (DBN), Cancellations, and QRCode / PDF downloads.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleNodeTestRun}
                  disabled={isNodeTesting}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center gap-2 hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                  {isNodeTesting ? <Loader2 className="w-4 h-4 animate-spin text-[#009b65]" /> : <Play className="w-4 h-4 text-[#009b65] fill-[#009b65]" />}
                  {isNodeTesting ? 'Running Test...' : 'Test Node.js Sync'}
                </button>
                <button
                  onClick={handleNodeDownload}
                  disabled={isNodeDownloading}
                  className="px-5 py-2 bg-[#009b65] hover:bg-[#008f5d] disabled:opacity-70 text-white rounded-lg flex items-center gap-2 font-medium text-sm shadow-sm transition-colors"
                >
                  <DownloadCloud className="w-4 h-4" />
                  {isNodeDownloading ? 'Packaging...' : 'Download XAMPP-Free Package (.zip)'}
                </button>
              </div>
            </div>

            {/* Windows Server Legacy Compatibility Alert Banner (2003 R2 & SQL Server 2000) */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 mb-8 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Windows Server 2003 R2 &amp; SQL Server 2000 Compatibility Guide
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200/80 text-amber-900">
                      Legacy Stack Configured
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-2 text-xs text-slate-700 leading-relaxed">
                    <p>
                      <strong>Key requirements for Windows Server 2003 R2 &amp; SQL Server 2000:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                      <li>
                        <strong>Why Node.js 5.12.0 fails to install:</strong> Windows Server 2003 R2 blocks Node MSI installers due to missing Windows Installer 4.5 / missing KB942288 updates, or throws <em>&quot;This installation package could not be opened&quot;</em> or <em>&quot;This application has failed to start because the application configuration is incorrect&quot;</em> (missing Visual C++ 2013/2015 runtimes). Modern npm packages like <code>axios</code> and <code>mssql</code> also require Node.js v12+, which cannot run on Server 2003.
                      </li>
                      <li className="text-emerald-800 font-semibold bg-emerald-50/80 p-2 rounded border border-emerald-200">
                        ✅ <strong>You do NOT need Node.js!</strong> Your server already has <strong>PHP CLI &amp; CodeIgniter</strong> working with SQL Server 2000! Running the <strong>PHP Sync Service (in Deployment tab)</strong> needs <strong>zero new runtimes installed</strong>.
                      </li>
                      <li>
                        <strong>If you still need Node.js on 2003 R2:</strong> Do NOT use the <code>.msi</code> installer. Download the portable zip <code>node-v5.12.0-win-x86.zip</code> (or portable <code>node.exe</code>), extract it to <code>C:\node\</code>, and install Microsoft Visual C++ 2010/2013 Redistributable x86 (KB2538243).
                      </li>
                      <li>
                        <strong>SQL Server 2000 ODBC Driver:</strong> Do NOT use <code>SQL Server Native Client 11.0</code> (it was built for SQL 2012+ and fails with <em>&quot;Data source name not found&quot;</em>). In <code>database.php</code>, use <code>DRIVER={'{'}SQL Server{'}'};Server=localhost;Database=EInvoicenew;</code> (the built-in Windows MDAC driver) or native PHP driver <code>&apos;dbdriver&apos; =&gt; &apos;mssql&apos;</code>.
                      </li>
                      <li>
                        <strong>32-bit NSSM Wrapper:</strong> Windows Server 2003 R2 is 32-bit (x86). You <strong>must use 32-bit <code>win32\nssm.exe</code></strong> (v2.24). 64-bit NSSM will fail with <em>&quot;is not a valid Win32 application&quot;</em>.
                      </li>
                      <li className="text-rose-900 font-semibold bg-rose-50/90 p-2.5 rounded-lg border border-rose-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Unable to start the service installed using nssm.exe?</span>
                        </div>
                        <p className="font-normal text-slate-700 mt-1">
                          On Windows Server 2003 R2, NSSM fails to start if: (1) it was registered directly pointing to a <code>.bat</code> file instead of <code>cmd.exe /c runner.bat</code> (Win32 CreateProcess Error 193), (2) 64-bit <code>win64\nssm.exe</code> was copied on 32-bit OS, or (3) PHP/Node crashed immediately on startup (Error 1067 / Exit code 1).
                        </p>
                      </li>
                    </ul>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab('nssm-fixer')}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Fix NSSM &quot;Unable to start service&quot; Error
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('deployment');
                        setActiveFileTab('runner');
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Switch to PHP Sync Service (Zero Install Required)
                    </button>
                    <a
                      href="https://nssm.cc/release/nssm-2.24.zip"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      Download NSSM 2.24 (Use win32\nssm.exe)
                    </a>
                    <a
                      href="https://nodejs.org/dist/v5.12.0/win-x86/node.exe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      title="Direct portable executable without MSI installer"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-slate-600" />
                      Portable node.exe v5.12.0 (No MSI installer needed)
                    </a>
                    <a
                      href="https://nodejs.org/dist/v5.12.0/node-v5.12.0-win-x86.zip"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-slate-600" />
                      Standalone Zip (node-v5.12.0-win-x86.zip)
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009b65] flex items-center justify-center font-bold mb-3">1</div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">Zero XAMPP Dependency</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Eliminates Apache, PHP executable wrappers, and IIS. Runs as a standalone Node.js process using native `mssql` and `axios`.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009b65] flex items-center justify-center font-bold mb-3">2</div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">Identical Logic & QR Automation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Processes B2B invoices, credit notes, cancellations, qrstatusflag=0 downloads, and saves signed PDF/PNG QR codes to disk.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009b65] flex items-center justify-center font-bold mb-3">3</div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">PM2 / Service Ready</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Run 24/7 in the background with auto-restart on system reboot using PM2 (`pm2 start sync-service.js`).
                </p>
              </div>
            </div>

            {/* Code Artifacts Viewer */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-8">
              <div className="flex items-center gap-1 border-b border-slate-200 p-2 overflow-x-auto bg-slate-50/50">
                <button
                  onClick={() => setNodeFileTab('js')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                    nodeFileTab === 'js' ? 'bg-[#0a0f1c] text-white font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  sync-service.js
                </button>
                <button
                  onClick={() => setNodeFileTab('package')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                    nodeFileTab === 'package' ? 'bg-[#0a0f1c] text-white font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileJson className="w-4 h-4 text-cyan-400" />
                  package.json
                </button>
                <button
                  onClick={() => setNodeFileTab('env')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                    nodeFileTab === 'env' ? 'bg-[#0a0f1c] text-white font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  .env (Config)
                </button>

                <div className="flex-1" />

                <div className="flex items-center gap-2 pl-4">
                  <button
                    onClick={handleNodeCopy}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                    {nodeCopied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    onClick={handleNodeDownload}
                    disabled={isNodeDownloading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#009b65] hover:bg-[#008f5d] disabled:opacity-70 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Download Zip
                  </button>
                </div>
              </div>

              <div className="bg-[#0a0f1c] p-6 text-sm font-mono text-slate-300 overflow-x-auto max-h-[50vh]">
                <pre className="leading-relaxed whitespace-pre-wrap">{getNodeActiveContent()}</pre>
              </div>
            </div>

            {/* Test Run Output Console */}
            <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-medium text-slate-300">Node.js Sync Daemon Test Console</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Node.js v22+ Runtime</span>
              </div>
              <div className="p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {nodeTestOutput}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nssm-fixer' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-[#0a0f1c] text-white p-7 rounded-2xl shadow-md border border-rose-900/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
                    <Wrench className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                        Diagnostics &amp; Auto-Repair
                      </span>
                      <span className="text-xs font-mono text-slate-400">Windows Server 2003 R2 / XP</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                      NSSM Windows Service Startup Repair Center
                    </h2>
                    <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
                      Instant solutions for <strong>&quot;service-specific error code 3&quot;</strong>, <strong>Error 193</strong>, and <strong>Error 1067</strong> when using <code className="bg-slate-800 text-rose-300 px-1.5 py-0.5 rounded font-mono text-xs">nssm.exe</code> on Windows Server 2003 R2.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleDownloadFixError3Bat}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Download fix-error-3.bat
                  </button>
                  <button
                    onClick={handleDownloadDiagnoseBat}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors border border-slate-700"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Download diagnose-nssm.bat
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
`nssm stop ${serviceId}
nssm set ${serviceId} AppDirectory "%CD%"
nssm set ${serviceId} Application "%SystemRoot%\\system32\\cmd.exe"
nssm set ${serviceId} AppParameters "/c runner.bat"
nssm start ${serviceId}`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition-colors border border-white/10"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied Quick Fix!' : 'Copy 10-Sec Fix Commands'}
                  </button>
                </div>
              </div>
            </div>

            {/* Why NSSM Fails to Start - The 5 Exact Root Causes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Why NSSM Fails with &quot;Unable to start the service&quot; (5 Root Causes &amp; Fixes)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any card below to see the exact cause, command-line fix, and explanation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cause 1 */}
                <div className="bg-white border-2 border-rose-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
                        #1 Most Common Cause
                      </span>
                      <span className="text-xs font-mono text-slate-400">Win32 CreateProcess Error 193</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                      NSSM is Executing a .bat File Directly
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      On Windows Server 2003 R2, Win32 <code>CreateProcess</code> requires a compiled binary (<code>.exe</code>). It <strong>cannot</strong> execute <code>runner.bat</code> directly, resulting in immediate failure when NSSM starts the service.
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-800 block mb-1">
                      ✅ Immediate Fix (Run in Command Prompt):
                    </span>
                    <div className="bg-[#0a0f1c] text-emerald-400 p-2.5 rounded-lg font-mono text-xs select-all flex items-center justify-between">
                      <code>nssm set {serviceId} Application &quot;%SystemRoot%\system32\cmd.exe&quot;</code>
                    </div>
                    <div className="bg-[#0a0f1c] text-emerald-400 p-2.5 rounded-lg font-mono text-xs select-all flex items-center justify-between mt-1.5">
                      <code>nssm set {serviceId} AppParameters &quot;/c runner.bat&quot;</code>
                    </div>
                  </div>
                </div>

                {/* Cause 2 */}
                <div className="bg-white border-2 border-amber-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                        Architecture Mismatch
                      </span>
                      <span className="text-xs font-mono text-slate-400">%1 is not a valid Win32 app</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                      You Copied 64-bit nssm.exe onto 32-bit Server 2003
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Windows Server 2003 R2 on older POS / billing machines is almost always <strong>32-bit (x86)</strong>. If you extracted <code>win64\nssm.exe</code> from <code>nssm-2.24.zip</code>, the Windows Service Manager cannot execute it.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-800 block mb-1">
                      ✅ Immediate Fix:
                    </span>
                    <p className="text-xs text-slate-600 mb-2">
                      1. Open <code>nssm-2.24.zip</code><br />
                      2. Open the <strong><code>win32</code></strong> folder (do NOT open win64)<br />
                      3. Copy <code>nssm.exe</code> into your service folder to overwrite.
                    </p>
                    <a
                      href="https://nssm.cc/release/nssm-2.24.zip"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-semibold underline"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      Download official nssm-2.24.zip
                    </a>
                  </div>
                </div>

                {/* Cause 3 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                        Child Process Crash
                      </span>
                      <span className="text-xs font-mono text-slate-400">Error 1067 / Exit Code 1</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                      PHP or Node Crashed Instantly on Startup
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      When NSSM starts the service, it spawns the script. If the script crashes immediately (wrong <code>php.exe</code> path, database password error, missing PHP ODBC extension, or Node module error), NSSM shuts down and reports failure.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-800 block mb-1">
                      ✅ How to Reveal the Hidden Crash Error:
                    </span>
                    <p className="text-xs text-slate-600 mb-2">
                      Run the script interactively in Command Prompt so it displays errors live:
                    </p>
                    <div className="bg-[#0a0f1c] text-cyan-400 p-2.5 rounded-lg font-mono text-xs select-all">
                      <code>cmd.exe /c runner.bat</code>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Also open <code className="font-semibold text-slate-700">service-error.log</code> in Notepad!
                    </p>
                  </div>
                </div>

                {/* Cause 4 - Exact match to user screenshot */}
                <div className="bg-white border-2 border-rose-300 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
                        Your Exact Error
                      </span>
                      <span className="text-xs font-mono text-rose-600 font-bold">Service-Specific Error Code 3</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                      Windows Error 3: ERROR_PATH_NOT_FOUND (AppDirectory Trailing Slash Bug)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This is the exact error shown in your screenshot (<em>&quot;...refer to service-specific error code 3&quot;</em>). In Win32, Error 3 means <strong>ERROR_PATH_NOT_FOUND</strong>. The #1 culprit on Windows Server 2003 is configuring <code>AppDirectory &quot;%~dp0&quot;</code> where the trailing backslash escapes the quote into <code>&quot;C:\path\&quot;&quot;</code>, creating an invalid directory name ending in a double quote.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-800 block mb-1">
                      ✅ 10-Second Fix (Run in Command Prompt):
                    </span>
                    <div className="bg-[#0a0f1c] text-emerald-400 p-2.5 rounded-lg font-mono text-xs select-all space-y-1">
                      <div>nssm stop {serviceId}</div>
                      <div>nssm set {serviceId} AppDirectory &quot;%CD%&quot;</div>
                      <div>nssm set {serviceId} Application &quot;%SystemRoot%\system32\cmd.exe&quot;</div>
                      <div>nssm set {serviceId} AppParameters &quot;/c runner.bat&quot;</div>
                      <div>nssm start {serviceId}</div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={handleDownloadFixError3Bat}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs"
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        Download fix-error-3.bat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Script Tool: diagnose-nssm.bat */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Automated Diagnostic &amp; Auto-Repair Tool (diagnose-nssm.bat)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Copy or download this batch file into your service folder and double-click it.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateDiagnoseNssm());
                      setDiagnoseCopied(true);
                      setTimeout(() => setDiagnoseCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {diagnoseCopied ? 'Copied!' : 'Copy Script'}
                  </button>
                  <button
                    onClick={handleDownloadDiagnoseBat}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    Download File
                  </button>
                </div>
              </div>

              {/* Script Explanatory Badges */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Checks 32-bit vs 64-bit NSSM binary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dumps live NSSM Registry configuration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Prints recent errors from service-error.log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Offers Option [2] 1-Key Auto-Repair</span>
                </div>
              </div>

              <div className="bg-[#0a0f1c] p-5 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap leading-relaxed select-all">
                  {generateDiagnoseNssm()}
                </pre>
              </div>
            </div>

            {/* 1-Minute Manual Clean Reset / Reinstall Guide */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                Guaranteed 1-Minute Clean Reset &amp; Re-Registration (Server 2003 Compatible)
              </h4>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                If the service is corrupted or in an invalid state, open Command Prompt as Administrator and run these commands in order:
              </p>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-800">
                      Step 1: Cleanly Stop and Remove Any Broken Registration
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
`nssm stop ${serviceId}
nssm remove ${serviceId} confirm`
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="bg-[#0a0f1c] text-rose-300 p-2.5 rounded font-mono text-xs select-all">
{`nssm stop ${serviceId}
nssm remove ${serviceId} confirm`}
                  </pre>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-800">
                      Step 2: Register with Correct Win32 cmd.exe &amp; Absolute Working Directory
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
`nssm install ${serviceId} "%SystemRoot%\\system32\\cmd.exe" "/c runner.bat"
nssm set ${serviceId} AppDirectory "%CD%"
nssm set ${serviceId} DisplayName "${serviceName}"
nssm set ${serviceId} Start SERVICE_AUTO_START
nssm set ${serviceId} AppStdout "%CD%\\service-output.log"
nssm set ${serviceId} AppStderr "%CD%\\service-error.log"
nssm start ${serviceId}`
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy All
                    </button>
                  </div>
                  <pre className="bg-[#0a0f1c] text-emerald-300 p-2.5 rounded font-mono text-xs select-all leading-relaxed">
{`nssm install ${serviceId} "%SystemRoot%\\system32\\cmd.exe" "/c runner.bat"
nssm set ${serviceId} AppDirectory "%CD%"
nssm set ${serviceId} DisplayName "${serviceName}"
nssm set ${serviceId} Start SERVICE_AUTO_START
nssm set ${serviceId} AppStdout "%CD%\\service-output.log"
nssm set ${serviceId} AppStderr "%CD%\\service-error.log"
nssm start ${serviceId}`}
                  </pre>
                </div>

                {/* Step 3: Graphical Inspection */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-800">
                      Step 3: Open the NSSM Graphical Dialog to Inspect Fields Visually
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`nssm edit ${serviceId}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="bg-[#0a0f1c] text-cyan-300 p-2.5 rounded font-mono text-xs select-all">
{`nssm edit ${serviceId}`}
                  </pre>
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <p>• <strong>Path:</strong> <code>C:\WINDOWS\system32\cmd.exe</code></p>
                    <p>• <strong>Startup directory:</strong> <code>C:\your-service-folder</code> (where runner.bat and php are)</p>
                    <p>• <strong>Arguments:</strong> <code>/c runner.bat</code></p>
                    <p>• <strong>I/O Tab:</strong> Set stdout to <code>service-output.log</code> and stderr to <code>service-error.log</code></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Hero */}
            <div className="flex justify-between items-start mb-10">
              <div className="flex gap-3">
                <Settings className="w-6 h-6 text-[#009b65] mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Windows Service & PHP Daemon Configurator</h2>
                  <p className="text-slate-500 mt-1 text-sm">Configure parameters to wrap your PHP sync script into a robust Windows Service.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center gap-2 hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors">
                  <Upload className="w-4 h-4" /> Bulk Generate
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="px-5 py-2 bg-[#009b65] hover:bg-[#008f5d] disabled:opacity-70 text-white rounded-lg flex items-center gap-2 font-medium text-sm shadow-sm transition-colors"
                >
                  <Play className="w-4 h-4 fill-white text-white" /> 
                  {isDownloading ? 'Packaging...' : 'Generate Package'}
                </button>
              </div>
            </div>

            {/* Preset Card */}
            <div className="border border-slate-200 rounded-xl p-5 flex items-center justify-between mb-10 shadow-sm bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Environment Preset</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Instantly apply recommended settings</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                  <Search className="w-4 h-4 text-slate-400" /> Probe System
                </button>
                <select 
                  value={preset}
                  onChange={handlePresetChange}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] shadow-sm appearance-none"
                >
                  <option value="custom">Custom Configuration</option>
                  <option value="gstzen">GST Zen Sync (CodeIgniter)</option>
                  <option value="whatsapp">WhatsApp Sync (Daemon)</option>
                </select>
              </div>
            </div>

            {/* Form Grids */}
            <div className="grid grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Server className="w-4 h-4 text-slate-400" /> SERVICE IDENTIFICATION
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service ID (no spaces)</label>
                  <input 
                    type="text" 
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] outline-none transition-shadow" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] outline-none transition-shadow" 
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
                  <FileCode className="w-4 h-4 text-slate-400" /> PATHS & RUNTIMES
                </h4>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">PHP Executable Path</label>
                    <button className="text-xs flex items-center gap-1 border border-slate-200 bg-white px-2 py-0.5 rounded shadow-sm text-slate-600 hover:text-slate-800 transition-colors">
                      Scan System
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={phpPath}
                      onChange={e => setPhpPath(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] outline-none transition-shadow" 
                    />
                    <div className="absolute left-3 top-2.5 bg-slate-100 rounded p-0.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">PHP Script Path</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={ciPath}
                      onChange={e => { setCiPath(e.target.value); setPreset('custom'); }}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] outline-none transition-shadow" 
                    />
                    <div className="absolute left-3 top-2.5 bg-slate-100 rounded p-0.5">
                      <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Script Arguments (e.g. CI Controller)</label>
                  <input 
                    type="text" 
                    value={scriptArgs}
                    onChange={e => { setScriptArgs(e.target.value); setPreset('custom'); }}
                    placeholder="e.g. Sync index"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] outline-none transition-shadow" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployment' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Generated Deployment Artifacts</h2>
              <div className="bg-emerald-50 border border-emerald-100 text-[#009b65] px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-sm">
                <ShieldCheck className="w-4 h-4" /> WinSW & NSSM Ready
              </div>
            </div>

            {/* Artifacts Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              
              {/* File Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200 p-2 overflow-x-auto bg-slate-50/50">
                {artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    onClick={() => setActiveFileTab(artifact.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                      activeFileTab === artifact.id 
                        ? 'bg-[#0a0f1c] text-white font-medium shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <artifact.icon className={`w-4 h-4 ${
                      activeFileTab === artifact.id 
                        ? 'text-slate-300' 
                        : artifact.id === 'sync' ? 'text-emerald-500' : artifact.id === 'database' ? 'text-cyan-500' : artifact.id === 'install' ? 'text-orange-500' : artifact.id === 'uninstall' ? 'text-slate-400' : artifact.id === 'ps1' ? 'text-blue-500' : 'text-slate-400'
                    }`} />
                    {artifact.name}
                  </button>
                ))}
                
                <div className="flex-1" />
                
                <div className="flex items-center gap-2 pl-4">
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#009b65] hover:bg-[#008f5d] disabled:opacity-70 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm"
                  >
                    <DownloadCloud className="w-4 h-4 text-white" />
                    {isDownloading ? 'Packaging...' : 'Download Package'}
                  </button>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="bg-[#0a0f1c] p-6 text-sm font-mono text-slate-300 overflow-x-auto overflow-y-auto max-h-[60vh]">
                <pre className="leading-relaxed whitespace-pre-wrap">
                  {activeArtifact?.content}
                </pre>
              </div>
            </div>

            {/* SQL Server 2000 & Windows Server 2003 R2 Technical Cheat Sheet */}
            <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">SQL Server 2000 &amp; Windows Server 2003 R2 Connectivity Rules</h3>
                  <p className="text-xs text-slate-500">Crucial technical details to prevent database connection failures and service crash loops.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="font-semibold text-slate-800 block mb-1">1. Built-in ODBC Driver</span>
                  <p className="text-slate-600 mb-2">Windows Server 2003 includes the built-in Microsoft Data Access driver:</p>
                  <code className="block bg-slate-900 text-cyan-300 p-2 rounded font-mono text-[11px] select-all">
                    DRIVER=&#123;SQL Server&#125;;Server=localhost;Database=EInvoicenew;
                  </code>
                  <p className="text-rose-600 mt-2 font-medium">❌ Never use &quot;SQL Server Native Client 11.0&quot; with SQL Server 2000.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="font-semibold text-slate-800 block mb-1">2. Native PHP mssql Driver</span>
                  <p className="text-slate-600 mb-2">PHP 5.2–5.4 on Windows Server 2003 includes native <code className="bg-slate-200 px-1 rounded">php_mssql.dll</code> (DB-Library):</p>
                  <code className="block bg-slate-900 text-emerald-300 p-2 rounded font-mono text-[11px] select-all">
                    $db[&apos;default&apos;][&apos;dbdriver&apos;] = &apos;mssql&apos;;
                  </code>
                  <p className="text-slate-500 mt-2">Connects directly without ODBC layer overhead.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="font-semibold text-slate-800 block mb-1">3. TDS 7.1 Protocol for Node.js</span>
                  <p className="text-slate-600 mb-2">SQL Server 2000 supports <strong>TDS 7.1</strong> only. Add this to your <code className="bg-slate-200 px-1 rounded">.env</code>:</p>
                  <code className="block bg-slate-900 text-amber-300 p-2 rounded font-mono text-[11px] select-all">
                    DB_TDS_VERSION=7_1<br />
                    DB_ENCRYPT=false
                  </code>
                  <p className="text-slate-500 mt-2">Prevents socket reset (104) during PreLogin handshake.</p>
                </div>
              </div>
            </div>

            {/* "Unable to Start the Service" Troubleshooting Guide */}
            <div className="mt-6 bg-rose-50/70 border border-rose-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Troubleshooting: &quot;Could not start the GST Zen PHP Sync Service on Local Computer&quot;
                  </h3>
                  <p className="text-xs text-rose-800">
                    If Windows Services (<code className="font-mono bg-rose-100 px-1 rounded">services.msc</code>) throws <strong>Error 3: The system cannot find the path specified</strong>, <strong>Error 193</strong>, or <strong>Error 1053</strong>:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white border border-rose-200/80 rounded-lg p-4">
                  <span className="font-bold text-slate-800 block mb-1">Fix 1: Run via cmd.exe /c (Updated)</span>
                  <p className="text-slate-600 mb-2 leading-relaxed">
                    On Windows Server 2003 R2, NSSM cannot execute a <code>.bat</code> directly through Win32 <code>CreateProcess</code>. The updated <code className="bg-slate-100 px-1 rounded">install-service.bat</code> now registers:
                  </p>
                  <code className="block bg-[#0a0f1c] text-emerald-300 p-2 rounded font-mono text-[11px] leading-tight select-all">
                    cmd.exe /c runner.bat
                  </code>
                  <p className="text-slate-500 mt-2">Re-run <code>install-service.bat</code> as Administrator to apply.</p>
                </div>

                <div className="bg-white border border-rose-200/80 rounded-lg p-4">
                  <span className="font-bold text-slate-800 block mb-1">Fix 2: Test Interactively with test-runner.bat</span>
                  <p className="text-slate-600 mb-2 leading-relaxed">
                    Before starting in Windows Services, double-click <code className="bg-slate-100 px-1 rounded">test-runner.bat</code> in your service folder:
                  </p>
                  <ul className="list-disc pl-4 text-slate-600 space-y-1">
                    <li>It displays exactly which <code>php.exe</code> was detected.</li>
                    <li>It shows the output of <code>Sync.php</code> and SQL Server 2000 in real time.</li>
                    <li>Any missing path or DB password error will be printed immediately.</li>
                  </ul>
                </div>

                <div className="bg-white border border-rose-200/80 rounded-lg p-4">
                  <span className="font-bold text-slate-800 block mb-1">Fix 3: Server 2003 Sleep &amp; Log Files</span>
                  <p className="text-slate-600 mb-2 leading-relaxed">
                    <code>timeout.exe</code> does not exist on Server 2003 R2; <code>runner.bat</code> now uses:
                  </p>
                  <code className="block bg-[#0a0f1c] text-cyan-300 p-2 rounded font-mono text-[11px] select-all">
                    ping 127.0.0.1 -n 11 &gt; nul
                  </code>
                  <p className="text-slate-600 mt-2">
                    Check <code className="font-semibold text-slate-800">service-error.log</code> and <code className="font-semibold text-slate-800">service-output.log</code> for full details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-[calc(100vh-140px)]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Live Service Logs</h2>
              <div className="flex items-center gap-3">
                {/* Quick Service Controls in Monitor Header */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleServiceControl('start')}
                    disabled={activeAction !== null || serviceStatus === 'running'}
                    title="Start Windows Service"
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 disabled:opacity-40 text-xs font-semibold rounded-md transition-all shadow-xs border border-transparent hover:border-emerald-200"
                  >
                    {activeAction === 'start' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Play className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />}
                    Start
                  </button>
                  <button
                    onClick={() => handleServiceControl('stop')}
                    disabled={activeAction !== null || serviceStatus === 'stopped'}
                    title="Stop Windows Service"
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 disabled:opacity-40 text-xs font-semibold rounded-md transition-all shadow-xs border border-transparent hover:border-rose-200"
                  >
                    {activeAction === 'stop' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" /> : <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />}
                    Stop
                  </button>
                  <button
                    onClick={() => handleServiceControl('restart')}
                    disabled={activeAction !== null}
                    title="Restart Windows Service"
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 disabled:opacity-40 text-xs font-semibold rounded-md transition-all shadow-xs border border-transparent hover:border-amber-200"
                  >
                    {activeAction === 'restart' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> : <RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
                    Restart
                  </button>
                </div>

                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select 
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-[#009b65] focus:border-[#009b65] outline-none shadow-sm font-medium text-slate-700"
                  >
                    <option value="ALL">All Levels</option>
                    <option value="INFO">Info Only</option>
                    <option value="WARN">Warnings Only</option>
                    <option value="ERROR">Errors Only</option>
                  </select>
                </div>
                <button 
                  onClick={() => setLogs([])}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4 text-slate-400" /> Clear
                </button>
              </div>
            </div>

            <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">Monitoring: gst-zen-service.log</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Auto-scrolling
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed">
                {logs.length === 0 ? (
                  <div className="text-slate-500 h-full flex items-center justify-center italic">Log is empty.</div>
                ) : (
                  logs.filter(l => logFilter === 'ALL' || l.level === logFilter).map(log => (
                    <div key={log.id} className="mb-1 flex gap-3 hover:bg-white/5 px-2 py-1 rounded group">
                      <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                      <span className={`shrink-0 w-[60px] font-semibold ${log.level === 'INFO' ? 'text-sky-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-rose-400'}`}>
                        [{log.level}]
                      </span>
                      <span className={`${log.level === 'ERROR' ? 'text-rose-300' : log.level === 'WARN' ? 'text-amber-200' : 'text-slate-300'} break-all`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Service Simulator & Live API Operations</h2>
                <p className="text-slate-500 mt-1 text-sm">Directly control, start, stop, restart, or execute the PHP CodeIgniter sync daemon via backend API requests.</p>
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${serviceStatus === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-sm font-semibold text-slate-800 uppercase tracking-wider">{serviceStatus}</span>
                <span className="text-xs text-slate-400 ml-1">({lastActionTime})</span>
              </div>
            </div>

            {/* Service Status Overview Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Target Service</span>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    {serviceId}
                  </div>
                  <span className="text-xs text-slate-500">{serviceName}</span>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">PHP CLI Executable</span>
                  <div className="text-xs font-mono font-medium text-slate-700 bg-slate-50 border border-slate-100 p-1.5 rounded truncate" title={phpPath}>
                    {phpPath}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Controller / Script</span>
                  <div className="text-xs font-mono font-medium text-slate-700 bg-slate-50 border border-slate-100 p-1.5 rounded truncate" title={`${ciPath} ${scriptArgs}`}>
                    {scriptArgs ? scriptArgs : ciPath}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Service State</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      serviceStatus === 'running' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {serviceStatus === 'running' ? '● RUNNING' : '■ STOPPED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Start Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <Play className="w-5 h-5 fill-emerald-600" />
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      POST /api/service/action
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">Start Service</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Sends command to start the Windows Service daemon using <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">net start</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">nssm start</code>.
                  </p>
                </div>
                <button
                  onClick={() => handleServiceControl('start')}
                  disabled={activeAction !== null || serviceStatus === 'running'}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {activeAction === 'start' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>{serviceStatus === 'running' ? 'Service Already Running' : 'Start Service'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stop Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                      <Square className="w-5 h-5 fill-rose-600" />
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      POST /api/service/action
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">Stop Service</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Signals the service daemon to safely shutdown using <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">net stop</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">nssm stop</code>.
                  </p>
                </div>
                <button
                  onClick={() => handleServiceControl('stop')}
                  disabled={activeAction !== null || serviceStatus === 'stopped'}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {activeAction === 'stop' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Stopping...</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 fill-white" />
                      <span>{serviceStatus === 'stopped' ? 'Service Stopped' : 'Stop Service'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Restart Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                      <RotateCcw className="w-5 h-5 text-amber-600" />
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      POST /api/service/action
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">Restart Service</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Restarts the daemon process cleanly via <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">nssm restart</code> to reload database connections and scripts.
                  </p>
                </div>
                <button
                  onClick={() => handleServiceControl('restart')}
                  disabled={activeAction !== null}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {activeAction === 'restart' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Restarting...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Restart Service</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Trigger Card for Sync.php */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 mb-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                    <Zap className="w-4 h-4 fill-sky-400" />
                    Direct CLI Invocation Test
                  </div>
                  <h3 className="text-lg font-bold text-white">Execute Single Sync Cycle (`Sync.php`)</h3>
                  <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
                    Triggers CodeIgniter&apos;s <code className="text-sky-300 bg-white/10 px-1 py-0.5 rounded">Sync::index()</code> controller directly through the PHP CLI without modifying the background service state.
                  </p>
                </div>
                <button
                  onClick={() => handleServiceControl('trigger')}
                  disabled={activeAction !== null}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors shrink-0 shadow-sm"
                >
                  {activeAction === 'trigger' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing CLI...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Run Sync Once</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Execution Console / API Response Viewer */}
            <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-medium text-slate-300">API Response Console (Last Output)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Updated: {lastActionTime}</span>
              </div>
              <div className="p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {lastApiOutput}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'config' && activeTab !== 'deployment' && activeTab !== 'monitor' && activeTab !== 'simulator' && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
            <Activity className="w-12 h-12 mb-4 opacity-20" />
            <p>This module is currently running in background mode.</p>
            <p className="text-sm mt-2">Switch back to Config & Generator to manage settings.</p>
          </div>
        )}
      </main>
    </div>
  );
}
