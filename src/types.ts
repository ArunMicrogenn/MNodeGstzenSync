export type ServiceState = 'running' | 'stopped' | 'restarting';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface SyncActivity {
  id: string;
  gstin: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  type: string;
}
