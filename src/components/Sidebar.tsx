import { Activity, Server, Settings, ShieldAlert, FileText, Home } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: Server, label: 'Service Status', active: false },
    { icon: FileText, label: 'GST Returns', active: false },
    { icon: Activity, label: 'System Logs', active: false },
    { icon: ShieldAlert, label: 'Alerts', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 text-white">
          <Server className="w-6 h-6 text-indigo-400" />
          <h1 className="font-semibold text-lg tracking-tight">GST Zen Monitor</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">PHP Windows Service</p>
      </div>

      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-3">
          {navItems.map((item, idx) => (
            <li key={idx}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  item.active 
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                    : 'hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-300">
            AD
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Admin User</p>
            <p className="text-xs text-slate-500">Local System</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
