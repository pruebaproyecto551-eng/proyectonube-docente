import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 shadow-xs',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-50 shadow-2xs',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 shadow-xs',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 shadow-xs',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-5 py-2.5 text-base font-medium',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        sizeStyles[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
