'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { Plus, Trash2, Check, X, Clock, Receipt } from 'lucide-react';
import { useBranch } from '@/lib/branch-context';

const BG     = '#07071a';
const BORDER = 'rgba(255,255,255,0.08)';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function AdminExpensesPage() {
  const { selectedUser, users } = useBranch();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({
    user_id: '', title: '', amount: '',
    expense_date: localToday(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const load = () => {
    const params = selectedUser !== 'all' ? `?user_id=${selectedUser}` : '';
    api.get(`/expenses${params}`).then(r => setExpenses(r.data));
  };
  useEffect(() => { load(); }, [selectedUser]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/expenses', form);
      setModal(false);
      setForm({ user_id: '', title: '', amount: '', expense_date: localToday() });
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del     = async (id: string) => { if (!confirm('Delete this expense?')) return; await api.delete(`/expenses/${id}`); load(); };
  const approve = async (id: string) => { await api.post(`/expenses/${id}/approve`); load(); };
  const reject  = async (id: string) => { await api.post(`/expenses/${id}/reject`);  load(); };

  const total        = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const pendingCount = expenses.filter(e => e.approval_status === 'pending').length;
  const approvedAmt  = expenses.filter(e => e.approval_status === 'approved').reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── page header ── */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)', boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}>
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Expenses</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Total: {fmt(total)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <div className="px-3 py-1.5 text-xs rounded-lg font-semibold"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                {pendingCount} pending
              </div>
            )}
            <div className="px-3 py-1.5 text-xs rounded-lg font-semibold"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
              {fmt(approvedAmt)} approved
            </div>
            <button
              onClick={() => {
                setForm({
                  user_id: selectedUser !== 'all' ? selectedUser : '',
                  title: '', amount: '',
                  expense_date: localToday(),
                });
                setError(''); setModal(true);
              }}
              className="btn-primary">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* ── content ── */}
      <div className="px-6 py-5">
        <div className="card overflow-hidden">
          <div className="section-header">
            <div>
              <p className="section-title">All Expenses</p>
              <p className="section-sub">{expenses.length} records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="thead-dark">
                <tr>
                  <th className="th">Description</th>
                  <th className="th">User</th>
                  <th className="th text-right">Amount</th>
                  <th className="th">Date</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-dark">
                {expenses.map((e: any) => (
                  <tr key={e.id} className="tr-hover">
                    <td className="td font-semibold text-white">{e.title}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                          {e.user_name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{e.user_name}</span>
                      </div>
                    </td>
                    <td className="td text-right font-bold text-red-400">{fmt(e.amount)}</td>
                    <td className="td text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(e.expense_date).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="td">
                      {e.approval_status === 'pending'
                        ? <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold w-fit">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        : <span className="text-emerald-400 text-xs font-semibold">Approved</span>}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        {e.approval_status === 'pending' && (
                          <>
                            <button onClick={() => approve(e.id)} title="Approve"
                              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => reject(e.id)} title="Reject"
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'rgba(255,255,255,0.35)' }}
                              onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => del(e.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(249,115,22,0.08)' }}>
                  <Receipt className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-white">No expenses recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h2 className="font-bold text-white">Add Expense</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="alert-error">{error}</div>}
              <div>
                <label className="label">User</label>
                <select className="input" value={form.user_id}
                  onChange={e => setForm({ ...form, user_id: e.target.value })} required>
                  <option value="">Select user</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title / Description</label>
                <input className="input" placeholder="e.g. Electricity bill, Rent…"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (RWF)</label>
                  <input type="number" min="0" step="0.01" className="input"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input"
                    value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
