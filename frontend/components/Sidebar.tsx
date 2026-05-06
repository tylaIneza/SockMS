'use client';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import {
  LayoutDashboard, Package, GitBranch, Users, ArrowLeftRight,
  ShoppingCart, Receipt, BarChart2, LogOut, ChevronRight, Boxes,
} from 'lucide-react';

const adminNav = [
  { href: '/admin',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/products',  label: 'Products',   icon: Package },
  { href: '/admin/branches',  label: 'Branches',   icon: GitBranch },
  { href: '/admin/users',     label: 'Users',      icon: Users },
  { href: '/admin/stock',     label: 'Stock',      icon: Boxes },
  { href: '/admin/expenses',  label: 'Expenses',   icon: Receipt },
  { href: '/admin/reports',   label: 'Reports',    icon: BarChart2 },
];

const branchNav = [
  { href: '/branch',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/branch/stock',    label: 'My Stock',  icon: Package },
  { href: '/branch/sales',    label: 'Sell',      icon: ShoppingCart },
  { href: '/branch/expenses', label: 'Expenses',  icon: Receipt },
  { href: '/branch/reports',  label: 'Reports',   icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = getUser();
  const isAdmin  = user?.role === 'super_admin';
  const nav      = isAdmin ? adminNav : branchNav;

  const isActive = (href: string) =>
    href === (isAdmin ? '/admin' : '/branch') ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold">SockMS</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{isAdmin ? 'Super Admin' : user?.branch_name}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {isActive(href) && <ChevronRight className="w-3 h-3" />}
          </button>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4 border-t border-slate-700 pt-4">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-900/40 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
