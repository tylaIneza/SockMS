'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ClipboardList, RefreshCw } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  'expense.create':         'text-emerald-400',
  'expense.update':         'text-blue-400',
  'expense.update_pending': 'text-amber-400',
  'expense.approve':        'text-emerald-400',
  'expense.reject':         'text-red-400',
  'expense.delete':         'text-red-500',
  'sale.create':            'text-indigo-400',
  'stock.add':              'text-cyan-400',
  'user.create':            'text-emerald-400',
  'user.update':            'text-blue-400',
  'user.deactivate':        'text-amber-400',
  'user.delete':            'text-red-500',
};

const ACTION_LABELS: Record<string, string> = {
  'expense.create':         'Created expense',
  'expense.update':         'Updated expense',
  'expense.update_pending': 'Submitted expense update',
  'expense.approve':        'Approved expense',
  'expense.reject':         'Rejected expense update',
  'expense.delete':         'Deleted expense',
  'sale.create':            'Recorded sale',
  'stock.add':              'Added stock',
  'user.create':            'Created user',
  'user.update':            'Updated user',
  'user.deactivate':        'Deactivated user',
  'user.delete':            'Deleted user',
};

function Details({ details }: { details: any }) {
  if (!details) return null;
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {entries.map(([k, v]) => (
        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
          {k}: <span className="text-white">{String(v)}</span>
        </span>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const load = () => {
    setLoading(true);
    api.get('/audit?limit=500').then(r => setLogs(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = filter
    ? logs.filter(l =>
        l.action.includes(filter) ||
        l.user_name.toLowerCase().includes(filter.toLowerCase()) ||
        l.entity_type.includes(filter))
    : logs;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)' }}>
            <ClipboardList className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-slate-400 text-sm">{filtered.length} entries</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="input text-sm w-56"
            placeholder="Filter by user, action…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="thead-dark">
            <tr>
              <th className="th">Time</th>
              <th className="th">User</th>
              <th className="th">Action</th>
              <th className="th">Type</th>
              <th className="th">Details</th>
            </tr>
          </thead>
          <tbody className="divide-dark">
            {filtered.map((log: any) => (
              <tr key={log.id} className="hover:bg-white/5">
                <td className="td text-slate-400 text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en', {
                    month: 'short', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </td>
                <td className="td">
                  <span className="font-medium text-white">{log.user_name}</span>
                </td>
                <td className="td">
                  <span className={`font-semibold ${ACTION_COLORS[log.action] || 'text-slate-300'}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                </td>
                <td className="td">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                    {log.entity_type}
                  </span>
                </td>
                <td className="td">
                  {log.details && <Details details={typeof log.details === 'string' ? JSON.parse(log.details) : log.details} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-500 py-10">No audit entries found</p>
        )}
        {loading && <p className="text-center text-slate-500 py-10 animate-pulse">Loading…</p>}
      </div>
    </div>
  );
}
