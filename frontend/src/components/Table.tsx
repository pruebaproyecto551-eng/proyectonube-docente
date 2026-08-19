import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
  dense?: boolean;
}

export function Table<T>({ columns, rows, emptyMessage = 'Sin datos', rowKey, dense = true }: Props<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50/90 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 select-none">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={dense ? 'px-3.5 py-2.5' : 'px-4 py-3'}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 text-xs">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-blue-50/40 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={dense ? 'px-3.5 py-2 text-slate-800' : 'px-4 py-3 text-slate-800'}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
