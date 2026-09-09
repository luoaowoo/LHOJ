function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function parseRp(rpInfo: Record<string, unknown> | null | undefined): number | null {
  if (!rpInfo) return null;
  for (const key of ['rp', 'value', 'score', 'rating']) {
    const parsed = numeric(rpInfo[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function ratingColor(rp: number | null): string | undefined {
  if (rp === null) return undefined;
  if (rp < 1000) return '#9e9b94';
  if (rp < 1400) return '#42d392';
  if (rp < 1800) return '#5b9bff';
  if (rp < 2200) return '#a25bff';
  if (rp < 2800) return '#ffa726';
  return '#e5484d';
}
