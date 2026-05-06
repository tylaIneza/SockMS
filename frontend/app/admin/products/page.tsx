'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';

const EMPTY = { name: '', category_id: '', buying_price: '', min_selling_price: '', low_stock_alert: '10' };

export default function ProductsPage() {
  const [products, setProducts]     = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const load = () => {
    api.get(`/products${search ? `?search=${search}` : ''}`).then(r => setProducts(r.data));
    api.get('/categories').then(r => setCategories(r.data));
  };
  useEffect(() => { load(); }, [search]);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setError(''); setModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, category_id: p.category_id || '', buying_price: p.buying_price, min_selling_price: p.min_selling_price, low_stock_alert: p.low_stock_alert });
    setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/products/${editing.id}`, form);
      else          await api.post('/products', form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} products</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add Product</button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="th">Product</th><th className="th">Category</th>
                <th className="th text-right">Buy Price</th><th className="th text-right">Min Sell</th>
                <th className="th text-right">Total Stock</th><th className="th text-right">Alert</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td"><span className="badge-blue">{p.category_name || '—'}</span></td>
                  <td className="td text-right">{fmt(p.buying_price)}</td>
                  <td className="td text-right">{fmt(p.min_selling_price)}</td>
                  <td className="td text-right font-medium">{p.total_stock}</td>
                  <td className="td text-right">
                    <span className={p.total_stock <= p.low_stock_alert ? 'badge-red' : 'badge-green'}>{p.low_stock_alert}</span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center text-gray-400 py-10">No products found</p>}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editing ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Buying Price</label><input type="number" min="0" step="0.01" className="input" value={form.buying_price} onChange={e => setForm({...form, buying_price: e.target.value})} required /></div>
                <div><label className="label">Min Selling Price</label><input type="number" min="0" step="0.01" className="input" value={form.min_selling_price} onChange={e => setForm({...form, min_selling_price: e.target.value})} required /></div>
              </div>
              <div><label className="label">Low Stock Alert</label><input type="number" min="1" className="input" value={form.low_stock_alert} onChange={e => setForm({...form, low_stock_alert: e.target.value})} required /></div>
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
