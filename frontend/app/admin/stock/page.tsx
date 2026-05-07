'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, ArrowRightLeft, Package, Search } from 'lucide-react';
import { useBranch } from '@/lib/branch-context';

export default function StockPage() {
  const { selectedBranch, branches } = useBranch();
  const [stock, setStock]       = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState<'stock' | 'add' | 'transfer' | 'history'>('stock');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const [addForm, setAddForm]  = useState({ branch_id: '', product_id: '', quantity: '' });
  const [xferForm, setXferForm] = useState({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '' });

  // Sync add form branch when global selector changes
  useEffect(() => {
    setAddForm(f => ({ ...f, branch_id: selectedBranch }));
  }, [selectedBranch]);

  const load = () => {
    api.get('/stock').then(r => setStock(r.data));
    api.get('/products').then(r => setProducts(r.data));
    api.get('/stock/transfers').then(r => setTransfers(r.data));
  };
  useEffect(() => { load(); }, []);

  const filtered = stock.filter(s =>
    (selectedBranch === 'all' || s.branch_id === selectedBranch) &&
    (s.product_name.toLowerCase().includes(search.toLowerCase()) ||
     s.branch_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await api.post('/stock/add', addForm);
      setSuccess('Stock added successfully');
      setAddForm({ branch_id: '', product_id: '', quantity: '' });
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await api.post('/stock/transfer', xferForm);
      setSuccess('Transfer completed successfully');
      setXferForm({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '' });
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'stock', label: 'All Stock' },
    { id: 'add', label: 'Add Stock' },
    { id: 'transfer', label: 'Transfer' },
    { id: 'history', label: 'Transfer History' },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage inventory across all branches</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search product or branch..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="th">Product</th>
                  <th className="th">Category</th>
                  <th className="th">Branch</th>
                  <th className="th text-right">Quantity</th>
                  <th className="th text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="td font-medium">{s.product_name}</td>
                    <td className="td"><span className="badge-blue">{s.category_name || '—'}</span></td>
                    <td className="td text-gray-500">{s.branch_name}</td>
                    <td className="td text-right font-bold">{s.quantity}</td>
                    <td className="td text-right">
                      <span className={s.quantity <= s.low_stock_alert ? 'badge-red' : s.quantity <= s.low_stock_alert * 2 ? 'badge-yellow' : 'badge-green'}>
                        {s.quantity <= s.low_stock_alert ? 'Low' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-gray-400 py-10">No stock records found</p>}
          </div>
        </div>
      )}

      {tab === 'add' && (
        <div className="max-w-md">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4" /> Add Stock</h2>
            {error   && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{success}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Branch</label>
                <select className="input" value={addForm.branch_id} onChange={e => setAddForm({...addForm, branch_id: e.target.value})} required>
                  <option value="">Select branch</option>
                  <option value="all">⭐ All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {addForm.branch_id === 'all' && (
                  <p className="text-xs text-indigo-600 mt-1">
                    This quantity will be added to <strong>every branch</strong> ({branches.length} branches).
                  </p>
                )}
              </div>
              <div>
                <label className="label">Product</label>
                <select className="input" value={addForm.product_id} onChange={e => setAddForm({...addForm, product_id: e.target.value})} required>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="1" className="input" value={addForm.quantity} onChange={e => setAddForm({...addForm, quantity: e.target.value})} required />
                {addForm.branch_id === 'all' && addForm.quantity && (
                  <p className="text-xs text-gray-400 mt-1">
                    Total distributed: <strong>{parseInt(addForm.quantity) * branches.length} units</strong> ({addForm.quantity} × {branches.length} branches)
                  </p>
                )}
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                <Plus className="w-4 h-4" />
                {saving ? 'Adding...' : addForm.branch_id === 'all' ? `Add to All ${branches.length} Branches` : 'Add Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'transfer' && (
        <div className="max-w-md">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Transfer Between Branches</h2>
            {error   && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{success}</div>}
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="label">Product</label>
                <select className="input" value={xferForm.product_id} onChange={e => setXferForm({...xferForm, product_id: e.target.value})} required>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From Branch</label>
                  <select className="input" value={xferForm.from_branch_id} onChange={e => setXferForm({...xferForm, from_branch_id: e.target.value})} required>
                    <option value="">Select</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">To Branch</label>
                  <select className="input" value={xferForm.to_branch_id} onChange={e => setXferForm({...xferForm, to_branch_id: e.target.value})} required>
                    <option value="">Select</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="1" className="input" value={xferForm.quantity} onChange={e => setXferForm({...xferForm, quantity: e.target.value})} required />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                <ArrowRightLeft className="w-4 h-4" />{saving ? 'Transferring...' : 'Transfer Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="th">Product</th>
                <th className="th">From</th>
                <th className="th">To</th>
                <th className="th text-right">Qty</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.map((t: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="td font-medium">{t.product_name}</td>
                  <td className="td text-gray-500">{t.from_branch}</td>
                  <td className="td text-gray-500">{t.to_branch}</td>
                  <td className="td text-right font-medium">{t.quantity}</td>
                  <td className="td text-gray-500 text-sm">{new Date(t.transferred_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transfers.length === 0 && <p className="text-center text-gray-400 py-10">No transfers yet</p>}
        </div>
      )}
    </div>
  );
}
