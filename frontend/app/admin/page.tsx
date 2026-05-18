'use client';
import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import {
  ChevronLeft, ChevronRight, Download, AlertTriangle,
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Calendar, Loader2, GitBranch, Package, BarChart3,
  ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const C = {
  bg:     '#07071a',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.35)',
  dim:    'rgba(255,255,255,0.18)',
};

const BRANCH_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'];

function today() { return new Date().toISOString().slice(0,10); }
function fmtShort(d: string) {
  return new Date(d+'T00:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
function addDays(d: string, n: number) {
  const dt = new Date(d+'T00:00:00'); dt.setDate(dt.getDate()+n);
  return dt.toISOString().slice(0,10);
}

/* ─── Stat card ─────────────────────────────────────────────────── */
function KPI({ label, value, sub, icon: Icon, accent, positive }: any) {
  return (
    <div className="relative rounded-2xl p-5 overflow-hidden group cursor-default"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      {/* accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: accent }} />
      {/* glow bg */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${accent}12 0%, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}18` }}>
            <Icon className="w-4.5 h-4.5" style={{ width:18, height:18, color: accent }} />
          </div>
          {positive !== undefined && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: positive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                       color: positive ? '#34d399' : '#f87171' }}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {positive ? 'Profit' : 'Loss'}
            </div>
          )}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: C.muted }}>{label}</p>
        <p className="text-2xl font-black text-white leading-none tracking-tight">{value}</p>
        {sub && <p className="text-xs mt-1.5" style={{ color: C.dim }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Tooltip ────────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl text-xs"
      style={{ background:'#13132e', border:'1px solid rgba(255,255,255,0.12)', minWidth:160 }}>
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background:p.fill||p.stroke }} />
            <span style={{ color: C.muted }}>{p.name}</span>
          </div>
          <span className="font-bold text-white">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Main ───────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [date, setDate]         = useState(today());
  const [data, setData]         = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [pdfLoad, setPdfLoad]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  const load = useCallback((d: string) => {
    setLoading(true);
    Promise.all([api.get(`/reports/daily?date=${d}`), api.get('/reports/dashboard')])
      .then(([daily, dash]) => { setData(daily.data); setLowStock(dash.data.low_stock||[]); })
      .catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ setMounted(true); },[]);
  useEffect(()=>{ load(date); },[date]);

  const branchNames: string[] = (data?.branches||[]).map((b:any)=>b.branch_name);

  const pivot: any[] = (() => {
    if (!data?.products?.length) return [];
    const map: Record<string,any> = {};
    for (const row of data.products) {
      if (!map[row.product_name])
        map[row.product_name] = { name:row.product_name, cat:row.category_name, br:{} };
      map[row.product_name].br[row.branch_name] = { qty:+row.qty_sold, rev:+row.revenue };
    }
    return Object.values(map).map(p=>({
      ...p,
      qty: branchNames.reduce((s,b)=>s+(p.br[b]?.qty||0),0),
      rev: branchNames.reduce((s,b)=>s+(p.br[b]?.rev||0),0),
    })).sort((a,b)=>b.rev-a.rev);
  })();

  const totalRev    = (data?.branches||[]).reduce((s:number,b:any)=>s+Number(b.revenue),0);
  const totalTxns   = (data?.branches||[]).reduce((s:number,b:any)=>s+Number(b.sales_count),0);
  const totalProfit = (data?.branches||[]).reduce((s:number,b:any)=>s+Number(b.net_profit),0);
  const totalQty    = pivot.reduce((s,p)=>s+p.qty,0);
  const maxRev      = Math.max(...pivot.map(p=>p.rev), 1);

  const downloadPdf = async () => {
    if (!data) return; setPdfLoad(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation:'landscape' });
      doc.setFontSize(18); doc.setTextColor(67,56,202);
      doc.text('Daily Report — Tyla & Newgen', 14, 18);
      doc.setFontSize(11); doc.setTextColor(100);
      doc.text(fmtShort(data.date), 14, 26);
      autoTable(doc, {
        startY:30,
        head:[['Branch','Revenue','Gross Profit','Expenses','Net Profit','Sales']],
        body:data.branches.map((b:any)=>[b.branch_name,fmt(b.revenue),fmt(b.gross_profit),fmt(b.expenses),fmt(b.net_profit),b.sales_count]),
        headStyles:{fillColor:[67,56,202]},
      });
      const y1 = (doc as any).lastAutoTable.finalY+8;
      autoTable(doc, {
        startY:y1,
        head:[['#','Product','Cat',...branchNames.flatMap(b=>[b+' Qty',b+' Rev']),'Total Qty','Total Rev']],
        body:pivot.map((p,i)=>[i+1,p.name,p.cat,...branchNames.flatMap(b=>[p.br[b]?.qty||'—',p.br[b]?fmt(p.br[b].rev):'—']),p.qty,fmt(p.rev)]),
        headStyles:{fillColor:[16,185,129]}, bodyStyles:{fontSize:8},
      });
      doc.save(`Report-${data.date}.pdf`);
    } catch(e){console.error(e);}
    finally{setPdfLoad(false);}
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* ══════════ HEADER ══════════ */}
      <div className="px-7 py-5 flex flex-wrap items-center justify-between gap-3"
        style={{ borderBottom:`1px solid ${C.border}`, opacity:mounted?1:0, transition:'opacity 0.5s' }}>
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Admin Dashboard</span>
            </div>
            <h1 className="text-xl font-black text-white leading-none">Daily Report</h1>
          </div>
          {/* date nav */}
          <div className="flex items-center gap-1 rounded-xl px-1 py-1 ml-4"
            style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}` }}>
            <button onClick={()=>setDate(d=>addDays(d,-1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
              style={{}} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-semibold text-white">{fmtShort(date)}</span>
            <button onClick={()=>setDate(d=>addDays(d,1))} disabled={date===today()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-30"
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{color:C.muted}}/>
            <input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg text-white focus:outline-none"
              style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`}}
              onFocus={e=>e.target.style.borderColor='rgba(99,102,241,0.6)'}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          <button onClick={date!==today()?()=>setDate(today()):undefined} disabled={date===today()}
            className="h-8 px-3 text-xs font-semibold rounded-lg text-slate-400 disabled:opacity-30 transition-colors hover:text-white"
            style={{border:`1px solid ${C.border}`,background:'rgba(255,255,255,0.04)'}}>
            Today
          </button>
          <button onClick={downloadPdf} disabled={pdfLoad||loading||!data}
            className="h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-40"
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',boxShadow:'0 4px 14px rgba(99,102,241,0.4)'}}>
            {pdfLoad?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Download className="w-3.5 h-3.5"/>}
            {pdfLoad?'Generating…':'Export PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin"/>
          <p className="text-sm" style={{color:C.muted}}>Loading report…</p>
        </div>
      ) : !data ? null : (
        <div className="px-7 py-5 space-y-5"
          style={{opacity:mounted?1:0,transform:mounted?'none':'translateY(12px)',transition:'opacity 0.5s 0.1s,transform 0.5s 0.1s'}}>

          {/* ══════════ KPI ROW ══════════ */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KPI label="Total Revenue" value={fmt(totalRev)} sub={`${totalTxns} transactions today`}
              icon={DollarSign} accent="#6366f1" />
            <KPI label="Items Sold" value={totalQty.toLocaleString()} sub={`${pivot.length} products sold`}
              icon={ShoppingBag} accent="#10b981" />
            <KPI label="Net Profit" value={fmt(totalProfit)} sub={totalProfit>=0?'Positive performance':'Review expenses'}
              icon={totalProfit>=0?TrendingUp:TrendingDown} accent={totalProfit>=0?'#06b6d4':'#f97316'} positive={totalProfit>=0} />
            <KPI label="Active Branches"
              value={`${data.branches.filter((b:any)=>Number(b.sales_count)>0).length} / ${data.branches.length}`}
              sub="branches made sales today"
              icon={GitBranch} accent="#f59e0b" />
          </div>

          {/* ══════════ CHART + BRANCH TABLE ══════════ */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* bar chart */}
            <div className="xl:col-span-2 rounded-2xl p-5" style={{background:C.card,border:`1px solid ${C.border}`}}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Branch Comparison</h2>
                  <p className="text-xs mt-0.5" style={{color:C.muted}}>{fmtShort(date)}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]" style={{color:C.muted}}>
                  {[['#6366f1','Revenue'],['#10b981','Gross Profit'],['#f87171','Expenses']].map(([c,l])=>(
                    <div key={l} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm" style={{background:c}}/>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.branches} barGap={3} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="branch_name" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}
                    tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<Tip/>} cursor={{fill:'rgba(255,255,255,0.03)',radius:4}}/>
                  <Bar dataKey="revenue"      name="Revenue"      fill="#6366f1" radius={[4,4,0,0]}/>
                  <Bar dataKey="gross_profit" name="Gross Profit" fill="#10b981" radius={[4,4,0,0]}/>
                  <Bar dataKey="expenses"     name="Expenses"     fill="#f87171" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* branch performance table */}
            <div className="rounded-2xl overflow-hidden" style={{background:C.card,border:`1px solid ${C.border}`}}>
              <div className="px-5 py-4" style={{borderBottom:`1px solid ${C.border}`}}>
                <h2 className="text-sm font-bold text-white">Branch Performance</h2>
                <p className="text-xs mt-0.5" style={{color:C.muted}}>Today's breakdown</p>
              </div>
              <div className="divide-y" style={{'--tw-divide-opacity':1} as any}>
                {data.branches.map((b:any,i:number)=>{
                  const isPos = Number(b.net_profit)>=0;
                  const col   = BRANCH_COLORS[i];
                  return (
                    <div key={b.branch_id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:col,boxShadow:`0 0 6px ${col}`}}/>
                          <span className="text-sm font-bold text-white">{b.branch_name}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{background:`${col}18`,color:col}}>{b.sales_count} sales</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {[
                          {k:'Revenue',    v:b.revenue,      c:'#818cf8'},
                          {k:'Gross Profit',v:b.gross_profit,c:'#34d399'},
                          {k:'Expenses',   v:b.expenses,     c:'#f87171'},
                          {k:'Net Profit', v:b.net_profit,   c:isPos?'#38bdf8':'#fb923c'},
                        ].map(({k,v,c})=>(
                          <div key={k} className="flex items-center justify-between">
                            <span style={{color:C.muted}}>{k}</span>
                            <span className="font-bold" style={{color:c}}>{fmt(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ══════════ PRODUCTS TABLE ══════════ */}
          {pivot.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{background:C.card,border:`1px solid ${C.border}`}}>
              <div className="px-5 py-4 flex items-center justify-between" style={{borderBottom:`1px solid ${C.border}`}}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400"/>
                  <h2 className="text-sm font-bold text-white">Products Sold</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{background:'rgba(99,102,241,0.15)',color:'#818cf8'}}>{pivot.length} products</span>
                </div>
                <span className="text-xs font-semibold" style={{color:C.muted}}>
                  {totalQty} units · {fmt(totalRev)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      {['#','Product','Category',
                        ...branchNames.flatMap(b=>[b+' Qty',b+' Rev']),
                        'Total Qty','Total Revenue','Share'
                      ].map((h,i)=>(
                        <th key={i} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${i>2?'text-right':''}`}
                          style={{color:C.muted}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pivot.map((p,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`}}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                        className="transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                            style={{background:i<3?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.05)',
                                    color:i<3?'#818cf8':C.muted}}>
                            {i+1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap">{p.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{background:'rgba(99,102,241,0.12)',color:'#818cf8'}}>{p.cat}</span>
                        </td>
                        {branchNames.map(b=>(
                          <React.Fragment key={b}>
                            <td className="px-4 py-2.5 text-right text-xs" style={{color:C.muted}}>
                              {p.br[b]?.qty ?? <span style={{color:C.dim}}>—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-semibold" style={{color:'#818cf8'}}>
                              {p.br[b]?fmt(p.br[b].rev):<span style={{color:C.dim}}>—</span>}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="px-4 py-2.5 text-right text-sm font-black text-white">{p.qty}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-black" style={{color:'#818cf8'}}>{fmt(p.rev)}</td>
                        <td className="px-4 py-2.5 text-right w-24">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                              <div className="h-full rounded-full" style={{width:`${(p.rev/maxRev)*100}%`,background:'linear-gradient(90deg,#6366f1,#8b5cf6)'}}/>
                            </div>
                            <span className="text-[10px] font-bold" style={{color:C.muted}}>
                              {Math.round((p.rev/totalRev)*100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'rgba(99,102,241,0.06)',borderTop:'1px solid rgba(99,102,241,0.2)'}}>
                      <td className="px-4 py-2.5 font-black text-indigo-300 text-xs" colSpan={3}>TOTALS</td>
                      {branchNames.map(b=>{
                        const br  = data.branches.find((x:any)=>x.branch_name===b);
                        const qty = pivot.reduce((s,p)=>s+(p.br[b]?.qty||0),0);
                        return (
                          <React.Fragment key={b}>
                            <td className="px-4 py-2.5 text-right font-black text-indigo-300 text-xs">{qty}</td>
                            <td className="px-4 py-2.5 text-right font-black text-indigo-300 text-xs">{br?fmt(br.revenue):'—'}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right font-black text-white text-xs">{totalQty}</td>
                      <td className="px-4 py-2.5 text-right font-black text-white text-xs">{fmt(totalRev)}</td>
                      <td className="px-4 py-2.5 text-right text-indigo-300 text-xs font-bold">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ══════════ EMPTY STATE ══════════ */}
          {pivot.length===0 && !loading && (
            <div className="rounded-2xl p-12 flex flex-col items-center gap-3"
              style={{background:C.card,border:`1px solid ${C.border}`}}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{background:'rgba(99,102,241,0.1)'}}>
                <Package className="w-6 h-6 text-indigo-400"/>
              </div>
              <p className="text-sm font-semibold text-white">No sales recorded</p>
              <p className="text-xs" style={{color:C.muted}}>No transactions found for {fmtShort(date)}</p>
            </div>
          )}

          {/* ══════════ LOW STOCK STRIP ══════════ */}
          {lowStock.length>0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.18)'}}>
              <div className="px-5 py-3 flex items-center gap-3" style={{borderBottom:'1px solid rgba(245,158,11,0.12)'}}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'rgba(245,158,11,0.15)'}}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400"/>
                </div>
                <div>
                  <span className="text-sm font-bold text-white">Low Stock Alerts</span>
                  <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{background:'rgba(245,158,11,0.15)',color:'#fbbf24'}}>{lowStock.length} items</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-px" style={{background:'rgba(245,158,11,0.08)'}}>
                {lowStock.map((item:any,i:number)=>(
                  <div key={i} className="flex items-center justify-between px-4 py-3"
                    style={{background:'rgba(14,14,35,0.7)'}}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[10px] mt-0.5 truncate" style={{color:'rgba(251,191,36,0.6)'}}>{item.category_name || 'No category'}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-base font-black text-red-400 leading-none">{item.quantity}</p>
                      <p className="text-[9px]" style={{color:C.muted}}>/{item.low_stock_alert}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
