import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Layers,
  CalendarDays,
  DollarSign,
  UserPlus,
  Settings,
  Headset,
  Zap,
  PanelLeftClose,
  ClipboardList,
  PanelLeftOpen,
  Globe,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/projects', icon: FolderKanban, label: 'Current Projects' },
  { to: '/pipeline', icon: Layers, label: 'Pipeline' },
  { to: '/forecasting', icon: CalendarDays, label: 'Forecasting' },
  { to: '/hiring-forecast', icon: UserPlus, label: 'Hiring Forecast' },
  { to: '/financials', icon: DollarSign, label: 'Financials' },
  { to: '/concierge', icon: Headset, label: 'Concierge' },
  { to: '/india-staffing', icon: ClipboardList, label: 'India Staffing' },
  { to: '/us-staffing', icon: Globe, label: 'US Staffing' },
  { to: '/open-bench', icon: UserCheck, label: 'Open Bench' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setEmail(session?.user?.email ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-60'} bg-sidebar h-screen flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out`}
    >
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-5'} py-5 gap-2.5`}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden">
            Simpliigence
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-2 space-y-1 overflow-y-auto overflow-x-hidden`}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : ''} gap-3 ${collapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-slate-400 hover:text-white hover:bg-sidebar-hover'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User identity + sign-out */}
      {email && (
        <div className={`${collapsed ? 'px-2' : 'px-3'} pt-3 mt-3 border-t border-slate-700/40`}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => signOut()}
              title={`Signed in as ${email} — click to sign out`}
              className="flex items-center justify-center w-full py-2 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar-hover transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center uppercase">
                {email.charAt(0)}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center uppercase flex-shrink-0">
                {email.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-300 truncate" title={email}>{email}</div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-[10px] text-slate-500 hover:text-white inline-flex items-center gap-1 mt-0.5 transition-colors"
                >
                  <LogOut size={10} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom: Settings + Toggle */}
      <div className={`${collapsed ? 'px-2' : 'px-3'} pb-3 space-y-1`}>
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `flex items-center ${collapsed ? 'justify-center' : ''} gap-3 ${collapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-sidebar-active text-white'
                : 'text-slate-400 hover:text-white hover:bg-sidebar-hover'
            }`
          }
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-3 ${collapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-sidebar-hover transition-colors w-full`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
