import { X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhpPath: string;
  currentCiPath: string;
  onSave: (phpPath: string, ciPath: string) => void;
}

export function SettingsModal({ isOpen, onClose, currentPhpPath, currentCiPath, onSave }: SettingsModalProps) {
  const [phpPath, setPhpPath] = useState(currentPhpPath);
  const [ciPath, setCiPath] = useState(currentCiPath);

  useEffect(() => {
    if (isOpen) {
      setPhpPath(currentPhpPath);
      setCiPath(currentCiPath);
    }
  }, [isOpen, currentPhpPath, currentCiPath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800">Daemon Configuration</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">PHP Executable Path</label>
            <input 
              type="text" 
              value={phpPath}
              onChange={(e) => setPhpPath(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1.5">Absolute path to php.exe on the target Windows machine.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CodeIgniter Index Path</label>
            <input 
              type="text" 
              value={ciPath}
              onChange={(e) => setCiPath(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1.5">Absolute path to your index.php file.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => onSave(phpPath, ciPath)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
