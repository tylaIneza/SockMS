'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BranchReportsPage() {
  const [weekly, setWeekly]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const loadWeekly = (offset: number) => {
    setLoading(true);
    api.get(`/reports/weekly?week_offset=${offset}`)
      .then(r => setWeekly(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWeekly(0); }, []);
  useEffect(() => { loadWeekly(weekOffset); }, [weekOffset]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Report</h1>
        <p className="text-slate-400 text-sm mt-1">Your branch performance</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost px-3">← Prev Week</button>
        <span className="text-sm font-medium text-slate-200 min-w-40 text-center">
          {weekly ? `${weekly.period.start} – ${weekly.period.end}` : '...'}
        </span>
        <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0} className="btn-ghost px-3 disabled:opacity-40">Next Week →</button>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Loading report...</div>
      ) : weekly && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Revenue',      value: fmt(weekly.summary.revenue),      cls: 'text-indigo-300' },
              { label: 'Gross Profit', value: fmt(weekly.summary.gross_profit), cls: 'text-emerald-700' },
              { label: 'Expenses',     value: fmt(weekly.summary.expenses),     cls: 'text-red-600' },
              { label: 'Net Profit',   value: fmt(weekly.summary.net_profit),   cls: parseFloat(weekly.summary.net_profit) >= 0 ? 'text-blue-300' : 'text-orange-600' },
            ].map(c => (
              <div key={c.label} className="card p-4">
                <p className="text-sm text-slate-400">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.cls}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
                        <p className="text-xs text-slate-500">{p.qty_sold} sold</p>
                      </div>
                      <span className="text-sm font-bold text-indigo-400">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {weekly.expense_breakdown.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-white mb-4">Expenses This Week</h2>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="th pl-0">Description</th><th className="th text-right pr-0">Amount</th></tr></thead>
                <tbody>
                  {weekly.expense_breakdown.map((ex: any, i: number) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="td pl-0">{ex.description}</td>
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
  );
}
