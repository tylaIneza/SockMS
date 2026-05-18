'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import {
  ShoppingCart, Trash2, CheckCircle, AlertCircle,
  Search, X, Package, Receipt, ChevronRight, Loader2,
} from 'lucide-react';

const C = {
  bg:     '#07071a',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.35)',
  dim:    'rgba(255,255,255,0.18)',
};

interface CartItem {
  product_id:        string;
  product_name:      string;
  category_name:     string;
  min_selling_price: number;
  available_qty:     number;
  quantity:          number;
  selling_price:     string;
}

export default function BranchSalesPage() {
  const [stock, setStock]     = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [cart, setCart]       = useState<CartItem[]>([]);
  const [tab, setTab]         = useState<'new' | 'history'>('new');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery]     = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const searchRef             = useRef<HTMLDivElement>(null);

  const load = () => {
    api.get('/stock').then(r => setStock(r.data.filter((s: any) => s.quantity > 0)));
    api.get('/sales').then(r => setHistory(r.data));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = stock.filter(s =>
    query.trim() === '' ||
    s.product_name.toLowerCase().includes(query.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(query.toLowerCase()),
  );

  const addToCart = (s: any) => {
    if (cart.find(c => c.product_id === s.product_id)) return;
    setCart(prev => [...prev, {
      product_id: s.product_id, product_name: s.product_name,
      category_name: s.category_name || '', min_selling_price: parseFloat(s.min_selling_price),
      available_qty: s.quantity, quantity: 0, selling_price: '',
    }]);
    setQuery(''); setDropOpen(false); setSuccess(''); setError('');
  };

  const update = (id: string, field: 'quantity' | 'selling_price', val: string) =>
    setCart(prev => prev.map(c => c.product_id === id
      ? { ...c, [field]: field === 'quantity' ? Math.min(parseInt(val) || 0, c.available_qty) : val }
      : c));

  const remove = (id: string) => setCart(prev => prev.filter(c => c.product_id !== id));

  const cartTotal   = cart.reduce((s, c) => s + (parseFloat(c.selling_price) || 0) * c.quantity, 0);
  const priceErrors = cart.filter(c => c.selling_price !== '' && parseFloat(c.selling_price) < c.min_selling_price);

  const submit = async () => {
    if (cart.length === 0) return;
    const empty = cart.filter(c => c.quantity <= 0 || c.selling_price === '');
    if (empty.length) { setError(`Fill qty & price for: ${empty.map(e => e.product_name).join(', ')}`); return; }
    if (priceErrors.length) { setError(`Price below minimum for: ${priceErrors.map(e => e.product_name).join(', ')}`); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      for (const item of cart) {
        await api.post('/sales', { product_id: item.product_id, quantity: item.quantity, selling_price: item.selling_price });
      }
      setSuccess(`Sale complete! Collected: ${fmt(cartTotal)}`);
      setCart([]);
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error processing sale'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* header */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-none">Sales</h1>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Record new sales or view history</p>
          </div>
        </div>

        {/* tabs */}
        <div className="tabs mt-4">
          <button className={`tab ${tab === 'new' ? 'tab-active' : ''}`} onClick={() => setTab('new')}>New Sale</button>
          <button className={`tab ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>History</button>
        </div>
      </div>

      {tab === 'new' && (
        <div className="px-6 py-5 grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* left: search + cart */}
          <div className="xl:col-span-2 space-y-4">

            {/* product search */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.dim }} />
                <input
                  className="input pl-10"
                  placeholder="Search product by name or category…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setDropOpen(true); }}
                  onFocus={() => setDropOpen(true)}
                  autoComplete="off"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setDropOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: C.dim }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {dropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl shadow-2xl z-30 overflow-hidden max-h-72 overflow-y-auto"
                  style={{ background: '#0d0d26', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                  {results.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-2">
                      <Package className="w-8 h-8" style={{ color: C.dim }} />
                      <p className="text-sm" style={{ color: C.muted }}>No products match "{query}"</p>
                    </div>
                  ) : (
                    results.map(s => {
                      const inCart = !!cart.find(c => c.product_id === s.product_id);
                      return (
                        <button key={s.product_id}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => !inCart && addToCart(s)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150"
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: inCart ? 'rgba(99,102,241,0.06)' : 'transparent',
                            cursor: inCart ? 'default' : 'pointer',
                            opacity: inCart ? 0.55 : 1,
                          }}
                          onMouseEnter={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.10)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = inCart ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                        >
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                              style={{ background: 'rgba(99,102,241,0.12)' }}>
                              <Package className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white truncate">{s.product_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {s.category_name && <span className="badge-blue">{s.category_name}</span>}
                                <span className="text-[10px]" style={{ color: C.muted }}>min {fmt(s.min_selling_price)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-3 shrink-0">
                            {inCart
                              ? <span className="badge-green">In cart</span>
                              : <span className={s.quantity <= 10 ? 'badge-yellow' : 'badge-blue'}>{s.quantity} left</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* alerts */}
            {error   && <div className="alert-error flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {success && <div className="alert-success flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

            {/* cart */}
            {cart.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <ShoppingCart className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-white">Cart is empty</p>
                <p className="text-xs" style={{ color: C.muted }}>Search for a product above to add it</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="section-header">
                  <div>
                    <p className="section-title">Cart</p>
                    <p className="section-sub">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="thead-dark">
                      <tr>
                        <th className="th">Product</th>
                        <th className="th text-center w-28">Qty</th>
                        <th className="th text-right w-44">Selling Price</th>
                        <th className="th text-right w-32">Subtotal</th>
                        <th className="th w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-dark">
                      {cart.map(item => {
                        const belowMin = item.selling_price !== '' && parseFloat(item.selling_price) < item.min_selling_price;
                        return (
                          <tr key={item.product_id} className="tr-hover" style={{ background: belowMin ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                            <td className="td">
                              <p className="font-semibold text-white">{item.product_name}</p>
                              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                                Min: {fmt(item.min_selling_price)} · {item.available_qty} in stock
                              </p>
                            </td>
                            <td className="td">
                              <input type="number" min="1" max={item.available_qty}
                                className="input text-center"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={e => update(item.product_id, 'quantity', e.target.value)} />
                            </td>
                            <td className="td">
                              <input type="number" min={item.min_selling_price}
                                className={`input text-right ${belowMin ? 'border-red-500/60' : ''}`}
                                value={item.selling_price}
                                onChange={e => update(item.product_id, 'selling_price', e.target.value)} />
                              {belowMin && <p className="text-[11px] text-red-400 mt-1 text-right">Min is {fmt(item.min_selling_price)}</p>}
                            </td>
                            <td className="td text-right font-black" style={{ color: '#818cf8' }}>
                              {fmt((parseFloat(item.selling_price) || 0) * item.quantity)}
                            </td>
                            <td className="td text-right">
                              <button onClick={() => remove(item.product_id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto transition-all"
                                style={{ color: 'rgba(248,113,113,0.6)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.6)'; }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* right: summary */}
          <div>
            <div className="card p-5 space-y-5 sticky top-6">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <h2 className="font-bold text-white">Order Summary</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: C.muted }}>Products</span>
                  <span className="font-semibold text-white">{cart.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: C.muted }}>Total Units</span>
                  <span className="font-semibold text-white">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
                </div>
                <div className="h-px" style={{ background: C.border }} />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-xl font-black" style={{ color: '#818cf8' }}>{fmt(cartTotal)}</span>
                </div>
              </div>

              <button onClick={submit}
                disabled={saving || cart.length === 0 || priceErrors.length > 0}
                className="btn-success w-full justify-center py-3 text-base disabled:opacity-40">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                  : <><CheckCircle className="w-4 h-4" />Complete Sale</>}
              </button>
              {priceErrors.length > 0 && (
                <p className="text-xs text-center text-red-400">Fix price errors to continue</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="px-6 py-5">
          <div className="card overflow-hidden">
            <div className="section-header">
              <div>
                <p className="section-title">Sales History</p>
                <p className="section-sub">{history.length} records</p>
              </div>
            </div>
            <div className="overflow-x-auto">
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
                    <tr key={i} className="tr-hover">
                      <td className="td font-semibold text-white">{s.product_name}</td>
                      <td className="td text-right" style={{ color: C.muted }}>{s.quantity}</td>
                      <td className="td text-right" style={{ color: C.muted }}>{fmt(s.selling_price)}</td>
                      <td className="td text-right font-bold" style={{ color: '#818cf8' }}>{fmt(s.total_revenue)}</td>
                      <td className="td text-right font-bold" style={{ color: '#34d399' }}>{fmt(s.profit)}</td>
                      <td className="td text-xs" style={{ color: C.muted }}>
                        {new Date(s.sold_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <ChevronRight className="w-5 h-5 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">No sales yet</p>
                  <p className="text-xs" style={{ color: C.muted }}>Completed sales will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
