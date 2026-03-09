import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-slate-100 text-slate-500',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    deployed: { variant: 'info', label: 'Deployed' },
    bench: { variant: 'warning', label: 'Bench' },
    rolling_off: { variant: 'warning', label: 'Rolling Off' },
    notice_period: { variant: 'danger', label: 'Notice' },
    on_leave: { variant: 'neutral', label: 'On Leave' },
    pipeline: { variant: 'neutral', label: 'Pipeline' },
    confirmed: { variant: 'info', label: 'Confirmed' },
    active: { variant: 'success', label: 'Active' },
    completed: { variant: 'neutral', label: 'Completed' },
    on_hold: { variant: 'warning', label: 'On Hold' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    open: { variant: 'info', label: 'Open' },
    filled: { variant: 'success', label: 'Filled' },
    closed: { variant: 'neutral', label: 'Closed' },
  };
  const config = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
