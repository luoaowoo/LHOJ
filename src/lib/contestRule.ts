import type { HydroProblem } from '../types';

export interface ContestRuleMeta {
  label: string;
  color: string;
}

export interface ContestScheduleSource {
  beginAt: string;
  endAt: string;
}

export interface ContestStatusWindow {
  beginAt?: string;
  endAt?: string;
}

export interface ContestProblemPayload {
  pdict?: unknown;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// Hydro may replace the global contest window with the user's tsdoc window
// when a personal duration or early end applies.
export function contestSchedule(
  contest: ContestScheduleSource,
  status?: ContestStatusWindow | null,
): ContestScheduleSource {
  return {
    beginAt: status?.beginAt || contest.beginAt,
    endAt: status?.endAt || contest.endAt,
  };
}

export function contestState(contest: ContestScheduleSource, now: number): '未开始' | '进行中' | '已结束' | '未知' {
  const begin = Date.parse(contest.beginAt);
  const end = Date.parse(contest.endAt);
  if (!Number.isFinite(begin) || !Number.isFinite(end)) return '未知';
  if (now < begin) return '未开始';
  if (now >= end) return '已结束';
  return '进行中';
}

export function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [days ? `${days} 天` : '', `${hours} 小时`, `${minutes} 分`, `${rest} 秒`].filter(Boolean).join(' ');
}

// Hydro's contest problem list returns pdocs both by docId and by pid. Follow
// the contest's pids order so duplicate pid keys never duplicate or reorder rows.
export function contestProblems(payload: ContestProblemPayload, pids: number[]): HydroProblem[] {
  const pdict = payload.pdict;
  if (!isRecord(pdict)) return [];
  return pids.flatMap((docId) => {
    const item = pdict[String(docId)];
    if (!isRecord(item)) return [];
    return [{
      _id: stringValue(item._id) || String(docId),
      domainId: stringValue(item.domainId),
      docId,
      docType: typeof item.docType === 'number' ? item.docType : 0,
      pid: typeof item.pid === 'string' ? item.pid : null,
      title: stringValue(item.title),
      hidden: item.hidden === true,
    } satisfies HydroProblem];
  });
}
