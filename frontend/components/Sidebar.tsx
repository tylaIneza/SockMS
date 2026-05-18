'use client';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import {
  LayoutDashboard, Package, Users,
  ShoppingCart, Receipt, BarChart2, LogOut,
  Boxes, Building2, ChevronRight, ShoppingBag, Shield, ClipboardList, KeyRound,
} from 'lucide-react';
import { useBranch } from '@/lib/branch-context';

const adminNav = [
  { href: '/admin',          label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products',   icon: Package          },
  { href: '/admin/users',    label: 'Users',      icon: Users            },
  { href: '/admin/stock',    label: 'Stock',      icon: Boxes            },
  { href: '/admin/expenses', label: 'Expenses',   icon: Receipt          },
  { href: '/admin/reports',  label: 'Reports',    icon: BarChart2        },
  { href: '/admin/audit',    label: 'Audit Logs',      icon: ClipboardList    },
  { href: '/admin/password', label: 'Change Password', icon: KeyRound         },
];

const branchNav = [
  { href: '/branch',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/branch/stock',    label: 'My Stock',  icon: Package         },
  { href: '/branch/sales',    label: 'Sell',      icon: ShoppingCart    },
  { href: '/branch/expenses', label: 'Expenses',  icon: Receipt         },
  { href: '/branch/reports',   label: 'Reports',         icon: BarChart2       },
  { href: '/branch/password',  label: 'Change Password', icon: KeyRound        },
];

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc' }}>
      <Shield className="w-2.5 h-2.5" /> Super Admin
    </div>
  );
  if (role === 'manager') return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
      <Shield className="w-2.5 h-2.5" /> Manager
    </div>
  );
  return null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = getUser();
  const isAdmin   = user?.role === 'super_admin';
  const isManager = user?.role === 'manager';
  const nav       = (isAdmin || isManager) ? adminNav : branchNav;

  const { selectedUser, setSelectedUser, users } = useBranch();

  const isActive = (href: string) =>
    href === ((isAdmin || isManager) ? '/admin' : '/branch') ? pathname === href : pathname.startsWith(href);

  const subtitle = isAdmin ? 'Super Admin' : isManager ? 'Manager' : 'User';

  return (
    <aside className="flex flex-col w-64 min-h-screen shrink-0" style={{ background: '#0f0f23' }}>

      {/* brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Tyla &amp; Newgen</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>
          </div>
        </div>
      </div>

      {/* user selector (admin/manager) */}
      {(isAdmin || isManager) && users.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Filter by User</span>
          </div>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="w-full text-white text-xs rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <option value="all">All Users</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <p className="text-[10px] mt-1.5 px-0.5" style={{ color: selectedUser === 'all' ? 'rgba(129,140,248,0.8)' : 'rgba(52,211,153,0.8)' }}>
            {selectedUser === 'all' ? 'Viewing all users' : 'Filtered to selected user'}
          </p>
        </div>
      )}

      {/* nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <button key={href} onClick={() => router.push(href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
              style={{
                background:   active ? 'rgba(99,102,241,0.20)' : 'transparent',
                color:        active ? '#fff' : 'rgba(255,255,255,0.45)',
                borderLeft:   active ? '2px solid #6366f1' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; } }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* user + logout */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Avatar name={user?.name || 'U'} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-none">{user?.name}</p>
            <div className="mt-1">
              <RoleBadge role={user?.role || ''} />
            </div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = '#fca5a5'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
