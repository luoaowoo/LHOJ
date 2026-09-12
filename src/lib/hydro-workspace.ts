export interface HydroWorkspaceTarget {
  path: string;
  title?: string;
}

export function normalizeHydroPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  try {
    const url = new URL(trimmed, 'http://hydro.local');
    if (url.origin !== 'http://hydro.local') return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function parseHydroWorkspaceTarget(search: string): HydroWorkspaceTarget | null {
  const params = new URLSearchParams(search);
  const path = normalizeHydroPath(params.get('path'));
  if (!path) return null;
  const title = params.get('title')?.trim();
  return { path, title: title ? title.slice(0, 120) : undefined };
}

export function hydroWorkspaceHref(path: string, title?: string): string {
  const normalized = normalizeHydroPath(path);
  if (!normalized) return '/hydro';
  const params = new URLSearchParams({ path: normalized });
  if (title?.trim()) params.set('title', title.trim().slice(0, 120));
  return `/hydro?${params.toString()}`;
}