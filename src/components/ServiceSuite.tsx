import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Settings, Activity, HardDrive, Terminal, Bot, Moon, Upload, Play, Search, Server, FileCode, MessageSquare, ShieldCheck, FileJson, Zap, Trash2, Database, Copy, DownloadCloud, Filter, RefreshCw, Square, RotateCcw, Loader2, CheckCircle2, AlertCircle, Clock, Cpu } from 'lucide-react';
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
    { id: 'config', label: 'Config & Generator', icon: Settings },
    { id: 'simulator', label: 'Service Simulator', icon: Activity },
    { id: 'deployment', label: 'Deployment', icon: HardDrive },
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
echo ==========================================
echo   ${serviceName} - Installer
echo ==========================================

set "SERVICE_ID=${serviceId}"
set "SERVICE_NAME=${serviceName}"

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
pause`;

  const generateUninstall = () => `@echo off
echo ==========================================
echo   ${serviceName} - Uninstaller
echo ==========================================

set "SERVICE_ID=${serviceId}"

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
pause`;

  const generateRunner = () => `<?php
/**
 * PHP Background Daemon
 * Runs continuously in background
 */
while (true) {
    echo "[" . date('Y-m-d H:i:s') . "] Syncing Queues...\\n";
    
    // Your sync logic here
    
    sleep(10);
}`;

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
    { id: 'install', name: 'NSSM Installer (.bat)', icon: Zap, content: generateInstall() },
    { id: 'uninstall', name: 'NSSM Uninstaller (.bat)', icon: Trash2, content: generateUninstall() },
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

            {/* Windows Server 2008 R2 Compatibility Alert Banner */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 mb-8 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Running on Windows Server 2008 R2 / Windows 7?
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200/80 text-amber-900">
                      Compatible Setup Guide
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Modern Node.js versions (v18, v20, v22) do <strong>NOT</strong> support Windows Server 2008 R2 and will abort with <em>"Node.js is only supported on Windows 8.1 / Server 2012 R2 or higher"</em>. To run on Windows Server 2008 R2 SP1, you must install the official legacy build <strong>Node.js v13.14.0</strong> or <strong>v12.22.12 LTS</strong>.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href="https://nodejs.org/dist/v13.14.0/node-v13.14.0-x64.msi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      Download Node.js v13.14.0 (x64 MSI)
                    </a>
                    <a
                      href="https://nodejs.org/dist/v12.22.12/node-v12.22.12-x64.msi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-amber-700" />
                      Download Node.js v12.22.12 LTS (x64 MSI)
                    </a>
                    <span className="text-xs text-slate-500 italic">
                      (Tested and verified on Windows Server 2008 R2 SP1)
                    </span>
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
