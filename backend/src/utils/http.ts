export function param(
  req: { params: Record<string, string | string[] | undefined> },
  key: string
): string {
  const v = req.params[key];
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export function query(
  req: { query: any },
  key: string
): string | undefined {
  const v = req.query?.[key];
  if (v == null) return undefined;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}
