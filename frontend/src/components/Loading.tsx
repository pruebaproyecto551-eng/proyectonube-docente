export function Loading({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-600">
        <span className="h-3 w-3 animate-pulse rounded-full bg-slate-400" />
        <span>{label}</span>
      </div>
    </div>
  );
}
