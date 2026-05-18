'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Package, Search, AlertTriangle, Boxes, Loader2 } from 'lucide-react';

const C = {
  bg:     '#07071a',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.35)',
};

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

  const filtered  = stock.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(search.toLowerCase()),
  );
  const lowCount  = stock.filter(s => s.quantity > 0 && s.quantity <= s.low_stock_alert).length;
  const outCount  = stock.filter(s => s.quantity === 0).length;
  const okCount   = stock.filter(s => s.quantity > s.low_stock_alert).length;

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
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* header */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#0284c7)', boxShadow: '0 4px 14px rgba(6,182,212,0.4)' }}>
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Stock Management</h1>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Shared global inventory · {stock.length} products</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="badge-green px-3 py-1.5 text-xs">{okCount} healthy</div>
            {lowCount > 0 && <div className="badge-yellow px-3 py-1.5 text-xs">{lowCount} low</div>}
            {outCount > 0 && <div className="badge-red px-3 py-1.5 text-xs">{outCount} out</div>}
          </div>
        </div>

        <div className="tabs mt-4">
          {(['stock', 'add'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className={`tab ${tab === t ? 'tab-active' : ''}`}>
              {t === 'stock' ? 'All Stock' : 'Add Stock'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {tab === 'stock' && (
          <div className="space-y-4">
            {lowCount > 0 || outCount > 0 ? (
              <div className="alert-warning">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-sm text-amber-300">
                  <span className="font-bold">{lowCount + outCount} items need attention</span>
                  {outCount > 0 ? ` — ${outCount} out of stock` : ''}{lowCount > 0 ? `, ${lowCount} running low` : ''}.
                </p>
              </div>
            ) : null}

            <div className="card overflow-hidden">
              <div className="section-header">
                <div>
                  <p className="section-title">Inventory</p>
                  <p className="section-sub">{filtered.length} of {stock.length} products</p>
                </div>
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: C.muted }} />
                  <input className="input pl-8 py-2 text-xs" placeholder="Search products…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="overflow-x-auto">
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
                    {filtered.map((s, i) => {
                      const isOut = s.quantity === 0;
                      const isLow = !isOut && s.quantity <= s.low_stock_alert;
                      return (
                        <tr key={i} className="tr-hover" style={{ background: isOut ? 'rgba(239,68,68,0.04)' : isLow ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                          <td className="td">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.12)' }}>
                                <Package className="w-3.5 h-3.5 text-indigo-400" />
                              </div>
                              <span className="font-semibold text-white">{s.product_name}</span>
                            </div>
                          </td>
                          <td className="td"><span className="badge-blue">{s.category_name || '—'}</span></td>
                          <td className="td text-right">
                            <span className="text-lg font-black text-white">{s.quantity}</span>
                          </td>
                          <td className="td text-right text-sm" style={{ color: C.muted }}>{s.low_stock_alert}</td>
                          <td className="td text-right">
                            {isOut  ? <span className="badge-red">Out of Stock</span>
                            : isLow ? <span className="badge-yellow">Low Stock</span>
                            :         <span className="badge-green">In Stock</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center py-14 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <Package className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">No products found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'add' && (
          <div className="max-w-md">
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Plus className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white leading-none">Add Stock</h2>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>Increases the global shared pool</p>
                </div>
              </div>

              {error   && <div className="alert-error">{error}</div>}
              {success && <div className="alert-success">{success}</div>}

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="label">Product</label>
                  <select className="input" value={addForm.product_id}
                    onChange={e => setAddForm({ ...addForm, product_id: e.target.value })} required>
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.total_stock !== undefined ? ` (current: ${p.total_stock})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity to Add</label>
                  <input type="number" min="1" className="input" placeholder="e.g. 50"
                    value={addForm.quantity}
                    onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} required />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <><Plus className="w-4 h-4" />Add to Stock</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
