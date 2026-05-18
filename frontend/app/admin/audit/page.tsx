'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';

const BG     = '#07071a';
const BORDER = 'rgba(255,255,255,0.08)';

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
  'user.login':             'text-purple-400',
  'user.password_change':   'text-cyan-400',
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
  'user.login':             'Logged in',
  'user.password_change':   'Changed password',
};

const CATEGORY_FILTERS = [
  { id: '',        label: 'All' },
  { id: 'user',    label: 'Users' },
  { id: 'sale',    label: 'Sales' },
  { id: 'expense', label: 'Expenses' },
  { id: 'stock',   label: 'Stock' },
] as const;

function Details({ details }: { details: any }) {
  if (!details) return null;
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
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
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/audit?limit=500').then(r => setLogs(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    const matchCat = !category || l.action.startsWith(category);
    const matchSearch = !search ||
      l.action.includes(search) ||
      l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type?.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── page header ── */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Audit Logs</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{filtered.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input className="input pl-8 py-2 text-xs w-52" placeholder="Search user, action…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={load}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={ev => (ev.currentTarget.style.color = 'white')}
              onMouseLeave={ev => (ev.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* category filter tabs */}
        <div className="tabs mt-4">
          {CATEGORY_FILTERS.map(f => (
            <button key={f.id} onClick={() => setCategory(f.id)}
              className={`tab ${category === f.id ? 'tab-active' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── content ── */}
      <div className="px-6 py-5">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
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
                  <tr key={log.id} className="tr-hover">
                    <td className="td text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(log.created_at).toLocaleString('en', {
                        month: 'short', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                          {log.user_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="td">
                      <span className={`font-semibold ${ACTION_COLORS[log.action] || 'text-white'}`}>
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
                      {log.details && (
                        <Details details={typeof log.details === 'string' ? JSON.parse(log.details) : log.details} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-white">No audit entries found</p>
              </div>
            )}
            {loading && (
              <p className="text-center py-14 animate-pulse text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Loading…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
