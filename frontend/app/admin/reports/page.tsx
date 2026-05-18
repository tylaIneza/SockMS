'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, BarChart2, DollarSign, ShoppingBag } from 'lucide-react';

const BG     = '#07071a';
const CARD   = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl"
      style={{ background: '#1a1a3e', border: '1px solid rgba(255,255,255,0.12)' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

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
      doc.setFontSize(20); doc.setTextColor(67, 56, 202);
      doc.text('SockMS — Weekly Report', 14, 18);
      doc.setFontSize(11); doc.setTextColor(100, 100, 100);
      doc.text(`Period: ${weekly.period.start}  to  ${weekly.period.end}`, 14, 26);
      doc.setFontSize(13); doc.setTextColor(0, 0, 0);
      doc.text('Summary', 14, 36);
      autoTable(doc, {
        startY: 40,
        head: [['Revenue', 'Expenses', 'Transactions']],
        body: [[fmt(weekly.summary.revenue), fmt(weekly.summary.expenses), weekly.summary.sales_count]],
        headStyles: { fillColor: [67, 56, 202] }, bodyStyles: { halign: 'center' },
      });
      const y1 = (doc as any).lastAutoTable.finalY + 10;
      doc.text('Daily Breakdown', 14, y1);
      autoTable(doc, {
        startY: y1 + 4,
        head: [['Day', 'Revenue', 'Expenses', 'Sales']],
        body: weekly.daily.map((d: any) => [d.day_label, fmt(d.revenue), fmt(d.expenses), d.sales_count]),
        headStyles: { fillColor: [16, 185, 129] }, alternateRowStyles: { fillColor: [240, 253, 244] },
      });
      if (weekly.top_products?.length) {
        const y2 = (doc as any).lastAutoTable.finalY + 10;
        doc.text('Top Products', 14, y2);
        autoTable(doc, {
          startY: y2 + 4,
          head: [['Product', 'Units Sold', 'Revenue']],
          body: weekly.top_products.map((p: any) => [p.name, p.qty_sold, fmt(p.revenue)]),
          headStyles: { fillColor: [99, 102, 241] }, alternateRowStyles: { fillColor: [245, 245, 255] },
        });
      }
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

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── page header ── */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Reports</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Business performance analysis</p>
            </div>
          </div>
        </div>

        {/* pill tabs */}
        <div className="tabs mt-4">
          {([
            { id: 'weekly', label: 'Weekly Report' },
            { id: 'users',  label: 'User Comparison' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`tab ${tab === t.id ? 'tab-active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* ── WEEKLY tab ── */}
        {tab === 'weekly' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost px-3">← Prev</button>
                <span className="text-sm font-semibold text-white min-w-48 text-center">
                  {weekly ? `${weekly.period.start} – ${weekly.period.end}` : '…'}
                </span>
                <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                  className="btn-ghost px-3 disabled:opacity-40">Next →</button>
              </div>
              <button onClick={downloadWeeklyPdf} disabled={pdfLoading || loading || !weekly}
                className="btn-primary disabled:opacity-50">
                <Download className="w-4 h-4" />{pdfLoading ? 'Generating…' : 'Download PDF'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm animate-pulse" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading report…</p>
              </div>
            ) : weekly && (
              <>
                {/* summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Revenue',  value: fmt(weekly.summary.revenue),  icon: DollarSign,  gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', glow: '0 0 20px rgba(99,102,241,0.4)' },
                    { label: 'Expenses', value: fmt(weekly.summary.expenses), icon: ShoppingBag, gradient: 'linear-gradient(135deg,#f97316,#dc2626)',   glow: '0 0 20px rgba(249,115,22,0.4)' },
                  ].map(c => (
                    <div key={c.label} className="rounded-2xl p-5 flex flex-col gap-3"
                      style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: c.gradient, boxShadow: c.glow }}>
                          <c.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-right"
                          style={{ color: 'rgba(255,255,255,0.3)' }}>{c.label}</p>
                      </div>
                      <p className="text-xl font-black text-white">{c.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* daily chart */}
                  <div className="xl:col-span-2 rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <h2 className="font-bold text-white mb-1">Daily Revenue &amp; Expenses</h2>
                    <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>Revenue vs expenses per day</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={weekly.daily} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16, color: 'rgba(255,255,255,0.5)' }} />
                        <Bar dataKey="revenue"  name="Revenue"  fill="#6366f1" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* top products */}
                  <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <h2 className="font-bold text-white mb-0.5">Top Products</h2>
                    <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>This week by revenue</p>
                    {weekly.top_products.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <ShoppingBag className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No sales this week</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {weekly.top_products.map((p: any, i: number) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          const pct = Math.round((p.revenue / weekly.top_products[0].revenue) * 100);
                          return (
                            <div key={i} className="rounded-xl px-3 py-2.5 transition-colors"
                              style={{ background: i === 0 ? 'rgba(99,102,241,0.10)' : 'transparent' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                              onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(99,102,241,0.10)' : 'transparent')}>
                              <div className="flex items-center gap-3">
                                <span className="text-base w-5 text-center shrink-0">{medals[i] ?? i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                                    </div>
                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.qty_sold} units</span>
                                  </div>
                                </div>
                                <span className="text-sm font-black shrink-0" style={{ color: '#818cf8' }}>{fmt(p.revenue)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* daily breakdown table */}
                <div className="card overflow-hidden">
                  <div className="section-header">
                    <div>
                      <p className="section-title">Daily Breakdown</p>
                      <p className="section-sub">{weekly.summary.sales_count} total transactions</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="thead-dark">
                        <tr>
                          <th className="th">Day</th>
                          <th className="th text-right">Revenue</th>
                          <th className="th text-right">Expenses</th>
                          <th className="th text-right">Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-dark">
                        {weekly.daily.map((d: any, i: number) => (
                          <tr key={i} className="tr-hover" style={{ opacity: Number(d.revenue) === 0 ? 0.4 : 1 }}>
                            <td className="td font-semibold text-white">{d.day_label}</td>
                            <td className="td text-right text-indigo-400 font-semibold">{fmt(d.revenue)}</td>
                            <td className="td text-right text-red-400">{fmt(d.expenses)}</td>
                            <td className="td text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.sales_count}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot style={{ borderTop: `2px solid ${BORDER}` }}>
                        <tr>
                          <td className="td font-bold text-white">Week Total</td>
                          <td className="td text-right font-bold text-indigo-300">{fmt(weekly.summary.revenue)}</td>
                          <td className="td text-right font-bold text-red-400">{fmt(weekly.summary.expenses)}</td>
                          <td className="td text-right font-bold text-white">{weekly.summary.sales_count}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* expense breakdown */}
                {weekly.expense_breakdown.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="section-header">
                      <div>
                        <p className="section-title">Expense Breakdown</p>
                        <p className="section-sub">{weekly.expense_breakdown.length} items</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="thead-dark">
                          <tr>
                            <th className="th">Description</th>
                            <th className="th">User</th>
                            <th className="th text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-dark">
                          {weekly.expense_breakdown.map((ex: any, i: number) => (
                            <tr key={i} className="tr-hover">
                              <td className="td font-semibold text-white">{ex.description}</td>
                              <td className="td" style={{ color: 'rgba(255,255,255,0.45)' }}>{ex.user_name}</td>
                              <td className="td text-right font-bold text-red-400">{fmt(ex.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── USERS tab ── */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {userReport.map((b: any) => (
                <div key={b.user_id} className="rounded-2xl p-5 space-y-3"
                  style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {b.user_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white leading-none">{b.user_name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{b.sales_count} sales</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm pt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <div className="flex justify-between pt-2">
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>Revenue</span>
                      <span className="font-semibold text-indigo-400">{fmt(b.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>Expenses</span>
                      <span className="font-semibold text-red-400">{fmt(b.expenses)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {userReport.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <h2 className="font-bold text-white mb-1">User Revenue Comparison</h2>
                <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>All-time performance by user</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={userReport} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="user_name" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16, color: 'rgba(255,255,255,0.5)' }} />
                    <Bar dataKey="revenue"  name="Revenue"  fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
