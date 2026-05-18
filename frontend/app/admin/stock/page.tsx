'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Package, Search, AlertTriangle } from 'lucide-react';

export default function StockPage() {
  const [stock, setStock]       = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState<'stock' | 'add'>('stock');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [addForm, setAddForm]   = useState({ product_id: '', quantity: '' });

  const load = () => {
    api.get('/stock').then(r => setStock(r.data));
    api.get('/products').then(r => setProducts(r.data));
  };
  useEffect(() => { load(); }, []);

  const filtered = stock.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = filtered.filter(s => s.quantity <= s.low_stock_alert).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await api.post('/stock/add', addForm);
      setSuccess('Stock added successfully');
      setAddForm({ product_id: '', quantity: '' });
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            {stock.length} products · shared across all branches
            {lowCount > 0 && <span className="text-amber-400 ml-2 font-medium">· {lowCount} low</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {(['stock', 'add'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize
              ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t === 'stock' ? 'All Stock' : 'Add Stock'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input className="input pl-9" placeholder="Search by product or category..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {lowCount > 0 && (
            <div className="alert-warning">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">{lowCount} product{lowCount > 1 ? 's are' : ' is'} running low on stock.</p>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="thead-dark">
                <tr>
                  <th className="th">Product</th>
                  <th className="th">Category</th>
                  <th className="th text-right">Quantity</th>
                  <th className="th text-right">Alert At</th>
                  <th className="th text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-dark">
                {filtered.map((s, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                          <Package className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="font-medium">{s.product_name}</span>
                      </div>
                    </td>
                    <td className="td"><span className="badge-blue">{s.category_name || '—'}</span></td>
                    <td className="td text-right font-bold text-white">{s.quantity}</td>
                    <td className="td text-right text-slate-500">{s.low_stock_alert}</td>
                    <td className="td text-right">
                      {s.quantity === 0
                        ? <span className="badge-red">Out of Stock</span>
                        : s.quantity <= s.low_stock_alert
                          ? <span className="badge-yellow">Low Stock</span>
                          : <span className="badge-green">In Stock</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-slate-500 py-10">No stock records found</p>}
          </div>
        </div>
      )}

      {tab === 'add' && (
        <div className="max-w-md">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Add Stock
            </h2>
            <p className="text-xs text-slate-500">Stock is shared across all branches. Adding here increases the global pool.</p>
            {error   && <div className="alert-error">{error}</div>}
            {success && <div className="alert-success">{success}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Product</label>
                <select className="input" value={addForm.product_id} onChange={e => setAddForm({ ...addForm, product_id: e.target.value })} required>
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.total_stock !== undefined ? ` (current: ${p.total_stock})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity to Add</label>
                <input type="number" min="1" className="input" value={addForm.quantity}
                  onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} required />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                <Plus className="w-4 h-4" />
                {saving ? 'Adding...' : 'Add to Stock'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
