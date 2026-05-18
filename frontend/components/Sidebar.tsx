'use client';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import {
  LayoutDashboard, Package, GitBranch, Users,
  ShoppingCart, Receipt, BarChart2, LogOut,
  Boxes, Building2, ChevronRight, ShoppingBag,
} from 'lucide-react';
import { useBranch } from '@/lib/branch-context';

const adminNav = [
  { href: '/admin',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products',  icon: Package          },
  { href: '/admin/branches', label: 'Branches',  icon: GitBranch        },
  { href: '/admin/users',    label: 'Users',     icon: Users            },
  { href: '/admin/stock',    label: 'Stock',     icon: Boxes            },
  { href: '/admin/expenses', label: 'Expenses',  icon: Receipt          },
  { href: '/admin/reports',  label: 'Reports',   icon: BarChart2        },
];

const branchNav = [
  { href: '/branch',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/branch/stock',    label: 'My Stock',  icon: Package         },
  { href: '/branch/sales',    label: 'Sell',      icon: ShoppingCart    },
  { href: '/branch/expenses', label: 'Expenses',  icon: Receipt         },
  { href: '/branch/reports',  label: 'Reports',   icon: BarChart2       },
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

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = getUser();
  const isAdmin  = user?.role === 'super_admin';
  const nav      = isAdmin ? adminNav : branchNav;

  const { selectedBranch, setSelectedBranch, branches } = useBranch();

  const isActive = (href: string) =>
    href === (isAdmin ? '/admin' : '/branch') ? pathname === href : pathname.startsWith(href);

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
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isAdmin ? 'Super Admin' : user?.branch_name}
            </p>
          </div>
        </div>
      </div>

      {/* branch selector (admin only) */}
      {isAdmin && branches.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Active Branch</span>
          </div>
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="w-full text-white text-xs rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <option value="all">All Branches</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p className="text-[10px] mt-1.5 px-0.5" style={{ color: selectedBranch === 'all' ? 'rgba(129,140,248,0.8)' : 'rgba(52,211,153,0.8)' }}>
            {selectedBranch === 'all' ? 'Viewing all branches' : 'Filtered to selected branch'}
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
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Avatar name={user?.name || 'U'} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-none">{user?.name}</p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
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
