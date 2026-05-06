'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, X, Shield, User } from 'lucide-react';

const EMPTY = { name: '', email: '', password: '', role: 'branch_user', branch_id: '' };

export default function UsersPage() {
  const [users, setUsers]           = useState<any[]>([]);
  const [branches, setBranches]     = useState<any[]>([]);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const load = () => {
    api.get('/users').then(r => setUsers(r.data));
    api.get('/branches').then(r => setBranches(r.data));
  };
  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY }); setError(''); setModal(true); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branch_id: u.branch_id || '' });
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

  const del = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    await api.delete(`/users/${id}`); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} users</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="th">Name</th><th className="th">Email</th>
              <th className="th">Role</th><th className="th">Branch</th>
              <th className="th">Status</th><th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.name[0]}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="td text-gray-500">{u.email}</td>
                <td className="td">
                  {u.role === 'super_admin'
                    ? <span className="badge-purple flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> Admin</span>
                    : <span className="badge-blue flex items-center gap-1 w-fit"><User className="w-3 h-3" /> Branch User</span>}
                </td>
                <td className="td text-gray-500">{u.branch_name || '—'}</td>
                <td className="td"><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="td">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-gray-400 py-10">No users found</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editing ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              </div>
              <div><label className="label">Password {editing && '(leave blank to keep)'}</label><input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} {...(!editing && { required: true })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="branch_user">Branch User</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Branch</label>
                  <select className="input" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
                    <option value="">None</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
