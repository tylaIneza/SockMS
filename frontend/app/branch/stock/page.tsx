'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Search, Package, AlertTriangle, Boxes } from 'lucide-react';

const C = {
  bg:     '#07071a',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.35)',
};

export default function BranchStockPage() {
  const [stock, setStock]   = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { api.get('/stock').then(r => setStock(r.data)); }, []);

  const filtered  = stock.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(search.toLowerCase()),
  );
  const lowCount  = stock.filter(s => s.quantity <= s.low_stock_alert).length;
  const inStock   = stock.filter(s => s.quantity > s.low_stock_alert).length;
  const outCount  = stock.filter(s => s.quantity === 0).length;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* header */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#0284c7)', boxShadow: '0 4px 14px rgba(6,182,212,0.4)' }}>
            <Boxes className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-none">My Stock</h1>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{stock.length} products total</p>
          </div>
        </div>

        {/* summary chips */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="badge-green px-3 py-1.5 text-xs">{inStock} in stock</div>
          {lowCount > 0 && <div className="badge-yellow px-3 py-1.5 text-xs">{lowCount} low stock</div>}
          {outCount > 0 && <div className="badge-red px-3 py-1.5 text-xs">{outCount} out of stock</div>}
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* low stock banner */}
        {lowCount > 0 && (
          <div className="alert-warning">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-sm text-amber-300">
              <span className="font-bold">{lowCount} product{lowCount !== 1 ? 's are' : ' is'} running low</span> — contact admin to restock.
            </p>
          </div>
        )}

        {/* table */}
        <div className="card overflow-hidden">
          <div className="section-header">
            <div>
              <p className="section-title">Stock Levels</p>
              <p className="section-sub">Shared global inventory</p>
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
                  <th className="th text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-dark">
                {filtered.map((s, i) => {
                  const isLow  = s.quantity > 0 && s.quantity <= s.low_stock_alert;
                  const isOut  = s.quantity === 0;
                  return (
                    <tr key={i} className="tr-hover" style={{ background: isOut ? 'rgba(239,68,68,0.04)' : isLow ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(99,102,241,0.12)' }}>
                            <Package className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <span className="font-semibold text-white">{s.product_name}</span>
                        </div>
                      </td>
                      <td className="td"><span className="badge-blue">{s.category_name || '—'}</span></td>
                      <td className="td text-right">
                        <span className="text-lg font-black text-white">{s.quantity}</span>
                        <span className="text-xs ml-1" style={{ color: C.muted }}>/ {s.low_stock_alert} min</span>
                      </td>
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
    </div>
  );
}
