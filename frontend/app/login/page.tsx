'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Eye, EyeOff, ShoppingBag, BarChart3, Package,
  Users, TrendingUp, Shield, ArrowRight, Loader2,
  Star, Zap, Globe,
} from 'lucide-react';

const FEATURES = [
  { icon: Package,    label: 'Smart Inventory',    desc: 'Real-time stock across all branches'    },
  { icon: BarChart3,  label: 'Business Analytics', desc: 'Deep insights into sales & profit'      },
  { icon: Users,      label: 'Team Management',    desc: 'Role-based access for every branch'     },
  { icon: TrendingUp, label: 'Growth Tracking',    desc: 'Monitor performance and growth daily'   },
  { icon: Shield,     label: 'Enterprise Security',desc: 'Bank-grade data protection built-in'    },
];

const STATS = [
  { value: '500+',  label: 'Businesses', icon: Globe },
  { value: '99.9%', label: 'Uptime',     icon: Zap   },
  { value: '4.9★',  label: 'Rating',     icon: Star  },
];

const DEMO = [
  { role: 'Super Admin', phone: '0788628417', pw: 'GoPffd84Y', color: 'from-violet-500 to-indigo-500' },
  { role: 'Branch A',    phone: '0780000002', pw: 'branch123', color: 'from-emerald-500 to-teal-500'  },
  { role: 'Branch B',    phone: '0780000003', pw: 'branch123', color: 'from-orange-500 to-rose-500'   },
];

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<'login' | 'signup'>('login');
  const [form, setForm]       = useState({ name: '', phone: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const [active, setActive]   = useState(0);
  const emailRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => emailRef.current?.focus(), 600);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % FEATURES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login';
      const payload  = mode === 'signup'
        ? { name: form.name, phone: form.phone, password: form.password }
        : { phone: form.phone, password: form.password };
      const res = await api.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const role = res.data.user.role;
      router.push(['super_admin', 'manager'].includes(role) ? '/admin' : '/branch');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setError('');
    setForm({ name: '', phone: '', password: '' });
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[#07071f]">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col overflow-hidden">

        {/* background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0f0c29 0%, #1a1060 35%, #24243e 70%, #0d0d2b 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 10s ease infinite',
        }} />

        <Orb className="w-[450px] h-[450px] top-[-120px] left-[-120px] bg-indigo-600/25 animate-float-slower" />
        <Orb className="w-[350px] h-[350px] bottom-[-80px]  right-[-60px]  bg-violet-600/20 animate-float-slow" />
        <Orb className="w-[220px] h-[220px] top-[45%] left-[52%]           bg-blue-500/15  animate-float" />
        <Orb className="w-[160px] h-[160px] top-[18%] right-[8%]           bg-fuchsia-500/20 animate-float-slow" />

        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '44px 44px',
        }} />

        {/* content — no overflow, tight padding */}
        <div className="relative z-10 flex flex-col h-full px-10 py-8">

          {/* brand */}
          <div className="flex items-center gap-3" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease 0.1s' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-glow">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none tracking-wide">Tyla &amp; Newgen</p>
              <p className="text-indigo-300/60 text-[10px] tracking-widest uppercase mt-0.5">Shop Management System</p>
            </div>
          </div>

          {/* headline */}
          <div className="mt-8 mb-6">
            <div
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4"
              style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.7s ease 0.3s' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
              <span className="text-emerald-300 text-[11px] font-semibold tracking-wide">Trusted by 500+ businesses worldwide</span>
            </div>

            <h1
              className="text-4xl font-black text-white leading-tight tracking-tight mb-3"
              style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.7s ease 0.4s' }}
            >
              Manage your<br />
              <span style={{
                background: 'linear-gradient(90deg, #a78bfa, #818cf8, #6ee7f7, #a78bfa)',
                backgroundSize: '300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'gradientShift 4s ease infinite',
              }}>
                business smarter
              </span>
            </h1>

            <p
              className="text-indigo-200/65 text-xs leading-relaxed max-w-[380px]"
              style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.7s ease 0.5s' }}
            >
              The all-in-one platform built for ambitious businesses. Manage inventory, track sales, and grow revenue — all from a single powerful dashboard.{' '}
              <span className="text-indigo-300 font-semibold">Start running smarter.</span>
            </p>
          </div>

          {/* features */}
          <div className="space-y-1.5 flex-1">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                onClick={() => setActive(i)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer border transition-all duration-400"
                style={{
                  opacity:    mounted ? 1 : 0,
                  transition: `opacity 0.6s ease ${0.55 + i * 0.08}s, background 0.35s, border-color 0.35s, transform 0.35s`,
                  background: active === i ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                  borderColor: active === i ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.05)',
                  transform: active === i ? 'translateX(5px)' : 'translateX(0)',
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{ background: active === i ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)' }}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold leading-none">{label}</p>
                  <p className="text-indigo-300/50 text-[10px] mt-0.5 truncate">{desc}</p>
                </div>
                {active === i && <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* stats */}
          <div
            className="flex items-center gap-5 pt-4 border-t border-white/10 mt-4"
            style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.7s ease 1.1s' }}
          >
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                <div>
                  <p className="text-white text-xs font-bold leading-none">{value}</p>
                  <p className="text-indigo-400/55 text-[9px] uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
              <span className="text-indigo-300/50 text-[10px]">All systems online</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <Orb className="w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600/6" />

        <div
          className="w-full max-w-[400px] relative z-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
          }}
        >
          {/* mobile brand */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-2.5 animate-glow">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-white">Tyla &amp; Newgen</h1>
            <p className="text-slate-400 text-xs mt-1">Shop Management System</p>
          </div>

          {/* card */}
          <div className="rounded-3xl overflow-hidden" style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>

            {/* card header */}
            <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {mode === 'login' ? 'Sign up →' : '← Sign in'}
                </button>
              </div>
              <p className="text-slate-400 text-xs">
                {mode === 'login' ? 'Sign in to your workspace' : 'Set up your super admin account'}
              </p>
            </div>

            {/* form */}
            <div className="px-7 py-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-3 py-2.5 text-xs mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      autoComplete="name" required
                      className="w-full h-10 px-3.5 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none"
                      style={inputStyle}
                      onFocus={e => Object.assign(e.target.style, { borderColor: 'rgba(99,102,241,0.7)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' })}
                      onBlur={e  => Object.assign(e.target.style, inputStyle)}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input
                    ref={emailRef}
                    type="tel" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="07XXXXXXXX"
                    autoComplete="tel" required
                    className="w-full h-10 px-3.5 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none"
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, { borderColor: 'rgba(99,102,241,0.7)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' })}
                    onBlur={e  => Object.assign(e.target.style, inputStyle)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      autoComplete="current-password" required
                      className="w-full h-10 px-3.5 pr-10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none"
                      style={inputStyle}
                      onFocus={e => Object.assign(e.target.style, { borderColor: 'rgba(99,102,241,0.7)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' })}
                      onBlur={e  => Object.assign(e.target.style, inputStyle)}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="relative w-full h-10 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group mt-1"
                  style={{
                    background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#6366f1 100%)',
                    backgroundSize: '200%',
                    animation: 'gradientShift 3s ease infinite',
                    boxShadow: '0 6px 24px rgba(99,102,241,0.45)',
                  }}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)' }} />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{mode === 'signup' ? 'Creating…' : 'Signing in…'}</>
                      : mode === 'signup'
                        ? <>Create account <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></>
                        : <>Sign in <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></>
                    }
                  </span>
                </button>
              </form>
            </div>

            {/* demo credentials */}
            <div className="px-7 pb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <span className="text-slate-600 text-[10px] font-medium">Quick access</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO.map(({ role, phone, pw, color }) => (
                  <button key={phone} type="button"
                    onClick={() => setForm({ phone, password: pw })}
                    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border border-white/8 hover:border-white/20 transition-all duration-200 group"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white text-[10px] font-semibold leading-none">{role}</span>
                    <span className="text-slate-600 text-[9px] group-hover:text-slate-400 transition-colors">tap to fill</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-700 mt-3">
            &copy; {new Date().getFullYear()} Tyla Shop &amp; Newgen Shop. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
