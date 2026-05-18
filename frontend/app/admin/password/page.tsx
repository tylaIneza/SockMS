'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(''); setSuccess(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { setError('New passwords do not match'); return; }
    if (form.new_password.length < 4) { setError('New password must be at least 4 characters'); return; }
    setLoading(true);
    try {
      await api.put('/auth/password', { current_password: form.current_password, new_password: form.new_password });
      setSuccess(true);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <KeyRound className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Change Password</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Update your account password</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* current */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={form.current_password}
              onChange={e => set('current_password', e.target.value)}
              required
              placeholder="Enter current password"
              className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* new */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={form.new_password}
              onChange={e => set('new_password', e.target.value)}
              required
              placeholder="Enter new password"
              className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* confirm */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Confirm New Password</label>
          <input
            type="password"
            value={form.confirm_password}
            onChange={e => set('confirm_password', e.target.value)}
            required
            placeholder="Repeat new password"
            className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Check className="w-4 h-4" /> Password changed successfully
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
