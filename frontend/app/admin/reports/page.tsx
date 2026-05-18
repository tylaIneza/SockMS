'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';

export default function AdminReportsPage() {
  const [weekly, setWeekly]         = useState<any>(null);
  const [userReport, setUserReport] = useState<any[]>([]);
  const [tab, setTab]               = useState<'weekly' | 'users'>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadWeekly = (offset: number) => {
    setLoading(true);
    api.get(`/reports/weekly?week_offset=${offset}`)
      .then(r => setWeekly(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/reports/users').then(r => setUserReport(r.data));
    loadWeekly(0);
  }, []);

  useEffect(() => { loadWeekly(weekOffset); }, [weekOffset]);

  const downloadWeeklyPdf = async () => {
    if (!weekly) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF }     = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20); doc.setTextColor(67, 56, 202);
      doc.text('SockMS — Weekly Report', 14, 18);
      doc.setFontSize(11); doc.setTextColor(100, 100, 100);
      doc.text(`Period: ${weekly.period.start}  to  ${weekly.period.end}`, 14, 26);

      // Summary cards as a table
      doc.setFontSize(13); doc.setTextColor(0, 0, 0);
      doc.text('Summary', 14, 36);
      autoTable(doc, {
        startY: 40,
        head: [['Revenue', 'Gross Profit', 'Expenses', 'Net Profit', 'Transactions']],
        body: [[
          fmt(weekly.summary.revenue),
          fmt(weekly.summary.gross_profit),
          fmt(weekly.summary.expenses),
          fmt(weekly.summary.net_profit),
          weekly.summary.sales_count,
        ]],
        headStyles: { fillColor: [67, 56, 202] },
        bodyStyles:  { halign: 'center' },
      });

      // Daily breakdown
      const y1 = (doc as any).lastAutoTable.finalY + 10;
      doc.text('Daily Breakdown', 14, y1);
      autoTable(doc, {
        startY: y1 + 4,
        head: [['Day', 'Revenue', 'Expenses', 'Profit', 'Sales']],
        body: weekly.daily.map((d: any) => [
          d.day_label,
          fmt(d.revenue),
          fmt(d.expenses),
          fmt(d.profit),
          d.sales_count,
        ]),
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      });

      // Top products
      if (weekly.top_products?.length) {
        const y2 = (doc as any).lastAutoTable.finalY + 10;
        doc.text('Top Products', 14, y2);
        autoTable(doc, {
          startY: y2 + 4,
          head: [['Product', 'Units Sold', 'Revenue']],
          body: weekly.top_products.map((p: any) => [p.name, p.qty_sold, fmt(p.revenue)]),
          headStyles: { fillColor: [99, 102, 241] },
          alternateRowStyles: { fillColor: [245, 245, 255] },
        });
      }

      // Expense breakdown
      if (weekly.expense_breakdown?.length) {
        const y3 = (doc as any).lastAutoTable.finalY + 10;
        doc.text('Expense Breakdown', 14, y3);
        autoTable(doc, {
          startY: y3 + 4,
          head: [['Description', 'User', 'Amount']],
          body: weekly.expense_breakdown.map((e: any) => [e.description, e.user_name, fmt(e.amount)]),
          headStyles: { fillColor: [248, 113, 113] },
        });
      }

      doc.save(`SockMS-Weekly-${weekly.period.start}.pdf`);
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  };

  const tabs = [{ id: 'weekly', label: 'Weekly Report' }, { id: 'users', label: 'User Comparison' }] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Business performance analysis</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'weekly' && (
        <div className="space-y-6">
          {/* Week nav + PDF */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost px-3">← Prev</button>
              <span className="text-sm font-medium text-slate-200 min-w-48 text-center">
                {weekly ? `${weekly.period.start} – ${weekly.period.end}` : '...'}
              </span>
              <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                className="btn-ghost px-3 disabled:opacity-40">Next →</button>
            </div>
            <button onClick={downloadWeeklyPdf} disabled={pdfLoading || loading || !weekly} className="btn-primary disabled:opacity-50">
              <Download className="w-4 h-4" />{pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>

          {loading ? (
            <div className="text-slate-500 animate-pulse">Loading report...</div>
          ) : weekly && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Revenue',      value: fmt(weekly.summary.revenue),      bar: 'bg-indigo-500/100' },
                  { label: 'Gross Profit', value: fmt(weekly.summary.gross_profit), bar: 'bg-emerald-500/100' },
                  { label: 'Expenses',     value: fmt(weekly.summary.expenses),     bar: 'bg-red-400' },
                  { label: 'Net Profit',   value: fmt(weekly.summary.net_profit),   bar: parseFloat(weekly.summary.net_profit) >= 0 ? 'bg-blue-500/100' : 'bg-orange-500' },
                ].map(c => (
                  <div key={c.label} className="card p-4">
                    <p className="text-sm text-slate-400">{c.label}</p>
                    <p className="text-xl font-bold text-white mt-1">{c.value}</p>
                    <div className={`h-1 rounded-full mt-3 ${c.bar} opacity-60`} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Daily chart */}
                <div className="xl:col-span-2 card p-5">
                  <h2 className="font-semibold text-white mb-4">Daily Revenue & Expenses</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={weekly.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="revenue"  name="Revenue"  fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="card p-5">
                  <h2 className="font-semibold text-white mb-4">Top Products</h2>
                  {weekly.top_products.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No sales this week</p>
                  ) : (
                    <div className="space-y-2">
                      {weekly.top_products.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-white">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.qty_sold} units sold</p>
                          </div>
                          <span className="text-sm font-bold text-indigo-400">{fmt(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily breakdown table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8">
                  <h2 className="font-semibold text-white">Daily Breakdown</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="thead-dark">
                    <tr>
                      <th className="th">Day</th>
                      <th className="th text-right">Revenue</th>
                      <th className="th text-right">Expenses</th>
                      <th className="th text-right">Gross Profit</th>
                      <th className="th text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-dark">
                    {weekly.daily.map((d: any, i: number) => (
                      <tr key={i} className={`hover:bg-white/5 ${Number(d.revenue) === 0 ? 'opacity-40' : ''}`}>
                        <td className="td font-medium">{d.day_label}</td>
                        <td className="td text-right text-indigo-400 font-medium">{fmt(d.revenue)}</td>
                        <td className="td text-right text-red-500">{fmt(d.expenses)}</td>
                        <td className="td text-right text-emerald-400 font-medium">{fmt(d.profit)}</td>
                        <td className="td text-right text-slate-400">{d.sales_count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-white/10 font-bold">
                    <tr>
                      <td className="td text-slate-200">Week Total</td>
                      <td className="td text-right text-indigo-300">{fmt(weekly.summary.revenue)}</td>
                      <td className="td text-right text-red-600">{fmt(weekly.summary.expenses)}</td>
                      <td className="td text-right text-emerald-700">{fmt(weekly.summary.gross_profit)}</td>
                      <td className="td text-right text-slate-200">{weekly.summary.sales_count}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Expense breakdown */}
              {weekly.expense_breakdown.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-semibold text-white mb-4">Expense Breakdown</h2>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="th pl-0">Description</th><th className="th">User</th><th className="th text-right pr-0">Amount</th></tr></thead>
                    <tbody>
                      {weekly.expense_breakdown.map((ex: any, i: number) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="td pl-0">{ex.description}</td>
                          <td className="td text-slate-400">{ex.user_name}</td>
                          <td className="td text-right pr-0 text-red-600 font-medium">{fmt(ex.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {userReport.map((b: any) => (
              <div key={b.user_id} className="card p-5 space-y-3">
                <h3 className="font-semibold text-white">{b.user_name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Revenue</span><span className="font-medium text-indigo-400">{fmt(b.revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Gross Profit</span><span className="font-medium text-emerald-400">{fmt(b.gross_profit)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Expenses</span><span className="font-medium text-red-500">{fmt(b.expenses)}</span></div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium text-slate-200">Net Profit</span>
                    <span className={`font-bold ${parseFloat(b.net_profit) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(b.net_profit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500"><span>{b.sales_count} sales</span><span>{b.user_count} users</span></div>
                </div>
              </div>
            ))}
          </div>

          {userReport.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-white mb-4">User Revenue Comparison (All Time)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={userReport}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="user_name" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue"      name="Revenue"      fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="gross_profit" name="Gross Profit" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses"     name="Expenses"     fill="#f87171" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
