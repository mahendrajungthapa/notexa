import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// ── Loading Spinner ──
export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-10 w-10', lg: 'h-14 w-14' };
  return (
    <div className={cn('flex justify-center py-16', className)}>
      <div className={cn('animate-spin rounded-full border-b-2 border-brand-600', sizes[size])} />
    </div>
  );
}

// ── Full Page Loading ──
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
    </div>
  );
}

// ── Empty State ──
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <Icon size={48} className="mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      {description && <p className="text-gray-400 mt-1 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Badge ──
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    default: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
}

// ── Storage Bar ──
export function StorageBar({ used, limit, showLabel = true }: { used: number; limit: number; showLabel?: boolean }) {
  const percent = Math.min((used / limit) * 100, 100);
  const usedMB = (used / 1048576).toFixed(1);
  const limitMB = (limit / 1048576).toFixed(0);

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Storage</span>
          <span className="text-gray-900 font-medium">{usedMB} MB / {limitMB} MB</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-brand-500'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
