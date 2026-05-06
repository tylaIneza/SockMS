'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { ShoppingCart, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface CartItem {
  product_id: string;
  product_name: string;
  min_selling_price: number;
  available_qty: number;
  quantity: number;
  selling_price: string;
}

export default function BranchSalesPage() {
  const [stock, setStock]       = useState<any[]>([]);
  const [history, setHistory]   = useState<any[]>([]);
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [tab, setTab]           = useState<'new' | 'history'>('new');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  const load = () => {
    api.get('/stock').then(r => setStock(r.data.filter((s: any) => s.quantity > 0)));
    api.get('/sales').then(r => setHistory(r.data));
  };
  useEffect(() => { load(); }, []);

  const addToCart = () => {
    if (!selectedProduct) return;
    const s = stock.find(s => s.product_id === selectedProduct);
    if (!s) return;
    if (cart.find(c => c.product_id === selectedProduct)) return;
    setCart(prev => [...prev, {
      product_id: s.product_id,
      product_name: s.product_name,
      min_selling_price: parseFloat(s.min_selling_price),
      available_qty: s.quantity,
      quantity: 1,
      selling_price: String(s.min_selling_price),
    }]);
    setSelectedProduct('');
  };

  const updateItem = (id: string, field: 'quantity' | 'selling_price', val: string) => {
    setCart(prev => prev.map(c => c.product_id === id ? { ...c, [field]: field === 'quantity' ? Math.min(parseInt(val) || 1, c.available_qty) : val } : c));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.product_id !== id));

  const cartTotal = cart.reduce((s, c) => s + (parseFloat(c.selling_price) || 0) * c.quantity, 0);

  const priceErrors = cart.filter(c => parseFloat(c.selling_price) < c.min_selling_price);

  const submitSale = async () => {
    if (cart.length === 0) return;
    if (priceErrors.length > 0) { setError(`Selling price below minimum for: ${priceErrors.map(e => e.product_name).join(', ')}`); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      for (const item of cart) {
        await api.post('/sales', {
          product_id: item.product_id,
          quantity: item.quantity,
          selling_price: item.selling_price,
        });
      }
      setSuccess(`Sale completed! Total: ${fmt(cartTotal)}`);
      setCart([]);
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error processing sale'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-gray-500 text-sm mt-1">Record sales for your branch</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[{ id: 'new', label: 'New Sale' }, { id: 'history', label: 'Sales History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Product selector */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex gap-2">
              <select className="input flex-1" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                <option value="">Select a product to add...</option>
                {stock.filter(s => !cart.find(c => c.product_id === s.product_id)).map(s => (
                  <option key={s.product_id} value={s.product_id}>
                    {s.product_name} — {s.quantity} available
                  </option>
                ))}
              </select>
              <button onClick={addToCart} disabled={!selectedProduct} className="btn-primary px-4">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {error   && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {cart.length === 0 ? (
              <div className="card p-10 text-center text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>Add products to start a sale</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="th">Product</th>
                      <th className="th text-center w-28">Qty</th>
                      <th className="th text-right w-40">Selling Price</th>
                      <th className="th text-right w-32">Subtotal</th>
                      <th className="th w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cart.map(item => {
                      const belowMin = parseFloat(item.selling_price) < item.min_selling_price;
                      return (
                        <tr key={item.product_id} className={belowMin ? 'bg-red-50/30' : ''}>
                          <td className="td">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-gray-400">Min: {fmt(item.min_selling_price)} · {item.available_qty} in stock</p>
                          </td>
                          <td className="td">
                            <input type="number" min="1" max={item.available_qty} className={`input text-center w-full ${belowMin ? '' : ''}`}
                              value={item.quantity} onChange={e => updateItem(item.product_id, 'quantity', e.target.value)} />
                          </td>
                          <td className="td">
                            <input type="number" min={item.min_selling_price} step="1" className={`input text-right w-full ${belowMin ? 'border-red-300 focus:border-red-500' : ''}`}
                              value={item.selling_price} onChange={e => updateItem(item.product_id, 'selling_price', e.target.value)} />
                            {belowMin && <p className="text-xs text-red-500 mt-0.5 text-right">Below minimum</p>}
                          </td>
                          <td className="td text-right font-bold text-indigo-600">
                            {fmt((parseFloat(item.selling_price) || 0) * item.quantity)}
                          </td>
                          <td className="td">
                            <button onClick={() => removeItem(item.product_id)} className="p-1 hover:bg-red-50 rounded text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cart summary */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Sale Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Items</span><span>{cart.length}</span></div>
                <div className="flex justify-between text-gray-600"><span>Total Qty</span><span>{cart.reduce((s, c) => s + c.quantity, 0)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t"><span>Total</span><span className="text-indigo-600">{fmt(cartTotal)}</span></div>
              </div>
              <button
                onClick={submitSale}
                disabled={saving || cart.length === 0 || priceErrors.length > 0}
                className="btn-success w-full justify-center disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Processing...' : 'Complete Sale'}
              </button>
              {priceErrors.length > 0 && <p className="text-xs text-red-500 text-center">Fix price errors above</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="th">Product</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Price</th>
                <th className="th text-right">Revenue</th>
                <th className="th text-right">Profit</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="td font-medium">{s.product_name}</td>
                  <td className="td text-right">{s.quantity}</td>
                  <td className="td text-right text-gray-500">{fmt(s.selling_price)}</td>
                  <td className="td text-right font-medium text-indigo-600">{fmt(s.total_revenue)}</td>
                  <td className="td text-right font-medium text-emerald-600">{fmt(s.profit)}</td>
                  <td className="td text-gray-500 text-sm">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <p className="text-center text-gray-400 py-10">No sales recorded yet</p>}
        </div>
      )}
    </div>
  );
}
