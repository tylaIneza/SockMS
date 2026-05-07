'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { Plus, Trash2 } from 'lucide-react';
import { useBranch } from '@/lib/branch-context';

export default function AdminExpensesPage() {
  const { selectedBranch, branches } = useBranch();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ branch_id: '', title: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = () => { api.get('/expenses').then(r => setExpenses(r.data)); };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/expenses', form);
      setModal(false); setForm({ branch_id: '', description: '', amount: '' }); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`); load();
  };

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Total: {fmt(total)}</p>
        </div>
        <button onClick={() => { setForm({ branch_id: selectedBranch === 'all' ? '' : selectedBranch, title: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) }); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="th">Description</th>
              <th className="th">Branch</th>
              <th className="th text-right">Amount</th>
              <th className="th">Date</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="td font-medium">{e.title}</td>
                <td className="td text-gray-500">{e.branch_name}</td>
                <td className="td text-right font-medium text-red-600">{fmt(e.amount)}</td>
                <td className="td text-gray-500 text-sm">{new Date(e.created_at).toLocaleDateString()}</td>
                <td className="td">
                  <button onClick={() => del(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 float-right">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && <p className="text-center text-gray-400 py-10">No expenses recorded</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Add Expense</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="label">Branch</label>
                <select className="input" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})} required>
                  <option value="">Select branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
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
    </div>
  );
}
