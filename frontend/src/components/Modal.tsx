import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const MAX_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function Modal({ open, title, onClose, children, footer, maxWidth = 'lg' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={cn(
          'w-full rounded-2xl bg-white shadow-2xl border border-slate-200/80 flex flex-col my-auto max-h-[92vh] sm:max-h-[88vh] overflow-hidden',
          MAX_WIDTHS[maxWidth] || 'max-w-lg'
        )}
      >
        {/* Header Fijo */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="px-5 py-4 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Footer Fijo con Botones Siempre Visibles */}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50/80 px-5 py-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
