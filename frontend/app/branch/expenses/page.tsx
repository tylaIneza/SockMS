'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt, getUser } from '@/lib/auth';
import { Plus, Check, X, Clock, Pencil } from 'lucide-react';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function BranchExpensesPage() {
  const user      = getUser();
  const isManager = user?.role === 'manager';
  const isUser    = user?.role === 'branch_user';

  const [expenses, setExpenses]   = useState<any[]>([]);
  const [modal, setModal]         = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState({ title: '', amount: '', expense_date: localToday() });
  const [editForm, setEditForm]   = useState({ title: '', amount: '', expense_date: '' });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [editError, setEditError] = useState('');

  const load = () => api.get('/expenses').then(r => setExpenses(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/expenses', form);
      setModal(false);
      setForm({ title: '', amount: '', expense_date: localToday() });
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const openEdit = (expense: any) => {
    setEditing(expense);
    setEditForm({ title: expense.title, amount: String(expense.amount), expense_date: expense.expense_date?.slice(0, 10) || '' });
    setEditError('');
    setEditModal(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setEditError('');
    try {
      await api.put(`/expenses/${editing.id}`, editForm);
      setEditModal(false);
      load();
    } catch (e: any) { setEditError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const approve = async (id: string) => { await api.post(`/expenses/${id}/approve`); load(); };
  const reject  = async (id: string) => { await api.post(`/expenses/${id}/reject`);  load(); };

  const total   = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const pending = expenses.filter(e => e.approval_status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">
            Total: {fmt(total)}
            {isManager && pending > 0 && (
              <span className="ml-3 text-amber-400 font-semibold">{pending} pending approval</span>
            )}
          </p>
        </div>
        {/* Only branch_user can add expenses — managers are read-only + approve/reject */}
        {isUser && (
          <button onClick={() => { setForm({ title: '', amount: '', expense_date: localToday() }); setError(''); setModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="thead-dark">
            <tr>
              <th className="th">Description</th>
              {isManager && <th className="th">User</th>}
              <th className="th text-right">Amount</th>
              <th className="th">Date</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-dark">
            {expenses.map((e: any) => (
              <tr key={e.id} className="hover:bg-white/5">
                <td className="td font-medium">{e.title}</td>
                {isManager && <td className="td text-slate-400 text-sm">{e.user_name}</td>}
                <td className="td text-right font-medium text-red-400">{fmt(e.amount)}</td>
                <td className="td text-slate-400 text-sm">{new Date(e.expense_date).toLocaleDateString()}</td>
                <td className="td">
                  {e.approval_status === 'pending'
                    ? <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold"><Clock className="w-3 h-3" /> Pending</span>
                    : <span className="text-emerald-400 text-xs font-semibold">Approved</span>}
                </td>
                <td className="td">
                  <div className="flex items-center gap-1 justify-end">
                    {isManager && e.approval_status === 'pending' && (
                      <>
                        <button onClick={() => approve(e.id)} title="Approve" className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => reject(e.id)} title="Reject" className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isUser && e.approval_status !== 'pending' && (
                      <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && <p className="text-center text-slate-500 py-10">No expenses recorded</p>}
      </div>

      {/* ── Add modal (branch_user only) ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-white">Add Expense</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="alert-error text-sm rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="label">Title / Description</label>
                <input className="input" placeholder="e.g. Electricity bill, Rent..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (RWF)</label>
                  <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal (branch_user only — submits for approval) ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold text-white">Edit Expense</h2>
                <p className="text-xs text-amber-400 mt-0.5">Change will be submitted for approval</p>
              </div>
              <button onClick={() => setEditModal(false)} className="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              {editError && <div className="alert-error text-sm rounded-lg px-3 py-2">{editError}</div>}
              <div>
                <label className="label">Title / Description</label>
                <input className="input" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (RWF)</label>
                  <input type="number" min="0" step="0.01" className="input" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={editForm.expense_date} onChange={e => setEditForm({...editForm, expense_date: e.target.value})} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
