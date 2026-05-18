'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fmt, getUser } from '@/lib/auth';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingBag,
  AlertTriangle, Package, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const BG  = '#07071a';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, sub, icon: Icon, gradient, glow }: any) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: gradient, boxShadow: glow }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-right"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          {label}
        </p>
      </div>
      <div>
        <p className="text-2xl font-black text-white leading-none">{value}</p>
        {sub && <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
      </div>
    </div>
  );
}

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl" style={{ background: '#1a1a3e', border: '1px solid rgba(255,255,255,0.12)' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function BranchDashboard() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const user = getUser();

  useEffect(() => {
    setMounted(true);
    api.get('/reports/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: BG }}>
      <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading dashboard…</p>
    </div>
  );

  if (!data) return null;

  const netProfit = parseFloat(data.this_week.profit) - parseFloat(data.this_week.expenses);
  const isNetPos  = netProfit >= 0;
  const txns      = data.today.sales_count;

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── header ── */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div
          className="flex items-start justify-between flex-wrap gap-4"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(129,140,248,0.8)' }}>
              {greeting()}
            </p>
            <h1 className="text-2xl font-black text-white">{user?.name} 👋</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-300">Branch online</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* ── stat cards ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s' }}
        >
          <StatCard
            label="Today's Revenue"
            value={fmt(data.today.revenue)}
            sub={`${txns} transaction${txns !== 1 ? 's' : ''} today`}
            icon={DollarSign}
            gradient="linear-gradient(135deg,#6366f1,#8b5cf6)"
            glow="0 0 24px rgba(99,102,241,0.5)"
          />
          <StatCard
            label="Week Revenue"
            value={fmt(data.this_week.revenue)}
            sub={`Gross profit: ${fmt(data.this_week.profit)}`}
            icon={ShoppingBag}
            gradient="linear-gradient(135deg,#06b6d4,#0284c7)"
            glow="0 0 24px rgba(6,182,212,0.45)"
          />
          <StatCard
            label="Net Profit"
            value={fmt(netProfit)}
            sub={`After expenses: ${fmt(data.this_week.expenses)}`}
            icon={isNetPos ? TrendingUp : TrendingDown}
            gradient={isNetPos ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#f97316,#dc2626)'}
            glow={isNetPos ? '0 0 24px rgba(16,185,129,0.45)' : '0 0 24px rgba(249,115,22,0.45)'}
          />
        </div>

        {/* ── chart + top products ── */}
        <div
          className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s' }}
        >
          <div className="xl:col-span-2 rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-white">Weekly Revenue</h2>
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                Last 8 weeks
              </span>
            </div>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>Revenue vs. profit trend</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.weekly_chart} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16, color: 'rgba(255,255,255,0.5)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit"  name="Profit"  fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h2 className="font-bold text-white mb-0.5">Top Products</h2>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>This week by revenue</p>
            {data.top_products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <ShoppingBag className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No sales this week</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.top_products.map((p: any, i: number) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const pct = Math.round((p.revenue / data.top_products[0].revenue) * 100);
                  return (
                    <div key={i} className="group rounded-xl px-3 py-2.5 transition-colors"
                      style={{ background: i === 0 ? 'rgba(99,102,241,0.10)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(99,102,241,0.10)' : 'transparent')}
                    >
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

        {/* ── low stock ── */}
        {data.low_stock.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)',
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.6s ease 0.3s',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)' }}>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">Low Stock Alerts</h2>
                <p className="text-xs text-amber-400/70">
                  {data.low_stock.length} item{data.low_stock.length !== 1 ? 's' : ''} need restocking
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {data.low_stock.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)' }}>
                    <Package className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs mt-0.5 text-amber-400/60">Min: {item.low_stock_alert} units</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-red-400 leading-none">{item.quantity}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>left</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
