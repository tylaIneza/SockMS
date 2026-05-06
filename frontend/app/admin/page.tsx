'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { TrendingUp, DollarSign, ShoppingCart, AlertTriangle, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading dashboard...</div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">All branches overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="All-Time Revenue"  value={fmt(data.all_time.revenue)}  sub={`${data.all_time.sales_count} sales`}           icon={DollarSign}  color="bg-indigo-500" />
        <StatCard label="All-Time Profit"   value={fmt(data.all_time.profit)}   sub={`Expenses: ${fmt(data.all_time.expenses)}`}     icon={TrendingUp}  color="bg-emerald-500" />
        <StatCard label="Today Revenue"     value={fmt(data.today.revenue)}     sub={`Profit: ${fmt(data.today.profit)}`}            icon={ShoppingCart} color="bg-blue-500" />
        <StatCard label="This Week Revenue" value={fmt(data.this_week.revenue)} sub={`Net: ${fmt(parseFloat(data.this_week.profit) - parseFloat(data.this_week.expenses))}`} icon={TrendingUp} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <div className="xl:col-span-2 card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Weekly Revenue & Profit</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.weekly_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="profit"  name="Profit"  fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Branch Summary */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Branch Performance</h2>
          <div className="space-y-3">
            {data.branch_summary.map((b: any) => (
              <div key={b.branch_name} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-800">{b.branch_name}</span>
                  <span className="text-xs text-gray-500">{b.sales_count} sales</span>
                </div>
                <p className="text-sm font-bold text-indigo-600">{fmt(b.revenue)}</p>
                <p className="text-xs text-emerald-600">Profit: {fmt(b.profit)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Products This Week</h2>
          {data.top_products.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No sales this week</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="th pl-0">Product</th><th className="th text-right">Qty</th><th className="th text-right">Revenue</th></tr></thead>
              <tbody>
                {data.top_products.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="td pl-0 font-medium">{p.name}</td>
                    <td className="td text-right">{p.qty_sold}</td>
                    <td className="td text-right text-indigo-600 font-medium">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-800">Low Stock Alerts</h2>
          </div>
          {data.low_stock.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6 flex flex-col items-center gap-2">
              <Package className="w-8 h-8 text-gray-300" />
              All stock levels OK
            </p>
          ) : (
            <div className="space-y-2">
              {data.low_stock.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.branch_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge-red text-xs">{item.quantity} left</span>
                    <p className="text-xs text-gray-400 mt-0.5">Alert: {item.low_stock_alert}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
