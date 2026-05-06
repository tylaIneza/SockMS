'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Download } from 'lucide-react';

export default function AdminReportsPage() {
  const [weekly, setWeekly]   = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchReport, setBranchReport] = useState<any[]>([]);
  const [tab, setTab]         = useState<'weekly' | 'branches'>('weekly');
  const [loading, setLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState(0);

  const loadWeekly = (offset: number) => {
    setLoading(true);
    api.get(`/reports/weekly?week_offset=${offset}`)
      .then(r => setWeekly(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/branches').then(r => setBranches(r.data));
    api.get('/reports/branches').then(r => setBranchReport(r.data));
    loadWeekly(0);
  }, []);

  useEffect(() => { loadWeekly(weekOffset); }, [weekOffset]);

  const tabs = [{ id: 'weekly', label: 'Weekly Report' }, { id: 'branches', label: 'Branch Comparison' }] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Business performance analysis</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'weekly' && (
        <div className="space-y-6">
          {/* Week selector */}
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost px-3">← Prev Week</button>
            <span className="text-sm font-medium text-gray-700 min-w-40 text-center">
              {weekly ? `${weekly.period.start} – ${weekly.period.end}` : '...'}
            </span>
            <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0} className="btn-ghost px-3 disabled:opacity-40">Next Week →</button>
          </div>

          {loading ? (
            <div className="text-gray-400 animate-pulse">Loading report...</div>
          ) : weekly && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Revenue',      value: fmt(weekly.summary.revenue),      color: 'bg-indigo-500' },
                  { label: 'Gross Profit', value: fmt(weekly.summary.gross_profit), color: 'bg-emerald-500' },
                  { label: 'Expenses',     value: fmt(weekly.summary.expenses),     color: 'bg-red-400' },
                  { label: 'Net Profit',   value: fmt(weekly.summary.net_profit),   color: parseFloat(weekly.summary.net_profit) >= 0 ? 'bg-blue-500' : 'bg-orange-500' },
                ].map(c => (
                  <div key={c.label} className="card p-4">
                    <p className="text-sm text-gray-500">{c.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
                    <div className={`h-1 rounded-full mt-3 ${c.color} opacity-60`} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Daily chart */}
                <div className="xl:col-span-2 card p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Daily Revenue & Expenses</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={weekly.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day_label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="revenue"  name="Revenue"  fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Top Products</h2>
                  {weekly.top_products.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No sales this week</p>
                  ) : (
                    <div className="space-y-2">
                      {weekly.top_products.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.qty_sold} units sold</p>
                          </div>
                          <span className="text-sm font-bold text-indigo-600">{fmt(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expense breakdown */}
              {weekly.expense_breakdown.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Expense Breakdown</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="th pl-0">Description</th><th className="th">Branch</th><th className="th text-right pr-0">Amount</th></tr></thead>
                      <tbody>
                        {weekly.expense_breakdown.map((ex: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="td pl-0">{ex.description}</td>
                            <td className="td text-gray-500">{ex.branch_name}</td>
                            <td className="td text-right pr-0 text-red-600 font-medium">{fmt(ex.amount)}</td>
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

      {tab === 'branches' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branchReport.map((b: any) => (
              <div key={b.branch_id} className="card p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">{b.branch_name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="font-medium text-indigo-600">{fmt(b.revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Gross Profit</span><span className="font-medium text-emerald-600">{fmt(b.gross_profit)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Expenses</span><span className="font-medium text-red-500">{fmt(b.expenses)}</span></div>
                  <div className="flex justify-between pt-2 border-t"><span className="font-medium text-gray-700">Net Profit</span><span className={`font-bold ${parseFloat(b.net_profit) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(b.net_profit)}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>{b.sales_count} sales</span><span>{b.user_count} users</span></div>
                </div>
              </div>
            ))}
          </div>

          {branchReport.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Branch Revenue Comparison (All Time)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={branchReport}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="branch_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue"     name="Revenue"     fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="gross_profit" name="Gross Profit" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses"    name="Expenses"    fill="#f87171" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
