import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, subtitle, trend, trendValue, icon }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    flat: 'text-slate-500',
  };
  const trendArrows = { up: '\u2191', down: '\u2193', flat: '\u2192' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <p className={`text-sm font-medium mt-2 ${trendColors[trend]}`}>
              {trendArrows[trend]} {trendValue}
            </p>
          )}
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
    </div>
  );
}
