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
} from 'lucide-react';

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
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
