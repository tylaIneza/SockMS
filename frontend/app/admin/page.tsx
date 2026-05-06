'use client';
import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { ChevronLeft, ChevronRight, Download, AlertTriangle, TrendingUp, TrendingDown, ShoppingBag, DollarSign, Hash } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [date, setDate]           = useState(today());
  const [data, setData]           = useState<any>(null);
  const [lowStock, setLowStock]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback((d: string) => {
    setLoading(true);
    Promise.all([
      api.get(`/reports/daily?date=${d}`),
      api.get('/reports/dashboard'),
    ]).then(([daily, dash]) => {
      setData(daily.data);
      setLowStock(dash.data.low_stock || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(date); }, [date]);

  const branchNames: string[] = (data?.branches || []).map((b: any) => b.branch_name);

  // Pivot: product → { branchName: { qty, revenue, profit } }
  const productPivot: any[] = (() => {
    if (!data?.products?.length) return [];
    const map: Record<string, any> = {};
    for (const row of data.products) {
      if (!map[row.product_name]) {
        map[row.product_name] = { product_name: row.product_name, category_name: row.category_name, branches: {} };
      }
      map[row.product_name].branches[row.branch_name] = {
        qty: Number(row.qty_sold), revenue: Number(row.revenue), profit: Number(row.profit),
      };
    }
    return Object.values(map).map(p => {
      const totalQty = branchNames.reduce((s, b) => s + (p.branches[b]?.qty || 0), 0);
      const totalRev = branchNames.reduce((s, b) => s + (p.branches[b]?.revenue || 0), 0);
      return { ...p, totalQty, totalRev };
    }).sort((a, b) => b.totalRev - a.totalRev);
  })();

  // Totals
  const totalItemsSold  = productPivot.reduce((s, p) => s + p.totalQty, 0);
  const totalRevenue    = (data?.branches || []).reduce((s: number, b: any) => s + Number(b.revenue), 0);
  const totalTxns       = (data?.branches || []).reduce((s: number, b: any) => s + Number(b.sales_count), 0);

  const downloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF }     = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(18); doc.setTextColor(67, 56, 202);
      doc.text('SockMS — Daily Report', 14, 18);
      doc.setFontSize(11); doc.setTextColor(100, 100, 100);
      doc.text(fmtDate(data.date), 14, 26);
      doc.setFontSize(10); doc.setTextColor(60, 60, 60);
      doc.text(`Total Items Sold: ${totalItemsSold}   |   Total Revenue: ${fmt(totalRevenue)}   |   Transactions: ${totalTxns}`, 14, 33);

      doc.setFontSize(13); doc.setTextColor(0, 0, 0);
      doc.text('Branch Comparison', 14, 42);
      autoTable(doc, {
        startY: 46,
        head: [['Branch', 'Revenue', 'Gross Profit', 'Expenses', 'Net Profit', 'Sales']],
        body: data.branches.map((b: any) => [b.branch_name, fmt(b.revenue), fmt(b.gross_profit), fmt(b.expenses), fmt(b.net_profit), b.sales_count]),
        headStyles: { fillColor: [67, 56, 202] },
        alternateRowStyles: { fillColor: [245, 245, 255] },
      });

      const y1 = (doc as any).lastAutoTable.finalY + 10;
      doc.text('Products Sold', 14, y1);
      autoTable(doc, {
        startY: y1 + 4,
        head: [['Product', 'Category', ...branchNames.flatMap(b => [`${b} Qty`, `${b} Revenue`]), 'Total Qty', 'Total Revenue']],
        body: [
          ...productPivot.map(p => [
            p.product_name, p.category_name,
            ...branchNames.flatMap(b => [p.branches[b]?.qty || '—', p.branches[b] ? fmt(p.branches[b].revenue) : '—']),
            p.totalQty, fmt(p.totalRev),
          ]),
          ['TOTALS', '',
            ...branchNames.flatMap(b => {
              const br = data.branches.find((x: any) => x.branch_name === b);
              const qty = productPivot.reduce((s, p) => s + (p.branches[b]?.qty || 0), 0);
              return [qty, br ? fmt(br.revenue) : '—'];
            }),
            totalItemsSold, fmt(totalRevenue),
          ],
        ],
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        bodyStyles: { fontSize: 9 },
      });

      doc.save(`SockMS-Daily-${data.date}.pdf`);
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">{fmtDate(date)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setDate(d => addDays(d, -1))} className="btn-ghost px-2.5 py-2"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setDate(today())} disabled={date === today()} className="btn-ghost px-3 py-2 text-sm disabled:opacity-40">Today</button>
          <button onClick={() => setDate(d => addDays(d, 1))} disabled={date === today()} className="btn-ghost px-2.5 py-2 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          <input type="date" className="input text-sm" value={date} max={today()} onChange={e => setDate(e.target.value)} />
          <button onClick={downloadPdf} disabled={pdfLoading || loading || !data} className="btn-primary disabled:opacity-50">
            <Download className="w-4 h-4" />{pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 animate-pulse py-10 text-center">Loading report...</div>
      ) : !data ? null : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalTxns} transaction{totalTxns !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Items Sold</p>
                <p className="text-2xl font-bold text-gray-900">{totalItemsSold.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{productPivot.length} product type{productPivot.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Branches</p>
                <p className="text-2xl font-bold text-gray-900">{data.branches.filter((b: any) => Number(b.sales_count) > 0).length} / {data.branches.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">had sales today</p>
              </div>
            </div>
          </div>

          {/* Branch comparison cards */}
          <div className={`grid gap-4 ${data.branches.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
            {data.branches.map((b: any, i: number) => {
              const isProfit = Number(b.net_profit) >= 0;
              return (
                <div key={b.branch_id} className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                      <h3 className="font-bold text-gray-900 text-lg">{b.branch_name}</h3>
                    </div>
                    <span className="badge-blue">{b.sales_count} sales</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-xs text-indigo-600 font-medium">Revenue</p>
                      <p className="text-lg font-bold text-indigo-700 mt-0.5">{fmt(b.revenue)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-emerald-600 font-medium">Gross Profit</p>
                      <p className="text-lg font-bold text-emerald-700 mt-0.5">{fmt(b.gross_profit)}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-xs text-red-500 font-medium">Expenses</p>
                      <p className="text-lg font-bold text-red-600 mt-0.5">{fmt(b.expenses)}</p>
                    </div>
                    <div className={`${isProfit ? 'bg-blue-50' : 'bg-orange-50'} rounded-xl p-3`}>
                      <div className="flex items-center gap-1">
                        {isProfit ? <TrendingUp className="w-3 h-3 text-blue-500" /> : <TrendingDown className="w-3 h-3 text-orange-500" />}
                        <p className={`text-xs font-medium ${isProfit ? 'text-blue-600' : 'text-orange-600'}`}>Net Profit</p>
                      </div>
                      <p className={`text-lg font-bold mt-0.5 ${isProfit ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(b.net_profit)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          {data.branches.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Branch Comparison — {date}</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.branches}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="branch_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue"      name="Revenue"      fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="gross_profit" name="Gross Profit" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses"     name="Expenses"     fill="#f87171" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Products table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Products Sold</h2>
              {productPivot.length === 0 && <span className="text-gray-400 text-sm">No sales on this date</span>}
            </div>
            {productPivot.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="th">Product</th>
                      <th className="th">Category</th>
                      {branchNames.map(b => (
                        <React.Fragment key={b}>
                          <th className="th text-right text-indigo-600" colSpan={2}>{b}</th>
                        </React.Fragment>
                      ))}
                      <th className="th text-right">Total Qty</th>
                      <th className="th text-right">Total Revenue</th>
                    </tr>
                    <tr className="bg-gray-50 text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2" /><th className="pb-2" />
                      {branchNames.map(b => (
                        <React.Fragment key={b}>
                          <th className="th text-right pb-2 font-normal">Qty</th>
                          <th className="th text-right pb-2 font-normal">Revenue</th>
                        </React.Fragment>
                      ))}
                      <th className="pb-2" /><th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productPivot.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="td font-medium">{p.product_name}</td>
                        <td className="td"><span className="badge-blue">{p.category_name}</span></td>
                        {branchNames.map(b => (
                          <React.Fragment key={b}>
                            <td className="td text-right text-gray-700">{p.branches[b]?.qty ?? <span className="text-gray-300">—</span>}</td>
                            <td className="td text-right text-indigo-600 font-medium">{p.branches[b] ? fmt(p.branches[b].revenue) : <span className="text-gray-300">—</span>}</td>
                          </React.Fragment>
                        ))}
                        <td className="td text-right font-bold text-gray-800">{p.totalQty}</td>
                        <td className="td text-right font-bold text-indigo-700">{fmt(p.totalRev)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50 border-t-2 border-indigo-200">
                    <tr>
                      <td className="td font-bold text-indigo-800" colSpan={2}>Totals</td>
                      {branchNames.map(b => {
                        const br   = data.branches.find((x: any) => x.branch_name === b);
                        const qty  = productPivot.reduce((s, p) => s + (p.branches[b]?.qty || 0), 0);
                        return (
                          <React.Fragment key={b}>
                            <td className="td text-right font-bold text-indigo-800">{qty}</td>
                            <td className="td text-right font-bold text-indigo-700">{br ? fmt(br.revenue) : '—'}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="td text-right font-bold text-indigo-900">{totalItemsSold}</td>
                      <td className="td text-right font-bold text-indigo-900">{fmt(totalRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Low stock */}
          {lowStock.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-gray-800">Low Stock Alerts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lowStock.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.branch_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="badge-red">{item.quantity} left</span>
                      <p className="text-xs text-gray-400 mt-0.5">Alert: {item.low_stock_alert}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
