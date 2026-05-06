export interface User {
  id: string; name: string; email: string;
  role: 'super_admin' | 'branch_user';
  branch_id: string | null; branch_name?: string;
}

export const getToken  = () => typeof window !== 'undefined' ? localStorage.getItem('token')          : null;
export const getUser   = (): User | null => {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
};
export const isAdmin   = () => getUser()?.role === 'super_admin';
export const logout    = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; };

export const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n));
