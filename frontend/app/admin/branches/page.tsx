'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, X, MapPin, Users, Package, Trash2, AlertTriangle } from 'lucide-react';

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState({ name: '', location: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const [delModal, setDelModal] = useState<{ open: boolean; branch: any }>({ open: false, branch: null });
  const [delError, setDelError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get('/branches').then(r => setBranches(r.data));
  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm({ name: '', location: '' }); setError(''); setModal(true); };
  const openEdit = (b: any) => { setEditing(b); setForm({ name: b.name, location: b.location || '' }); setError(''); setModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/branches/${editing.id}`, form);
      else          await api.post('/branches', form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const deactivate = async () => {
    if (!delModal.branch) return;
    setDeleting(true); setDelError('');
    try {
      await api.delete(`/branches/${delModal.branch.id}`);
      setDelModal({ open: false, branch: null }); load();
    } catch (e: any) { setDelError(e.response?.data?.message || 'Error'); }
    finally { setDeleting(false); }
  };

  const deletePermanent = async () => {
    if (!delModal.branch) return;
    setDeleting(true); setDelError('');
    try {
      await api.delete(`/branches/${delModal.branch.id}/permanent`);
      setDelModal({ open: false, branch: null }); load();
    } catch (e: any) { setDelError(e.response?.data?.message || 'Error'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Branches</h1>
          <p className="text-slate-400 text-sm mt-1">{branches.length} active branches</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add Branch</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-slate-300">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => { setDelModal({ open: true, branch: b }); setDelError(''); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-white text-lg">{b.name}</h3>
            {b.location && (
              <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" /><span>{b.location}</span>
              </div>
            )}
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/8">
              <div className="flex items-center gap-1.5 text-sm text-slate-300">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{b.user_count} user{b.user_count !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-300">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>{b.total_stock} units (shared)</span>
              </div>
            </div>
          </div>
        ))}
        {branches.length === 0 && <p className="text-slate-500 text-sm col-span-3 text-center py-12">No branches yet</p>}
      </div>

      {/* ── Edit / Create modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-semibold text-white">{editing ? 'Edit Branch' : 'New Branch'}</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="alert-error text-sm rounded-lg px-3 py-2">{error}</div>}
              <div><label className="label">Branch Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><label className="label">Location</label><input className="input" placeholder="e.g. Kigali, Downtown" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {delModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-semibold text-white">Remove Branch</h2>
              <button onClick={() => setDelModal({ open: false, branch: null })}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{delModal.branch?.name}</p>
                  {delModal.branch?.location && <p className="text-xs text-slate-400">{delModal.branch.location}</p>}
                </div>
              </div>
              {delError && <div className="alert-error">{delError}</div>}
              <p className="text-sm text-slate-400">Choose an action:</p>
              <div className="space-y-2">
                <button onClick={deactivate} disabled={deleting}
                  className="w-full btn-ghost justify-center text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                  Deactivate (hide from system, keep data)
                </button>
                <button onClick={deletePermanent} disabled={deleting}
                  className="w-full btn-danger justify-center">
                  {deleting ? 'Deleting...' : 'Delete Permanently (cannot undo)'}
                </button>
              </div>
              <button onClick={() => setDelModal({ open: false, branch: null })} className="w-full btn-ghost justify-center">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
