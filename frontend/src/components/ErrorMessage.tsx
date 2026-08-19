import type { ReactNode } from 'react';
import { cn } from '../utils';

export function ErrorMessage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('rounded-md bg-red-50 px-3 py-2 text-sm text-red-700', className)}>
      {children}
    </p>
  );
}
