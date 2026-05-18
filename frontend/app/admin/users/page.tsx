'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, X, Shield, User, AlertTriangle, Users, Search } from 'lucide-react';

const BG     = '#07071a';
const BORDER = 'rgba(255,255,255,0.08)';

const EMPTY = { name: '', phone: '', password: '', role: 'branch_user' };

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [search, setSearch]     = useState('');
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

  const filtered      = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search),
  );
  const adminCount    = users.filter(u => u.role === 'super_admin').length;
  const managerCount  = users.filter(u => u.role === 'manager').length;
  const userCount     = users.filter(u => u.role === 'branch_user').length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  const roleBadge = (role: string) => {
    if (role === 'super_admin') return <span className="badge-purple flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> Admin</span>;
    if (role === 'manager')     return <span className="badge-green  flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> Manager</span>;
    return <span className="badge-blue flex items-center gap-1 w-fit"><User className="w-3 h-3" /> User</span>;
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── page header ── */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 4px 14px rgba(139,92,246,0.4)' }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Team Management</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{users.length} total users</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {adminCount   > 0 && <div className="badge-purple px-3 py-1.5 text-xs">{adminCount} admin{adminCount !== 1 ? 's' : ''}</div>}
            {managerCount > 0 && <div className="badge-green  px-3 py-1.5 text-xs">{managerCount} manager{managerCount !== 1 ? 's' : ''}</div>}
            {userCount    > 0 && <div className="badge-blue   px-3 py-1.5 text-xs">{userCount} user{userCount !== 1 ? 's' : ''}</div>}
            {inactiveCount > 0 && <div className="badge-red   px-3 py-1.5 text-xs">{inactiveCount} inactive</div>}
            <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add User</button>
          </div>
        </div>
      </div>

      {/* ── content ── */}
      <div className="px-6 py-5">
        <div className="card overflow-hidden">
          <div className="section-header">
            <div>
              <p className="section-title">All Users</p>
              <p className="section-sub">{filtered.length} of {users.length}</p>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input className="input pl-8 py-2 text-xs" placeholder="Search users…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="thead-dark">
                <tr>
                  <th className="th">User</th>
                  <th className="th">Phone</th>
                  <th className="th">Role</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-dark">
                {filtered.map(u => (
                  <tr key={u.id} className="tr-hover">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0
                          ${u.role === 'super_admin' ? 'bg-purple-500/15 text-purple-300'
                          : u.role === 'manager'     ? 'bg-emerald-500/15 text-emerald-300'
                                                     : 'bg-blue-500/15 text-blue-300'}`}>
                          {u.name[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="td" style={{ color: 'rgba(255,255,255,0.45)' }}>{u.phone}</td>
                    <td className="td">{roleBadge(u.role)}</td>
                    <td className="td">
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDelModal({ open: true, user: u }); setDelError(''); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-white">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h2 className="font-bold text-white">{editing ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="alert-error">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" className="input" placeholder="07XXXXXXXX" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Password {editing && <span style={{ color: 'rgba(255,255,255,0.35)' }}>(leave blank to keep)</span>}</label>
                <input type="password" className="input" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  {...(!editing && { required: true })} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="branch_user">User</option>
                  <option value="manager">Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {delModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h2 className="font-bold text-white">Remove User</h2>
              <button onClick={() => setDelModal({ open: false, user: null })}>
                <X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{delModal.user?.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{delModal.user?.phone}</p>
                </div>
              </div>
              {delError && <div className="alert-error">{delError}</div>}
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Choose an action:</p>
              <div className="space-y-2">
                <button onClick={deactivate} disabled={deleting}
                  className="w-full btn-ghost justify-center text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                  Deactivate (keep data, block login)
                </button>
                <button onClick={deletePermanent} disabled={deleting} className="w-full btn-danger justify-center">
                  {deleting ? 'Deleting…' : 'Delete Permanently (cannot undo)'}
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
