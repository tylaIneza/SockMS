'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Search, Package, AlertTriangle } from 'lucide-react';

export default function BranchStockPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { api.get('/stock').then(r => setStock(r.data)); }, []);

  const filtered = stock.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = stock.filter(s => s.quantity <= s.low_stock_alert).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Stock</h1>
          <p className="text-gray-500 text-sm mt-1">{stock.length} products · {lowCount > 0 && <span className="text-amber-600 font-medium">{lowCount} low stock</span>}</p>
        </div>
      </div>

      {lowCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">{lowCount} product{lowCount > 1 ? 's are' : ' is'} running low on stock. Contact admin to restock.</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="th">Product</th>
              <th className="th">Category</th>
              <th className="th text-right">Quantity</th>
              <th className="th text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s, i) => (
              <tr key={i} className={`hover:bg-gray-50 ${s.quantity <= s.low_stock_alert ? 'bg-amber-50/30' : ''}`}>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <span className="font-medium">{s.product_name}</span>
                  </div>
                </td>
                <td className="td"><span className="badge-blue">{s.category_name || '—'}</span></td>
                <td className="td text-right font-bold text-gray-900">{s.quantity}</td>
                <td className="td text-right">
                  {s.quantity === 0 ? (
                    <span className="badge-red">Out of Stock</span>
                  ) : s.quantity <= s.low_stock_alert ? (
                    <span className="badge-yellow">Low Stock</span>
                  ) : (
                    <span className="badge-green">In Stock</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-10">No products found</p>}
      </div>
    </div>
  );
}
