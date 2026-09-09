export interface ContestRuleMeta {
  label: string;
  color: string;
}

// Matches Hydro's built-in contest-type-tag colors.
export function contestRuleMeta(rule?: string): ContestRuleMeta {
  const value = (rule ?? '').trim().toLowerCase();
  if (value === 'acm' || /acm|icpc/.test(value)) return { label: 'ACM', color: '#6bb67a' };
  if (value === 'oi') return { label: 'OI', color: '#f5c735' };
  if (value === 'ioi') return { label: 'IOI', color: '#2e9afe' };
  if (value === 'strictioi' || /ioi.*strict|strict.*ioi/.test(value)) return { label: 'IOI(Strict)', color: '#2e9afe' };
  if (value === 'ledo') return { label: 'Ledo', color: '#8076a3' };
  if (value === 'homework' || value === '作业') return { label: '作业', color: '#ffcdcd' };
  if (value === 'cf' || value === 'codeforces') return { label: 'CF', color: '#f59e0b' };
  return { label: rule?.trim() || '未分类', color: '#8a8f98' };
}
