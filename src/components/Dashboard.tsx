import { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Activity, CheckCircle2, XCircle, AlertCircle, Clock, Server, HardDrive, Download, DownloadCloud, Settings } from 'lucide-react';
import { ServiceState, LogEntry, SyncActivity } from '../types';
import { motion } from 'motion/react';
import { SettingsModal } from './SettingsModal';

const MOCK_ACTIVITY: SyncActivity[] = [
  { id: '1', gstin: '27AADCB2230M1Z2', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'B2B E-Invoice Gen' },
  { id: '2', gstin: '07BBPCA1433L1Z9', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 25), type: 'Credit Note Sync' },
  { id: '3', gstin: '29ABCDE1234F2Z5', status: 'failed', timestamp: new Date(Date.now() - 1000 * 60 * 45), type: 'Invoice Cancellation' },
  { id: '4', gstin: '33XYZPA9876Q1Z4', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 120), type: 'B2B E-Invoice Gen' },
];

export function Dashboard() {
  const [serviceState, setServiceState] = useState<ServiceState>('running');
  const [uptime, setUptime] = useState(14532); // seconds
  const [isWindows, setIsWindows] = useState(false);
  const [phpPath, setPhpPath] = useState(() => localStorage.getItem('gstZenPhpPath') || 'C:\\xampp\\php\\php.exe');
  const [ciPath, setCiPath] = useState(() => localStorage.getItem('gstZenCiPath') || 'C:\\xampp\\htdocs\\your-project\\index.php');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date(), level: 'info', message: 'Initializing service monitor...' }
  ]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/service/status');
      const data = await res.json();
      
      if (data.status === 'mock_running' || data.status === 'running') {
        setServiceState('running');
      } else if (data.status === 'stopped' || data.status === 'not_installed') {
        setServiceState('stopped');
      }
      
      setIsWindows(data.status !== 'mock_running');
    } catch (e) {
      console.error("Failed to fetch service status");
    }
  };

  const handleDownloadDeployment = async () => {
    setIsDownloading(true);
    addLog('info', '[SYSTEM] Preparing deployment package for download...');
    try {
      const res = await fetch('/api/service/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phpPath, ciPath })
      });
      
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gst-zen-service-package.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addLog('info', '[SYSTEM] Deployment package downloaded successfully.');
    } catch (e) {
      addLog('error', '[SYSTEM] Failed to download deployment package.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();
    
    // Poll status every 5 seconds
    const statusInterval = setInterval(fetchStatus, 5000);
    
    // Uptime and mock log simulation loop
    const simInterval = setInterval(() => {
      setUptime(prev => prev + 1);
      
      if (Math.random() > 0.8 && serviceState === 'running') {
        const types = ['B2B E-Invoice', 'Credit Note', 'Cancellation'];
        const type = types[Math.floor(Math.random() * types.length)];
        const newLog: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          level: Math.random() > 0.9 ? 'error' : (Math.random() > 0.7 ? 'warn' : 'info'),
          message: `[SYNC] Processing ${type} request for hotel code ${Math.floor(Math.random() * 1000)}...`
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
      }
    }, 1000);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(simInterval);
    };
  }, [serviceState]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setServiceState('restarting'); // Show loading state visually
    
    try {
      const res = await fetch('/api/service/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      
      if (data.success) {
        addLog('info', `[SYSTEM] Successfully issued ${action} command to Windows Service.`);
        setTimeout(fetchStatus, 1500); // Poll immediately after to catch state change
      } else {
        addLog('error', `[SYSTEM] Failed to ${action} service: ${data.error}`);
        fetchStatus();
      }
    } catch (e) {
      addLog('error', `[SYSTEM] API Error during ${action} command.`);
      fetchStatus();
    }
  };

  const addLog = (level: 'info'|'warn'|'error', message: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen overflow-auto">
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Service Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Manage and monitor your local GST Zen PHP integration service.</p>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${serviceState === 'running' ? 'bg-emerald-100 text-emerald-600' : serviceState === 'stopped' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Service Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-semibold text-slate-900 capitalize">{serviceState}</span>
                {serviceState === 'running' && <span className="relative flex h-2.5 w-2.5 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Service Uptime</p>
              <p className="text-lg font-semibold text-slate-900 mt-1 font-mono tracking-tight">
                {serviceState === 'running' ? formatUptime(uptime) : '0h 0m 0s'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Syncs Today</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">1,248 <span className="text-sm font-normal text-slate-400 ml-1">requests</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls & Logs */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Deployment Config Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-slate-500" />
                  Service Deployment Package
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 mb-2">Download the automated service installer configured for your environment.</p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                   <p className="text-xs font-mono text-slate-600"><strong className="font-sans mr-2 text-slate-700">PHP Path:</strong> {phpPath}</p>
                   <p className="text-xs font-mono text-slate-600 mt-2"><strong className="font-sans mr-2 text-slate-700">App Path:</strong> {ciPath}</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleDownloadDeployment}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-indigo-500/20 outline-none"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Packaging...' : 'Download Installer ZIP'}
                  </button>
                </div>
              </div>
            </div>

            {/* Service Controls */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  Service Controls
                </h3>
              </div>
              <div className="p-6 flex flex-wrap gap-4">
                <button
                  onClick={() => handleAction('start')}
                  disabled={serviceState === 'running'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-400 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-emerald-500/20 outline-none"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Service
                </button>
                <button
                  onClick={() => handleAction('stop')}
                  disabled={serviceState === 'stopped' || serviceState === 'restarting'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-100 disabled:text-rose-400 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-rose-500/20 outline-none"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Service
                </button>
                <button
                  onClick={() => handleAction('restart')}
                  disabled={serviceState === 'stopped' || serviceState === 'restarting'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-slate-500/20 outline-none"
                >
                  <RotateCcw className={`w-4 h-4 ${serviceState === 'restarting' ? 'animate-spin' : ''}`} />
                  Restart
                </button>
              </div>
            </div>

            <div className="bg-[#1e1e1e] rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="px-6 py-3 border-b border-slate-800 bg-[#252526] flex justify-between items-center">
                <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                  Console Output
                </h3>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
              </div>
              <div className="p-4 overflow-y-auto font-mono text-xs flex-1 space-y-1.5">
                {logs.map((log) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={log.id} 
                    className="flex gap-3"
                  >
                    <span className="text-slate-500 shrink-0">
                      [{log.timestamp.toLocaleTimeString('en-US', { hour12: false })}]
                    </span>
                    <span className={`shrink-0 ${
                      log.level === 'info' ? 'text-blue-400' : 
                      log.level === 'warn' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {log.level.toUpperCase().padEnd(5)}
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </motion.div>
                ))}
                {logs.length === 0 && <div className="text-slate-500 italic">Waiting for logs...</div>}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(400px+8.5rem)]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Recent API Activity</h3>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              <ul className="divide-y divide-slate-100">
                {MOCK_ACTIVITY.map(activity => (
                  <li key={activity.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {activity.status === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        ) : activity.status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{activity.type}</p>
                          <p className="text-xs font-mono text-slate-500 mt-0.5">{activity.gstin}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button className="w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                View All Activity &rarr;
              </button>
            </div>
          </div>

        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentPhpPath={phpPath}
        currentCiPath={ciPath}
        onSave={(newPhp, newCi) => {
          setPhpPath(newPhp);
          setCiPath(newCi);
          localStorage.setItem('gstZenPhpPath', newPhp);
          localStorage.setItem('gstZenCiPath', newCi);
          setIsSettingsOpen(false);
          addLog('info', '[SYSTEM] Daemon configuration paths updated successfully.');
        }}
      />
    </div>
  );
}
