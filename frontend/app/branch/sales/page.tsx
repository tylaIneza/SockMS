'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import {
  ShoppingCart, Trash2, CheckCircle, AlertCircle,
  Search, X, Package, Receipt, Loader2, RefreshCw, Plus,
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
  const [stock, setStock]       = useState<any[]>([]);
  const [history, setHistory]   = useState<any[]>([]);
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [tab, setTab]           = useState<'new' | 'history'>('new');
  const [saving, setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [query, setQuery]       = useState('');

  const loadStock = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const r = await api.get('/stock');
      setStock(r.data); // all products, including 0 qty — we show them grayed
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(() => {
    api.get('/sales').then(r => setHistory(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadStock();
    loadHistory();
    // auto-refresh every 30s so new products added by admin appear immediately
    const t = setInterval(() => loadStock(true), 30_000);
    return () => clearInterval(t);
  }, [loadStock, loadHistory]);

  // filtered product list for the grid
  const filtered = stock.filter(s =>
    query.trim() === '' ||
    s.product_name.toLowerCase().includes(query.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(query.toLowerCase()),
  );

  const addToCart = (s: any) => {
    if (s.quantity === 0) return;
    if (cart.find(c => c.product_id === s.product_id)) return;
    setCart(prev => [...prev, {
      product_id: s.product_id, product_name: s.product_name,
      category_name: s.category_name || '', min_selling_price: parseFloat(s.min_selling_price),
      available_qty: s.quantity, quantity: 0, selling_price: '',
    }]);
    setSuccess(''); setError('');
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
      loadStock(true);
      loadHistory();
    } catch (e: any) { setError(e.response?.data?.message || 'Error processing sale'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* header */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Sales</h1>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                {stock.length} products available
              </p>
            </div>
          </div>
          <button onClick={() => loadStock()} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{ color: C.muted, border: `1px solid ${C.border}`, background: C.card }}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="tabs mt-4">
          <button className={`tab ${tab === 'new' ? 'tab-active' : ''}`} onClick={() => setTab('new')}>New Sale</button>
          <button className={`tab ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>
            History {history.length > 0 && <span className="ml-1 badge-blue py-0">{history.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'new' && (
        <div className="flex flex-col xl:flex-row h-[calc(100vh-140px)]">

          {/* ── LEFT: product grid ── */}
          <div className="flex-1 flex flex-col min-h-0 xl:border-r" style={{ borderColor: C.border }}>

            {/* search bar */}
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.dim }} />
                <input
                  className="input pl-10 pr-9"
                  placeholder="Filter by product name or category…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoComplete="off"
                />
                {query && (
                  <button onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.dim }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] mt-1.5 px-0.5" style={{ color: C.dim }}>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''} shown · click to add to cart
              </p>
            </div>

            {/* product cards grid — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <Package className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">No products found</p>
                  <p className="text-xs" style={{ color: C.muted }}>Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map(s => {
                    const inCart  = !!cart.find(c => c.product_id === s.product_id);
                    const outOfStock = s.quantity === 0;
                    const lowStock   = s.quantity > 0 && s.quantity <= s.low_stock_alert;
                    return (
                      <button
                        key={s.product_id}
                        onClick={() => addToCart(s)}
                        disabled={outOfStock || inCart}
                        className="relative flex flex-col gap-2 p-3.5 rounded-2xl text-left transition-all duration-150 group"
                        style={{
                          background: inCart
                            ? 'rgba(99,102,241,0.15)'
                            : outOfStock
                            ? 'rgba(255,255,255,0.02)'
                            : C.card,
                          border: `1px solid ${inCart ? 'rgba(99,102,241,0.4)' : outOfStock ? 'rgba(255,255,255,0.05)' : C.border}`,
                          opacity: outOfStock ? 0.45 : 1,
                          cursor: outOfStock || inCart ? 'default' : 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (!outOfStock && !inCart)
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)';
                        }}
                        onMouseLeave={e => {
                          if (!outOfStock && !inCart)
                            (e.currentTarget as HTMLElement).style.borderColor = C.border;
                        }}
                      >
                        {/* status badge */}
                        <div className="absolute top-2.5 right-2.5">
                          {inCart      ? <span className="badge-blue text-[10px] py-0.5">In cart</span>
                          : outOfStock ? <span className="badge-red text-[10px] py-0.5">Out of stock</span>
                          : lowStock   ? <span className="badge-yellow text-[10px] py-0.5">{s.quantity} left</span>
                          : null}
                        </div>

                        {/* icon */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: inCart ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)' }}>
                          {inCart
                            ? <CheckCircle className="w-4 h-4 text-indigo-400" />
                            : <Package className="w-4 h-4 text-indigo-400" />}
                        </div>

                        {/* name */}
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{s.product_name}</p>
                          {s.category_name && (
                            <span className="badge-blue text-[10px] mt-1">{s.category_name}</span>
                          )}
                        </div>

                        {/* price + stock */}
                        <div className="mt-auto pt-1" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                          <p className="text-[11px]" style={{ color: C.muted }}>Min: {fmt(s.min_selling_price)}</p>
                          {!outOfStock && !inCart && (
                            <p className="text-[11px]" style={{ color: 'rgba(52,211,153,0.7)' }}>{s.quantity} in stock</p>
                          )}
                        </div>

                        {/* hover add indicator */}
                        {!outOfStock && !inCart && (
                          <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(99,102,241,0.06)' }}>
                            <Plus className="w-5 h-5 text-indigo-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: cart + summary ── */}
          <div className="xl:w-96 flex flex-col" style={{ background: 'rgba(255,255,255,0.02)' }}>

            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white text-sm">Cart</span>
                {cart.length > 0 && (
                  <span className="badge-blue text-[10px]">{cart.length}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs" style={{ color: 'rgba(248,113,113,0.6)' }}>Clear all</button>
              )}
            </div>

            {/* alerts */}
            <div className="px-4 pt-3 space-y-2">
              {error   && <div className="alert-error flex items-center gap-2 text-xs"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
              {success && <div className="alert-success flex items-center gap-2 text-xs"><CheckCircle className="w-3.5 h-3.5 shrink-0" />{success}</div>}
            </div>

            {/* cart items — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <ShoppingCart className="w-8 h-8" style={{ color: C.dim }} />
                  <p className="text-sm" style={{ color: C.muted }}>Cart is empty</p>
                  <p className="text-xs text-center" style={{ color: C.dim }}>Click a product on the left to add it</p>
                </div>
              ) : (
                cart.map(item => {
                  const belowMin = item.selling_price !== '' && parseFloat(item.selling_price) < item.min_selling_price;
                  return (
                    <div key={item.product_id} className="rounded-xl p-3 space-y-2.5"
                      style={{ background: belowMin ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${belowMin ? 'rgba(239,68,68,0.25)' : C.border}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.product_name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
                            Min: {fmt(item.min_selling_price)} · {item.available_qty} in stock
                          </p>
                        </div>
                        <button onClick={() => remove(item.product_id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
                          style={{ color: 'rgba(248,113,113,0.5)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.5)'; }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-[10px] mb-1">Quantity</label>
                          <input type="number" min="1" max={item.available_qty}
                            className="input text-center py-1.5 text-xs"
                            value={item.quantity === 0 ? '' : item.quantity}
                            placeholder="0"
                            onChange={e => update(item.product_id, 'quantity', e.target.value)} />
                        </div>
                        <div>
                          <label className="label text-[10px] mb-1">Price (RWF)</label>
                          <input type="number" min={item.min_selling_price}
                            className={`input text-right py-1.5 text-xs ${belowMin ? 'border-red-500/60' : ''}`}
                            value={item.selling_price}
                            placeholder={String(item.min_selling_price)}
                            onChange={e => update(item.product_id, 'selling_price', e.target.value)} />
                        </div>
                      </div>
                      {belowMin && <p className="text-[10px] text-red-400">Min price is {fmt(item.min_selling_price)}</p>}
                      <div className="flex justify-between text-xs">
                        <span style={{ color: C.muted }}>Subtotal</span>
                        <span className="font-black" style={{ color: '#818cf8' }}>
                          {fmt((parseFloat(item.selling_price) || 0) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* order total + submit */}
            <div className="px-4 pb-5 pt-3 space-y-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-2xl font-black" style={{ color: '#818cf8' }}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={submit}
                disabled={saving || cart.length === 0 || priceErrors.length > 0}
                className="btn-success w-full justify-center py-3 text-base disabled:opacity-40">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                  : <><CheckCircle className="w-4 h-4" />Complete Sale</>}
              </button>
              {priceErrors.length > 0 && (
                <p className="text-xs text-center text-red-400">Fix price errors above to continue</p>
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
                    <ShoppingCart className="w-5 h-5 text-indigo-400" />
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
