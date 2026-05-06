'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt, getUser } from '@/lib/auth';
import { DollarSign, TrendingUp, ShoppingBag, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function StatCard({ label, value, sub, icon: Icon, iconBg, valueColor = 'text-gray-900' }: any) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function BranchDashboard() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-72 bg-gray-200 rounded-xl" />
    </div>
  );

  if (!data) return null;

  const netProfitWeek = parseFloat(data.this_week.profit) - parseFloat(data.this_week.expenses);
  const isNetPositive = netProfitWeek >= 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome back, <span className="font-medium text-gray-700">{user?.name}</span></p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Revenue"
          value={fmt(data.today.revenue)}
          sub={`${data.today.sales_count} transaction${data.today.sales_count !== 1 ? 's' : ''} today`}
          icon={DollarSign}
          iconBg="bg-indigo-500"
        />
        <StatCard
          label="This Week Revenue"
          value={fmt(data.this_week.revenue)}
          sub={`Gross profit: ${fmt(data.this_week.profit)}`}
          icon={ShoppingBag}
          iconBg="bg-blue-500"
        />
        <StatCard
          label="This Week Net Profit"
          value={fmt(netProfitWeek)}
          sub={`Expenses deducted: ${fmt(data.this_week.expenses)}`}
          icon={TrendingUp}
          iconBg={isNetPositive ? 'bg-emerald-500' : 'bg-orange-500'}
          valueColor={isNetPositive ? 'text-emerald-700' : 'text-orange-600'}
        />
      </div>

      {/* Chart + Top products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Weekly Revenue</h2>
          <p className="text-xs text-gray-400 mb-4">Last 8 weeks</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.weekly_chart} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="profit"  name="Profit"  fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Top Products</h2>
          <p className="text-xs text-gray-400 mb-4">This week</p>
          {data.top_products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <p className="text-sm text-gray-400">No sales this week</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.top_products.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-indigo-100 text-indigo-700' : i === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.qty_sold} units</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 shrink-0 ml-2">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {data.low_stock.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Low Stock Alerts</h2>
            <span className="badge-yellow ml-1">{data.low_stock.length} item{data.low_stock.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.low_stock.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Alert threshold: {item.low_stock_alert} units</p>
                </div>
                <div className="text-right ml-3">
                  <span className="badge-red text-sm font-bold">{item.quantity}</span>
                  <p className="text-xs text-gray-400 mt-0.5">remaining</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
