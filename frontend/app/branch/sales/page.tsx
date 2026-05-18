'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { ShoppingCart, Trash2, CheckCircle, AlertCircle, Search, X, Package } from 'lucide-react';

interface CartItem {
  product_id: string;
  product_name: string;
  category_name: string;
  min_selling_price: number;
  available_qty: number;
  quantity: number;
  selling_price: string;
}

export default function BranchSalesPage() {
  const [stock, setStock]     = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [cart, setCart]       = useState<CartItem[]>([]);
  const [tab, setTab]         = useState<'new' | 'history'>('new');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Search state
  const [query, setQuery]       = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const searchRef               = useRef<HTMLDivElement>(null);

  const load = () => {
    api.get('/stock').then(r => setStock(r.data.filter((s: any) => s.quantity > 0)));
    api.get('/sales').then(r => setHistory(r.data));
  };
  useEffect(() => { load(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = stock.filter(s =>
    query.trim() === '' ||
    s.product_name.toLowerCase().includes(query.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(query.toLowerCase())
  );

  const addToCart = (s: any) => {
    if (cart.find(c => c.product_id === s.product_id)) return;
    setCart(prev => [...prev, {
      product_id:        s.product_id,
      product_name:      s.product_name,
      category_name:     s.category_name || '',
      min_selling_price: parseFloat(s.min_selling_price),
      available_qty:     s.quantity,
      quantity:          0,
      selling_price:     '',
    }]);
    setQuery('');
    setDropOpen(false);
    setSuccess('');
    setError('');
  };

  const updateItem = (id: string, field: 'quantity' | 'selling_price', val: string) => {
    setCart(prev => prev.map(c =>
      c.product_id === id
        ? { ...c, [field]: field === 'quantity' ? Math.min(parseInt(val) || 0, c.available_qty) : val }
        : c
    ));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.product_id !== id));

  const cartTotal   = cart.reduce((s, c) => s + (parseFloat(c.selling_price) || 0) * c.quantity, 0);
  const priceErrors = cart.filter(c => parseFloat(c.selling_price) < c.min_selling_price);

  const submitSale = async () => {
    if (cart.length === 0) return;
    const emptyFields = cart.filter(c => c.quantity <= 0 || c.selling_price === '');
    if (emptyFields.length > 0) {
      setError(`Enter qty and price for: ${emptyFields.map(e => e.product_name).join(', ')}`);
      return;
    }
    if (priceErrors.length > 0) {
      setError(`Price below minimum for: ${priceErrors.map(e => e.product_name).join(', ')}`);
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      for (const item of cart) {
        await api.post('/sales', {
          product_id:    item.product_id,
          quantity:      item.quantity,
          selling_price: item.selling_price,
        });
      }
      setSuccess(`Sale complete! Total collected: ${fmt(cartTotal)}`);
      setCart([]);
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error processing sale'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sales</h1>
        <p className="text-slate-400 text-sm mt-1">Record sales for your branch</p>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {[{ id: 'new', label: 'New Sale' }, { id: 'history', label: 'Sales History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">

            {/* ── Real-time product search ── */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  className="input pl-9 pr-9"
                  placeholder="Search product by name or category…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setDropOpen(true); }}
                  onFocus={() => setDropOpen(true)}
                  autoComplete="off"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setDropOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {dropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 modal-card rounded-xl shadow-2xl border border-white/10 z-20 max-h-72 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-slate-500">
                      <Package className="w-8 h-8 mb-2 text-gray-300" />
                      <p className="text-sm">No products match "{query}"</p>
                    </div>
                  ) : (
                    searchResults.map(s => {
                      const inCart = !!cart.find(c => c.product_id === s.product_id);
                      return (
                        <button
                          key={s.product_id}
                          onMouseDown={e => e.preventDefault()} // keep focus on input
                          onClick={() => !inCart && addToCart(s)}
                          className={`w-full flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 text-left transition-colors
                            ${inCart ? 'opacity-50 cursor-default bg-gray-50' : 'hover:bg-indigo-500/10 cursor-pointer'}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{s.product_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {s.category_name && <span className="badge-blue">{s.category_name}</span>}
                              <span className="text-xs text-slate-500">Min: {fmt(s.min_selling_price)}</span>
                            </div>
                          </div>
                          <div className="ml-3 shrink-0 text-right">
                            {inCart
                              ? <span className="badge-green">In cart</span>
                              : <span className={s.quantity <= 10 ? 'badge-yellow' : 'badge-blue'}>{s.quantity} left</span>
                            }
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {error   && <div className="alert-error text-sm rounded-xl px-4 py-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="bg-emerald-500/10 text-emerald-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {/* ── Cart table ── */}
            {cart.length === 0 ? (
              <div className="card p-12 text-center text-slate-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium">Cart is empty</p>
                <p className="text-sm mt-1">Search for a product above to add it</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="thead-dark">
                    <tr>
                      <th className="th">Product</th>
                      <th className="th text-center w-28">Qty</th>
                      <th className="th text-right w-44">Selling Price (RWF)</th>
                      <th className="th text-right w-32">Subtotal</th>
                      <th className="th w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-dark">
                    {cart.map(item => {
                      const belowMin = parseFloat(item.selling_price) < item.min_selling_price;
                      return (
                        <tr key={item.product_id} className={belowMin ? 'bg-red-500/10/40' : ''}>
                          <td className="td">
                            <p className="font-medium text-white">{item.product_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Min: {fmt(item.min_selling_price)} · {item.available_qty} available
                            </p>
                          </td>
                          <td className="td">
                            <input
                              type="number"
                              min="1"
                              max={item.available_qty}
                              className="input text-center"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={e => updateItem(item.product_id, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="td">
                            <input
                              type="number"
                              min={item.min_selling_price}
                              className={`input text-right ${belowMin ? 'border-red-400 focus:ring-red-400' : ''}`}
                              value={item.selling_price}
                              onChange={e => updateItem(item.product_id, 'selling_price', e.target.value)}
                            />
                            {belowMin && (
                              <p className="text-xs text-red-500 mt-0.5 text-right">
                                Min is {fmt(item.min_selling_price)}
                              </p>
                            )}
                          </td>
                          <td className="td text-right font-bold text-indigo-400">
                            {fmt((parseFloat(item.selling_price) || 0) * item.quantity)}
                          </td>
                          <td className="td">
                            <button onClick={() => removeItem(item.product_id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-600 transition-colors float-right">
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

          {/* ── Sale summary sidebar ── */}
          <div>
            <div className="card p-5 space-y-4 sticky top-6">
              <h2 className="font-semibold text-white">Sale Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Products</span><span>{cart.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Qty</span><span>{cart.reduce((s, c) => s + c.quantity, 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-white text-base pt-3 border-t border-white/8">
                  <span>Total</span>
                  <span className="text-indigo-400">{fmt(cartTotal)}</span>
                </div>
              </div>
              <button
                onClick={submitSale}
                disabled={saving || cart.length === 0 || priceErrors.length > 0}
                className="btn-success w-full justify-center disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Processing…' : 'Complete Sale'}
              </button>
              {priceErrors.length > 0 && (
                <p className="text-xs text-red-500 text-center">Fix price errors to continue</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="thead-dark">
              <tr>
                <th className="th">Product</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Price</th>
                <th className="th text-right">Revenue</th>
                <th className="th text-right">Profit</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-dark">
              {history.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="td font-medium">{s.product_name}</td>
                  <td className="td text-right">{s.quantity}</td>
                  <td className="td text-right text-slate-400">{fmt(s.selling_price)}</td>
                  <td className="td text-right font-medium text-indigo-400">{fmt(s.total_revenue)}</td>
                  <td className="td text-right font-medium text-emerald-400">{fmt(s.profit)}</td>
                  <td className="td text-slate-400 text-sm">{new Date(s.sold_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <p className="text-center text-slate-500 py-10">No sales recorded yet</p>}
        </div>
      )}
    </div>
  );
}
