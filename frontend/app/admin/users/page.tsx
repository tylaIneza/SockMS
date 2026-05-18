'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, X, Shield, User, AlertTriangle } from 'lucide-react';

const EMPTY = { name: '', phone: '', password: '', role: 'branch_user' };

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const [delModal, setDelModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [delError, setDelError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get('/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY }); setError(''); setModal(true); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ name: u.name, phone: u.phone, password: '', role: u.role });
    setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/users/${editing.id}`, form);
      else          await api.post('/users', form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const deactivate = async () => {
    if (!delModal.user) return;
    setDeleting(true); setDelError('');
    try {
      await api.delete(`/users/${delModal.user.id}`);
      setDelModal({ open: false, user: null }); load();
    } catch (e: any) { setDelError(e.response?.data?.message || 'Error'); }
    finally { setDeleting(false); }
  };

  const deletePermanent = async () => {
    if (!delModal.user) return;
    setDeleting(true); setDelError('');
    try {
      await api.delete(`/users/${delModal.user.id}/permanent`);
      setDelModal({ open: false, user: null }); load();
    } catch (e: any) { setDelError(e.response?.data?.message || 'Error'); }
    finally { setDeleting(false); }
  };

  const roleBadge = (role: string) => {
    if (role === 'super_admin') return <span className="badge-purple flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> Admin</span>;
    if (role === 'manager')     return <span className="badge-green  flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> Manager</span>;
    return <span className="badge-blue flex items-center gap-1 w-fit"><User className="w-3 h-3" /> User</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} users</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="thead-dark">
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-dark">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5">
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${u.role === 'super_admin' ? 'bg-purple-500/15 text-purple-300'
                      : u.role === 'manager'     ? 'bg-emerald-500/15 text-emerald-300'
                                                 : 'bg-blue-500/15 text-blue-300'}`}>
                      {u.name[0]}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="td text-slate-400">{u.phone}</td>
                <td className="td">{roleBadge(u.role)}</td>
                <td className="td"><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="td">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setDelModal({ open: true, user: u }); setDelError(''); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-slate-500 py-10">No users found</p>}
      </div>

      {/* ── Edit / Create modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-semibold text-white">{editing ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="alert-error">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div><label className="label">Phone Number</label><input type="tel" className="input" placeholder="07XXXXXXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
              </div>
              <div><label className="label">Password {editing && '(leave blank to keep)'}</label><input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} {...(!editing && { required: true })} /></div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="branch_user">User</option>
                  <option value="manager">Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
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
              <h2 className="font-semibold text-white">Remove User</h2>
              <button onClick={() => setDelModal({ open: false, user: null })}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{delModal.user?.name}</p>
                  <p className="text-xs text-slate-400">{delModal.user?.phone}</p>
                </div>
              </div>
              {delError && <div className="alert-error">{delError}</div>}
              <p className="text-sm text-slate-400">Choose an action:</p>
              <div className="space-y-2">
                <button onClick={deactivate} disabled={deleting}
                  className="w-full btn-ghost justify-center text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                  Deactivate (keep data, block login)
                </button>
                <button onClick={deletePermanent} disabled={deleting}
                  className="w-full btn-danger justify-center">
                  {deleting ? 'Deleting...' : 'Delete Permanently (cannot undo)'}
                </button>
              </div>
              <button onClick={() => setDelModal({ open: false, user: null })} className="w-full btn-ghost justify-center">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
