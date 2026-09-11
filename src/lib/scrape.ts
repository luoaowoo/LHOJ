import type {
  ContestRow, DiscussionDetail, DiscussionReply, DiscussionRow, HomeworkDetail,
  HomeworkProblem, HomeworkRow, ProblemFile, ProblemRow, ProblemStat,
  ProblemSolutionsResult, RankingRow, RecordDetail, RecordRow, ScoreboardRow,
  HydroSetting, TrainingDetail, TrainingNode, TrainingProblem, TrainingRow, UnsolvedProblem, UserMessage, UserSession,
} from '../types';
import { ApiError, sessionExpiredError } from './errors';
import { ensureEndpoint, fetchRead, hydroNativeUrl, requestSignal } from './endpoint';

interface HydroPageResult {
  doc: Document;
  payload: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return clean(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function rawString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function dictEntry(dict: unknown, key: unknown): Record<string, unknown> | null {
  if (!isRecord(dict)) return null;
  const entry = dict[textValue(key)];
  return isRecord(entry) ? entry : null;
}

function settingValue(source: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(source, key) && source[key] != null) return source[key];
  const nested = key.split('.').reduce<unknown>((value, part) => (
    isRecord(value) ? value[part] : undefined
  ), source);
  return nested ?? source[key];
}

async function readHydroPageResponse(path: string, pjax = true): Promise<HydroPageResult> {
  await ensureEndpoint();
  const separator = path.includes('?') ? '&' : '?';
  const requestPath = pjax ? `${path}${separator}pjax=1` : path;
  let response: Response;
  try {
    response = await fetchRead(hydroNativeUrl(requestPath), {
      headers: pjax
        ? { Accept: 'application/json, text/html;q=0.9', 'X-Requested-With': 'XMLHttpRequest' }
        : { Accept: 'text/html' },
      credentials: 'include',
    });
  } catch {
    throw new ApiError('无法连接 Hydro 服务，请检查网络或反向代理。');
  }
  if (response.redirected && response.url.includes('/login')) throw sessionExpiredError();
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();
  if (response.status >= 400 && response.status < 500) {
    throw new ApiError('没有权限查看该数据。');
  }
  if (response.status >= 500) throw new ApiError('Hydro 服务暂时不可用。');
  let html = raw;
  let payload: Record<string, unknown> | null = null;
  if (contentType.includes('json')) {
    try {
      const data: unknown = JSON.parse(raw);
      if (!isRecord(data)) throw new Error('Hydro JSON is not an object');
      // Hydro returns the login shell as JSON for unauthenticated PJAX pages.
      // Treat it as an auth failure instead of an empty, successful listing.
      if (typeof data.url === 'string' && /^\/login(?:[/?#]|$)/.test(data.url)) {
        throw sessionExpiredError();
      }
      payload = data;
      if (Array.isArray(data.fragments)) {
        html = data.fragments
          .map((fragment) => isRecord(fragment) && typeof fragment.html === 'string' ? fragment.html : '')
          .join('');
      } else {
        // Some Hydro pages return structured data (rdocs/pdict/udict) with no
        // HTML fragments. Callers can consume payload directly.
        html = '';
      }
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      throw new ApiError('Hydro 页面返回了无法解析的数据。');
    }
  }
  return {
    doc: new DOMParser().parseFromString(html, 'text/html'),
    payload,
  };
}

async function readHydroPage(path: string): Promise<Document> {
  return (await readHydroPageResponse(path)).doc;
}

function clean(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

const recordStatuses: Record<number, string> = {
  0: 'Waiting',
  1: 'Accepted',
  2: 'Wrong Answer',
  3: 'Time Exceeded',
  4: 'Memory Exceeded',
  5: 'Output Exceeded',
  6: 'Runtime Error',
  7: 'Compile Error',
  8: 'System Error',
  9: 'Cancelled',
  10: 'Unknown Error',
  11: 'Hacked',
  20: 'Running',
  21: 'Compiling',
  22: 'Fetched',
  30: 'Ignored',
  31: 'Format Error',
  32: 'Hack Successful',
  33: 'Hack Unsuccessful',
};

const languageNames: Record<string, string> = {
  'cc.cc98': 'C++98',
  'cc.cc03': 'C++03',
  'cc.cc11': 'C++11',
  'cc.cc14': 'C++14',
  'cc.cc14o2': 'C++14(O2)',
  'cc.cc17': 'C++17',
  'cc.cc17o2': 'C++17(O2)',
  'cc.cc20': 'C++20',
  'cc.cc20o2': 'C++20(O2)',
  'py.py2': 'Python 2',
  'py.py3': 'Python 3',
  'java.openjdk': 'Java',
  'js.node': 'JavaScript',
  'go.go': 'Go',
  'rs.rust': 'Rust',
};

export function formatStatus(value: unknown): string {
  const status = numberValue(value);
  if (status !== null && recordStatuses[status]) return recordStatuses[status];
  return textValue(value) || 'Unknown';
}

export function formatLanguage(value: unknown): string {
  const raw = textValue(value);
  return languageNames[raw] ?? (raw.replace(/^\w+\./, '') || 'Unknown');
}

export function formatTime(value: unknown): string {
  const raw = textValue(value);
  if (raw && numberValue(value) === null) return raw;
  const milliseconds = numberValue(value);
  return milliseconds === null ? '-' : `${Math.round(milliseconds)}ms`;
}

export function formatMemory(value: unknown): string {
  const raw = textValue(value);
  if (raw && numberValue(value) === null) return raw;
  const kib = numberValue(value);
  if (kib === null) return '-';
  if (kib < 1024) return `${Math.round(kib)} KiB`;
  const mib = kib / 1024;
  return `${mib.toFixed(mib >= 10 ? 0 : 1).replace(/\.0$/, '')} MiB`;
}

export function formatDate(value: unknown): string {
  const raw = textValue(value);
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDuration(beginAt: unknown, endAt: unknown, duration: unknown): string | undefined {
  const explicit = numberValue(duration);
  if (explicit !== null && explicit > 0) {
    const minutes = Math.round(explicit / 60000);
    return minutes >= 60 ? `${Math.floor(minutes / 60)}小时${minutes % 60 || ''}` : `${minutes}分钟`;
  }
  const begin = Date.parse(textValue(beginAt));
  const end = Date.parse(textValue(endAt));
  if (!Number.isFinite(begin) || !Number.isFinite(end) || end <= begin) return undefined;
  const minutes = Math.round((end - begin) / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}小时${minutes % 60 || ''}` : `${minutes}分钟`;
}

function parseTrainingRow(item: unknown, progress: Record<string, unknown> | null): TrainingRow | null {
  if (!isRecord(item)) return null;
  const id = textValue(item._id);
  if (!id) return null;
  const dag = Array.isArray(item.dag) ? item.dag : [];
  const problemCount = dag.reduce((sum, node) => {
    if (!isRecord(node) || !Array.isArray(node.pids)) return sum;
    return sum + node.pids.length;
  }, 0);
  return {
    id,
    title: textValue(item.title) || '未命名训练',
    description: textValue(item.description),
    attend: numberValue(item.attend) ?? undefined,
    pin: item.pin === true || numberValue(item.pin) === 1,
    nodeCount: dag.length,
    problemCount,
    done: progress?.done === true,
    enrolled: progress?.enroll === 1 || progress?.enroll === true,
    doneNids: Array.isArray(progress?.doneNids)
      ? progress.doneNids.map(numberValue).filter((value): value is number => value !== null)
      : [],
    donePids: Array.isArray(progress?.donePids)
      ? progress.donePids.map(numberValue).filter((value): value is number => value !== null)
      : [],
  };
}

function parseTrainingNode(node: unknown, problemDict: unknown): TrainingNode | null {
  if (!isRecord(node)) return null;
  const id = numberValue(node._id);
  if (id === null) return null;
  const pids = Array.isArray(node.pids)
    ? node.pids.map(numberValue).filter((value): value is number => value !== null)
    : [];
  const problems = pids.map((docId): TrainingProblem => {
    const problem = dictEntry(problemDict, docId);
    return {
      docId,
      pid: textValue(problem?.pid) || String(docId),
      title: textValue(problem?.title) || '未命名题目',
      tried: textValue(problem?.nSubmit) || undefined,
      accepted: textValue(problem?.nAccept) || undefined,
      difficulty: textValue(problem?.difficulty) || undefined,
    };
  });
  return {
    id,
    title: textValue(node.title) || `章节 ${id}`,
    requireNids: Array.isArray(node.requireNids)
      ? node.requireNids.map(numberValue).filter((value): value is number => value !== null)
      : [],
    pids,
    problems,
  };
}

function homeworkStatus(beginAt: unknown, endAt: unknown): string {
  const begin = Date.parse(textValue(beginAt));
  const end = Date.parse(textValue(endAt));
  if (Number.isFinite(begin) && Date.now() < begin) return '未开始';
  if (Number.isFinite(end) && Date.now() > end) return '已结束';
  return '进行中';
}

function parseHomeworkRow(item: unknown): HomeworkRow | null {
  if (!isRecord(item)) return null;
  const id = textValue(item._id);
  if (!id) return null;
  return {
    id,
    title: textValue(item.title) || '未命名作业',
    description: textValue(item.content),
    rule: textValue(item.rule),
    beginAt: textValue(item.beginAt) || undefined,
    endAt: textValue(item.endAt) || undefined,
    attend: numberValue(item.attend) ?? undefined,
    problemCount: Array.isArray(item.pids) ? item.pids.length : 0,
    status: homeworkStatus(item.beginAt, item.endAt),
    rated: item.rated === true,
  };
}

function parseHomeworkProblem(docId: number, item: unknown): HomeworkProblem {
  const problem = isRecord(item) ? item : {};
  return {
    docId,
    pid: textValue(problem.pid) || String(docId),
    title: textValue(problem.title) || '未命名题目',
  };
}

function parseDiscussionRow(item: unknown, userDict: unknown): DiscussionRow | null {
  if (!isRecord(item)) return null;
  const id = textValue(item._id);
  if (!id) return null;
  const owner = dictEntry(userDict, item.owner);
  return {
    id,
    title: textValue(item.title) || '无标题讨论',
    parentId: textValue(item.parentId) || undefined,
    parentType: numberValue(item.parentType) ?? undefined,
    replies: numberValue(item.nReply) ?? 0,
    views: numberValue(item.views) ?? 0,
    pinned: item.pin === true || item.pin === 1,
    hidden: item.hidden === true,
    updatedAt: textValue(item.updateAt) || undefined,
    author: textValue(owner?.uname) || undefined,
    ownerId: numberValue(item.owner) ?? undefined,
  };
}

function parseDiscussionReply(item: unknown, userDict: unknown): DiscussionReply | null {
  if (!isRecord(item)) return null;
  const id = textValue(item._id);
  if (!id) return null;
  const owner = dictEntry(userDict, item.owner);
  const replies = Array.isArray(item.reply)
    ? item.reply.flatMap((reply) => {
      const parsed = parseDiscussionReply(reply, userDict);
      return parsed ? [parsed] : [];
    })
    : undefined;
  return {
    id,
    content: rawString(item.content) ?? '',
    author: textValue(owner?.uname) || undefined,
    ownerId: numberValue(item.owner) ?? undefined,
    replies,
  };
}

function parseProblemFileHtml(html: string): ProblemFile[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr[data-filename]')).flatMap((row) => {
    const name = row.dataset.filename ?? clean(row.querySelector<HTMLElement>('td.col--name')?.textContent);
    const href = row.querySelector<HTMLAnchorElement>('td.col--name a')?.getAttribute('href');
    if (!name || !href) return [];
    return [{ name, size: clean(row.querySelector<HTMLElement>('td.col--size')?.textContent) || undefined, href }];
  });
}

function parseRecordRowsPayload(payload: Record<string, unknown>): RecordRow[] | null {
  if (!Array.isArray(payload.rdocs)) return null;
  const problemDict = payload.pdict;
  const userDict = payload.udict;
  return payload.rdocs.flatMap((item): RecordRow[] => {
    if (!isRecord(item)) return [];
    const rid = textValue(item._id);
    if (!rid) return [];
    const problemDoc = dictEntry(problemDict, item.pid);
    const userDoc = dictEntry(userDict, item.uid);
    const pid = textValue(problemDoc?.pid) || textValue(item.pid) || '*';
    const title = textValue(problemDoc?.title);
    return [{
      rid,
      status: formatStatus(item.status),
      statusCode: numberValue(item.status) ?? undefined,
      score: textValue(item.score),
      problem: title ? `${pid} ${title}` : pid,
      pid,
      problemTitle: title || undefined,
      problemHref: `/p/${encodeURIComponent(pid)}`,
      submitter: textValue(userDoc?.uname) || textValue(item.uid),
      time: formatTime(item.time),
      memory: formatMemory(item.memory),
      language: formatLanguage(item.lang),
      submittedAt: formatDate(item.judgeAt ?? item.submitAt),
    }];
  });
}

function parseRecordDetailPayload(
  payload: Record<string, unknown>,
  rid: string,
): RecordDetail | null {
  const record = isRecord(payload.rdoc) ? payload.rdoc : null;
  if (!record) return null;
  const problemDoc = isRecord(payload.pdoc) ? payload.pdoc : null;
  const userDoc = isRecord(payload.udoc) ? payload.udoc : null;
  const pid = textValue(problemDoc?.pid) || textValue(record.pid) || '*';
  const detail: RecordDetail['detail'] = [];
  const addDetail = (label: string, value: string) => {
    if (value && value !== '-') detail.push({ label, value });
  };
  addDetail('提交者', textValue(userDoc?.uname));
  addDetail('语言', formatLanguage(record.lang));
  addDetail('运行时间', formatTime(record.time));
  addDetail('内存', formatMemory(record.memory));
  addDetail('评测时间', formatDate(record.judgeAt));
  addDetail('评测机', textValue(record.judger ?? record.judgeServer ?? record.judgeHost));
  if (Array.isArray(record.testCases)) addDetail('测试点', `共 ${record.testCases.length} 个`);
  if (Array.isArray(record.judgeTexts) && record.judgeTexts.length > 0) {
    const messages = record.judgeTexts.map(textValue).filter(Boolean).join('；');
    addDetail('评测信息', messages);
  }
  const score = textValue(record.score);
  const status = formatStatus(record.status);
  const problemStatus = isRecord(payload.psdoc) ? payload.psdoc : null;
  const config = isRecord(problemDoc?.config) ? problemDoc.config : null;
  const testCases: RecordDetail['testCases'] = Array.isArray(record.testCases)
    ? record.testCases.flatMap((item) => {
      if (!isRecord(item)) return [];
      return [{
        status: formatStatus(item.status ?? item.result ?? item.code),
        score: textValue(item.score) || undefined,
        time: formatTime(item.time),
        memory: formatMemory(item.memory),
        message: textValue(item.message ?? item.judgeText ?? item.text) || undefined,
      }];
    })
    : undefined;
  return {
    rid,
    domainId: textValue(record.domainId) || undefined,
    status,
    score,
    progress: status,
    problem: textValue(problemDoc?.title) ? `${pid} ${textValue(problemDoc?.title)}` : pid,
    problemHref: `/p/${encodeURIComponent(pid)}`,
    submitter: textValue(userDoc?.uname) || undefined,
    language: formatLanguage(record.lang),
    code: rawString(record.code),
    pid,
    ownerId: numberValue(record.uid) ?? undefined,
    contestId: textValue(record.contest) || undefined,
    hackable: config?.hackable === true,
    userAccepted: numberValue(problemStatus?.status) === 1,
    revisions: isRecord(payload.allRevs)
      ? Object.entries(payload.allRevs).map(([id, judgedAt]) => ({ id, judgedAt: formatDate(judgedAt) }))
      : [],
    detail,
    testCases,
  };
}

export async function scrapeProblemRows(params: Record<string, string> = {}): Promise<ProblemRow[]> {
  const query = new URLSearchParams(params);
  const doc = await readHydroPage(`/p?${query.toString()}`);
  return Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr[data-pid]')).map((row) => {
    const problemCell = row.querySelector<HTMLElement>('td.col--name');
    const anchor = problemCell?.querySelector<HTMLAnchorElement>('a[href*="/p/"]');
    const text = clean(problemCell?.textContent);
    const [, pid = '', title = text] = text.match(/^(.*?)\s{2,}(.*)$/) ?? [];
    const [accepted = 0, submitted = 0] = clean(row.querySelector<HTMLElement>('td.col--ac-tried')?.textContent)
      .split('/')
      .map((part) => Number(part));
    return {
      docId: Number(row.dataset.pid ?? 0),
      pid: clean(row.querySelector<HTMLElement>('td.col--pid')?.textContent) || pid,
      title,
      href: anchor?.getAttribute('href') ?? `/p/${row.dataset.pid}`,
      accepted: Number.isFinite(accepted) ? accepted : 0,
      submitted: Number.isFinite(submitted) ? submitted : 0,
      difficulty: clean(row.querySelector<HTMLElement>('td.col--difficulty')?.textContent),
      tags: Array.from(problemCell?.querySelectorAll<HTMLElement>('.problem__tag') ?? [])
        .map((tag) => clean(tag.textContent)),
      status: clean(row.querySelector<HTMLElement>('.record-status--text')?.textContent) || undefined,
    };
  });
}

export async function scrapeProblemStar(pid: string): Promise<boolean> {
  const page = await readHydroPageResponse(`/p/${encodeURIComponent(pid)}`);
  return isRecord(page.payload?.psdoc) && page.payload.psdoc.star === true;
}

export interface JudgeStatus {
  id: string;
  name: string;
  online: boolean;
  updatedAt?: string;
  battery?: string;
  compilerCount: number;
}

export async function scrapeJudgeStatuses(): Promise<JudgeStatus[]> {
  const page = await readHydroPageResponse('/status');
  return Array.isArray(page.payload?.stats) ? page.payload.stats.flatMap((value) => {
    if (!isRecord(value)) return [];
    const id = textValue(value._id) || textValue(value.mid);
    if (!id) return [];
    return [{
      id,
      name: textValue(value.mid) || id,
      online: value.isOnline === true,
      updatedAt: textValue(value.updateAt) || undefined,
      battery: textValue(value.battery) || undefined,
      compilerCount: isRecord(value.compilers) ? Object.keys(value.compilers).length : 0,
    }];
  }) : [];
}

export async function scrapeUserMessages(): Promise<UserMessage[]> {
  const page = await readHydroPageResponse('/home/messages');
  const groups = isRecord(page.payload?.messages) ? page.payload.messages : {};
  return Object.values(groups).flatMap((group) => {
    if (!isRecord(group) || !Array.isArray(group.messages)) return [];
    const sender = isRecord(group.udoc) ? textValue(group.udoc.uname) || undefined : undefined;
    return group.messages.flatMap((value) => {
      if (!isRecord(value)) return [];
      const id = textValue(value._id);
      if (!id) return [];
      const to = (Array.isArray(value.to) ? value.to : [value.to]).map(numberValue).filter((v): v is number => v !== null);
      return [{ id, from: numberValue(value.from) ?? 0, to, content: rawString(value.content) ?? '', flag: numberValue(value.flag) ?? 0, sentAt: textValue(value.time) || undefined, sender }];
    });
  }).sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? ''));
}

export async function scrapeSecurity(): Promise<{ sessions: UserSession[]; sudoRequired: boolean; tfaEnabled: boolean }> {
  await ensureEndpoint();
  let response: Response;
  try {
    response = await fetch(hydroNativeUrl('/home/security?pjax=1'), {
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
      redirect: 'manual',
      signal: requestSignal(),
    });
  } catch {
    throw new ApiError('无法连接 Hydro 安全服务。');
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '';
    if (/\/login(?:[/?#]|$)/i.test(location)) throw sessionExpiredError();
    if (/\/user\/sudo(?:[/?#]|$)/i.test(location)) return { sessions: [], sudoRequired: true, tfaEnabled: false };
  }
  if (!response.ok) throw new ApiError(`安全信息加载失败（HTTP ${response.status}）。`);
  let payload: Record<string, unknown>;
  try {
    const value: unknown = await response.json();
    if (!isRecord(value)) throw new Error('invalid payload');
    payload = value;
  } catch {
    throw new ApiError('Hydro 安全页返回了无法解析的数据。');
  }
  const sessions = Array.isArray(payload.sessions) ? payload.sessions.flatMap((value) => {
    if (!isRecord(value)) return [];
    const id = textValue(value._id);
    if (!id) return [];
    return [{
      id,
      isCurrent: value.isCurrent === true,
      updateAt: textValue(value.updateAt) || undefined,
      createHost: textValue(value.createHost) || undefined,
      updateIp: textValue(value.updateIp) || textValue(value.createIp) || undefined,
      updateGeoip: isRecord(value.updateGeoip) ? { display: textValue(value.updateGeoip.display) || undefined } : undefined,
      updateUaInfo: isRecord(value.updateUaInfo) ? {
        os: isRecord(value.updateUaInfo.os) ? { name: textValue(value.updateUaInfo.os.name) || undefined, version: textValue(value.updateUaInfo.os.version) || undefined } : undefined,
        browser: isRecord(value.updateUaInfo.browser) ? { name: textValue(value.updateUaInfo.browser.name) || undefined, version: textValue(value.updateUaInfo.browser.version) || undefined } : undefined,
      } : undefined,
    } satisfies UserSession];
  }) : [];
  return { sessions, sudoRequired: false, tfaEnabled: false };
}

export async function confirmSudo(password: string, tfa = ''): Promise<void> {
  await postHydroForm('/user/sudo', { password, tfa, authnChallenge: '' });
}

export async function scrapeAccountSettings(category: 'preference' | 'account' | 'domain'): Promise<HydroSetting[]> {
  const page = await readHydroPageResponse(`/home/settings/${category}`);
  const current = isRecord(page.payload?.current) ? page.payload.current : {};
  const controls = new Map(Array.from(page.doc.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]'))
    .filter((control) => !control.getAttribute('name')?.startsWith('booleanKeys.'))
    .map((control) => [control.getAttribute('name') || '', control]));
  return Array.isArray(page.payload?.settings) ? page.payload.settings.flatMap((value) => {
    if (!isRecord(value)) return [];
    const key = textValue(value.key);
    if (!key) return [];
    const flags = numberValue(value.flag) ?? 0;
    const range = isRecord(value.range)
      ? Object.fromEntries(Object.entries(value.range).map(([option, label]) => [option, textValue(label) || option]))
      : Array.isArray(value.range)
        ? value.range.filter((item): item is [unknown, unknown] => Array.isArray(item) && item.length >= 2).map(([option, label]) => [textValue(option), textValue(label)] as [string, string])
        : undefined;
    const control = controls.get(key);
    const htmlValue = control instanceof HTMLInputElement && control.type === 'checkbox'
      ? control.checked
      : control?.value;
    return [{
      key,
      family: textValue(value.family) || '账户设置',
      name: textValue(value.name) || key,
      description: textValue(value.desc) || undefined,
      type: textValue(value.type) || 'text',
      value: value.value,
      currentValue: settingValue(current, key) ?? htmlValue,
      range,
      hidden: Boolean(flags & 1),
      disabled: Boolean(flags & 2),
      secret: Boolean(flags & 4),
    } satisfies HydroSetting];
  }) : [];
}

export async function scrapeRecordRows(params: Record<string, string> = {}): Promise<RecordRow[]> {
  const query = new URLSearchParams(params);
  const page = await readHydroPageResponse(`/record?${query.toString()}`);
  const structuredRows = page.payload ? parseRecordRowsPayload(page.payload) : null;
  if (structuredRows) return structuredRows;
  const doc = page.doc;
  return Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr[data-rid]')).map((row) => {
    const statusAnchor = row.querySelector<HTMLAnchorElement>('a.record-status--text');
    const problemAnchor = row.querySelector<HTMLAnchorElement>('td.col--problem a');
    const submitterAnchor = row.querySelector<HTMLAnchorElement>('td.col--submit-by a');
    const scoreCell = row.querySelector<HTMLElement>('.col--status__text [style]');
    return {
      rid: row.dataset.rid ?? '',
      status: clean(statusAnchor?.textContent),
      score: clean(scoreCell?.textContent) || '',
      problem: clean(problemAnchor?.textContent) || '*',
      problemHref: problemAnchor?.getAttribute('href') ?? undefined,
      submitter: clean(submitterAnchor?.textContent),
      time: clean(row.querySelector<HTMLElement>('td.col--time')?.textContent),
      memory: clean(row.querySelector<HTMLElement>('td.col--memory')?.textContent),
      language: clean(row.querySelector<HTMLElement>('td.col--lang')?.textContent),
      submittedAt: clean(row.querySelector<HTMLElement>('td.col--submit-at')?.textContent),
    };
  });
}

export async function scrapeDomainBulletin(): Promise<string> {
  // Every Hydro PJAX response embeds UiContext.domain; /p is public so this
  // also works for logged-out visitors on the public homepage.
  const page = await readHydroPageResponse('/p?page=1');
  const uiContext = isRecord(page.payload?.UiContext) ? page.payload.UiContext : null;
  const domain = isRecord(uiContext?.domain) ? uiContext.domain : null;
  return typeof domain?.bulletin === 'string' ? domain.bulletin : '';
}

// Hydro's /record?status= filter is exact-match only, so "attempted but never
// accepted" has to be diffed client side. Only these codes are real failures:
// in-flight (0/20/21/22) and non-verdict (9/30) records must not count as
// attempts, or a submission that is still judging would look unsolved.
const acceptedStatus = 1;
const failedStatuses = new Set([2, 3, 4, 5, 6, 7, 8, 10, 11, 31]);

function classifyRecord(row: RecordRow): 'accepted' | 'failed' | 'pending' {
  if (typeof row.statusCode === 'number') {
    if (row.statusCode === acceptedStatus) return 'accepted';
    return failedStatuses.has(row.statusCode) ? 'failed' : 'pending';
  }
  // HTML fallback rows carry no numeric code, so fall back to the label.
  const text = row.status.toLowerCase();
  if (/(通过|accepted|\bac\b)/.test(text)) return 'accepted';
  if (/(等待|评测|排队|运行|编译中|waiting|running|compiling|fetched|pending|已取消|cancel|忽略|ignore)/.test(text)) return 'pending';
  return text ? 'failed' : 'pending';
}

export async function scrapeUnsolvedProblems(uname: string, limit = 8, pages = 2): Promise<UnsolvedProblem[]> {
  const solved = new Set<string>();
  const candidates = new Map<string, UnsolvedProblem>();
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const rows = await scrapeRecordRows({ uidOrName: uname, page: String(pageNumber) });
    if (!rows.length) break;
    for (const row of rows) {
      const pid = row.pid && row.pid !== '*'
        ? row.pid
        : row.problemHref?.match(/(?:^|\/)p\/([^/?#]+)/i)?.[1];
      if (!pid) continue;
      const verdict = classifyRecord(row);
      if (verdict === 'accepted') { solved.add(pid); continue; }
      if (verdict === 'pending') continue;
      // Records arrive newest first, so keep the first failure seen per problem.
      const existing = candidates.get(pid);
      if (existing) { existing.attempts += 1; continue; }
      candidates.set(pid, {
        pid,
        title: row.problemTitle || row.problem || pid,
        href: row.problemHref ?? `/p/${encodeURIComponent(pid)}`,
        status: row.status,
        attempts: 1,
        lastAttemptAt: row.submittedAt,
      });
    }
  }
  return Array.from(candidates.values())
    .filter((item) => !solved.has(item.pid))
    .slice(0, limit);
}

export async function scrapeContestRows(pageNumber = 1): Promise<ContestRow[]> {
  const page = await readHydroPageResponse(`/contest?page=${pageNumber}`);
  if (page.payload && Array.isArray(page.payload.tdocs)) {
    return page.payload.tdocs.flatMap((item): ContestRow[] => {
      if (!isRecord(item)) return [];
      const id = textValue(item._id);
      if (!id) return [];
      return [{
        id,
        title: textValue(item.title),
        href: `/contest/${id}`,
        rule: textValue(item.rule),
        date: formatDate(item.beginAt),
        duration: formatDuration(item.beginAt, item.endAt, item.duration),
        attend: textValue(item.attend),
        rated: item.rated === true,
      }];
    });
  }
  const doc = page.doc;
  return Array.from(doc.querySelectorAll<HTMLElement>('li.contest__item')).map((item) => {
    const titleAnchor = item.querySelector<HTMLAnchorElement>('h1.contest__title a, .contest__title a');
    const href = titleAnchor?.getAttribute('href') ?? '';
    const id = href.match(/\/contest\/([0-9a-fA-F]{24})/)?.[1] ?? '';
    const meta = Array.from(item.querySelectorAll<HTMLElement>('ul.supplementary li'))
      .map((li) => clean(li.textContent));
    const rule = meta.find((value) => ['OI', 'IOI', 'ACM', 'CF', 'ICPC', 'Ledo', '作业'].some((kind) => value.includes(kind)));
    const rated = meta.some((value) => value.includes('Rated'));
    return {
      id,
      title: clean(titleAnchor?.textContent),
      href,
      rule,
      date: clean(item.querySelector<HTMLElement>('.contest__date')?.textContent),
      duration: meta.find((value) => value.includes('小时')),
      attend: meta.find((value) => /参与|Partic|人/.test(value)),
      rated,
    };
  });
}

export async function scrapeContestScoreboard(id: string): Promise<{ headers: string[]; rows: ScoreboardRow[] }> {
  const page = await readHydroPageResponse(`/contest/${encodeURIComponent(id)}/scoreboard`, false);
  const table = page.doc.querySelector('table');
  if (!table) return { headers: [], rows: [] };
  const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => clean(cell.textContent));
  const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) => ({
    cells: Array.from(row.querySelectorAll('th, td')).map((cell) => clean(cell.textContent)),
  })).filter((row) => row.cells.length > 0);
  return { headers, rows };
}

export interface ContestParticipation {
  attended: boolean;
  subscribed: boolean;
  requiresCode: boolean;
  ended: boolean;
  rule?: string;
  beginAt?: string;
  endAt?: string;
}

export async function scrapeContestParticipation(id: string): Promise<ContestParticipation> {
  const page = await readHydroPageResponse(`/contest/${encodeURIComponent(id)}`);
  const status = isRecord(page.payload?.tsdoc) ? page.payload.tsdoc : null;
  const contest = isRecord(page.payload?.tdoc) ? page.payload.tdoc : null;
  return {
    attended: status?.attend === 1 || status?.attend === true,
    subscribed: status?.subscribe === 1 || status?.subscribe === true,
    requiresCode: Boolean(contest?._code),
    ended: Boolean(status?.endAt),
    rule: textValue(contest?.rule) || undefined,
    beginAt: rawString(contest?.beginAt),
    endAt: rawString(contest?.endAt),
  };
}

export async function scrapeHomeworkScoreboard(id: string): Promise<{ headers: string[]; rows: ScoreboardRow[] }> {
  const page = await readHydroPageResponse(`/homework/${encodeURIComponent(id)}/scoreboard`, false);
  const table = page.doc.querySelector('table');
  if (!table) return { headers: [], rows: [] };
  return {
    headers: Array.from(table.querySelectorAll('thead th')).map((cell) => clean(cell.textContent)),
    rows: Array.from(table.querySelectorAll('tbody tr')).map((row) => ({
      cells: Array.from(row.querySelectorAll('th, td')).map((cell) => clean(cell.textContent)),
    })).filter((row) => row.cells.length > 0),
  };
}

export async function scrapeRankingRows(page = 1): Promise<RankingRow[]> {
  // The PJAX response only contains user documents. The server-rendered page
  // includes the calculated RP and AC columns, so request that representation.
  const doc = (await readHydroPageResponse(`/ranking?page=${page}`, false)).doc;
  return Array.from(doc.querySelectorAll<HTMLTableRowElement>('tbody tr')).map((row) => {
    const userAnchor = row.querySelector<HTMLAnchorElement>('td.col--user a, .user a');
    return {
      rank: clean(row.querySelector<HTMLElement>('td.col--rank')?.textContent),
      user: clean(userAnchor?.textContent ?? row.querySelector<HTMLElement>('td.col--user')?.textContent),
      userHref: userAnchor?.getAttribute('href') ?? undefined,
      rp: clean(row.querySelector<HTMLElement>('td.col--rp')?.textContent),
      accept: clean(row.querySelector<HTMLElement>('td.col--ac')?.textContent),
      bio: clean(row.querySelector<HTMLElement>('td.col--bio')?.textContent),
    };
  });
}

export async function scrapeTrainingRows(): Promise<TrainingRow[]> {
  const page = await readHydroPageResponse('/training');
  if (!page.payload || !Array.isArray(page.payload.tdocs)) return [];
  return page.payload.tdocs.flatMap((item) => {
    const id = isRecord(item) ? textValue(item._id) : '';
    const progress = dictEntry(page.payload?.tsdict, id);
    const row = parseTrainingRow(item, progress);
    return row ? [row] : [];
  });
}

export async function scrapeTrainingDetail(id: string): Promise<TrainingDetail | null> {
  const listing = await readHydroPageResponse('/training');
  const base = Array.isArray(listing.payload?.tdocs)
    ? listing.payload.tdocs.find((item) => isRecord(item) && textValue(item._id) === id)
    : null;
  if (!base) return null;
  const progress = dictEntry(listing.payload?.tsdict, id);
  const row = parseTrainingRow(base, progress);
  if (!row) return null;
  const detailPage = await readHydroPageResponse(`/training/${encodeURIComponent(id)}`);
  const dag = isRecord(base) && Array.isArray(base.dag) ? base.dag : [];
  const sections = Array.from(detailPage.doc.querySelectorAll<HTMLElement>('.training__section'));
  const nodes = sections.map((section, index) => {
    const source = isRecord(dag[index]) ? dag[index] : null;
    const sourceId = numberValue(source?._id) ?? index + 1;
    const cells = Array.from(section.querySelectorAll<HTMLElement>('td.col--name'));
    const problems = cells.map((cell, problemIndex): TrainingProblem => {
      const hiddenPid = cell.querySelector<HTMLInputElement>('input[name="pid"]')?.value;
      const sourcePid = isRecord(source) && Array.isArray(source.pids) ? source.pids[problemIndex] : undefined;
      const docId = numberValue(hiddenPid ?? sourcePid) ?? 0;
      const pid = clean(cell.querySelector<HTMLElement>('b')?.textContent) || String(docId);
      const cellText = clean(cell.textContent).replace(pid, '').trim();
      return { docId, pid, title: cellText || '未命名题目' };
    });
    return {
      id: sourceId,
      title: clean(section.querySelector<HTMLElement>('[data-heading]')?.textContent)
        .replace(/^章节\s*\d+\.\s*/, '') || `章节 ${sourceId}`,
      requireNids: isRecord(source) && Array.isArray(source.requireNids)
        ? source.requireNids.map(numberValue).filter((value): value is number => value !== null)
        : [],
      pids: problems.map((problem) => problem.docId),
      problems,
    } satisfies TrainingNode;
  });
  const fallbackNodes = dag.flatMap((node) => {
    const parsed = parseTrainingNode(node, null);
    return parsed ? [parsed] : [];
  });
  return { ...row, nodes: nodes.length > 0 ? nodes : fallbackNodes };
}

export async function scrapeHomeworkRows(): Promise<HomeworkRow[]> {
  const page = await readHydroPageResponse('/homework');
  if (!page.payload || !Array.isArray(page.payload.tdocs)) return [];
  return page.payload.tdocs.flatMap((item) => {
    const row = parseHomeworkRow(item);
    return row ? [row] : [];
  });
}

export async function scrapeHomeworkDetail(id: string): Promise<HomeworkDetail | null> {
  const page = await readHydroPageResponse(`/homework/${encodeURIComponent(id)}`);
  const item = page.payload?.tdoc;
  const row = parseHomeworkRow(item);
  if (!row) return null;
  const base = isRecord(item) ? item : {};
  const pids = Array.isArray(base.pids)
    ? base.pids.map(numberValue).filter((value): value is number => value !== null)
    : [];
  const problems = pids.map((docId) => parseHomeworkProblem(docId, dictEntry(page.payload?.pdict, docId)));
  const status = isRecord(page.payload?.tsdoc) ? page.payload.tsdoc : null;
  return { ...row, problems, attended: status?.attend === 1 || status?.attend === true };
}

export async function scrapeDiscussionRows(pageNumber = 1): Promise<DiscussionRow[]> {
  const page = await readHydroPageResponse(`/discuss?page=${pageNumber}`);
  if (!page.payload || !Array.isArray(page.payload.ddocs)) return [];
  return page.payload.ddocs.flatMap((item) => {
    const row = parseDiscussionRow(item, page.payload?.udict);
    return row ? [row] : [];
  });
}

export async function scrapeDiscussionDetail(id: string, pageNumber = 1): Promise<DiscussionDetail | null> {
  const page = await readHydroPageResponse(`/discuss/${encodeURIComponent(id)}?page=${pageNumber}`);
  const item = page.payload?.ddoc;
  const row = parseDiscussionRow(item, page.payload?.udict);
  if (!row || !isRecord(item)) return null;
  const replies = Array.isArray(page.payload?.drdocs)
    ? page.payload.drdocs.flatMap((reply) => {
      const parsed = parseDiscussionReply(reply, page.payload?.udict);
      return parsed ? [parsed] : [];
    })
    : [];
  return {
    ...row,
    content: rawString(item.content) ?? '',
    repliesDetail: replies,
    pageCount: numberValue(page.payload?.pcount) ?? 1,
  };
}

export type HydroFormValue = string | Blob | null | undefined;
export type HydroFormFields = Record<string, HydroFormValue | HydroFormValue[]>;
export type HydroFormInput = HydroFormFields | FormData | URLSearchParams | HTMLFormElement;

export interface HydroSubmitResult {
  status: number;
  ok: boolean;
  redirected: boolean;
  redirectUrl?: string;
  refresh: boolean;
  payload: Record<string, unknown> | null;
}

function formValueToString(value: HydroFormValue): string {
  if (value instanceof Blob) {
    const name = 'name' in value && typeof value.name === 'string' ? value.name : '';
    return name || '[blob]';
  }
  return value == null ? '' : String(value);
}

function formEntries(input: HydroFormInput): Array<[string, HydroFormValue]> {
  if (input instanceof FormData || input instanceof URLSearchParams) {
    return Array.from(input.entries()).map(([name, value]) => [name, value]);
  }
  if (typeof HTMLFormElement !== 'undefined' && input instanceof HTMLFormElement) {
    return Array.from(new FormData(input).entries()).map(([name, value]) => [name, value]);
  }
  return Object.entries(input).flatMap(([name, value]) => (
    (Array.isArray(value) ? value : [value]).map((item) => [name, item] as [string, HydroFormValue])
  ));
}

function toHydroFormData(input: HydroFormInput): FormData {
  const data = new FormData();
  for (const [name, value] of formEntries(input)) {
    if (value instanceof Blob) data.append(name, value);
    else data.append(name, formValueToString(value));
  }
  return data;
}

function toHydroSearchParams(input: HydroFormInput): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of formEntries(input)) params.append(name, formValueToString(value));
  return params;
}

function hasBinaryEntries(input: HydroFormInput): boolean {
  return formEntries(input).some(([, value]) => value instanceof Blob);
}

function parseResponsePayload(text: string, contentType: string): Record<string, unknown> | null {
  if (!contentType.includes('json') && !/^\s*[{[]/.test(text)) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function responseRefreshes(response: Response, text: string, payload: Record<string, unknown> | null): boolean {
  return response.redirected
    || response.status >= 300 && response.status < 400
    || typeof payload?.url === 'string'
    || /<meta[^>]+http-equiv=["']?refresh|window\.location(?:\.href)?\s*=|location\.replace\s*\(/i.test(text);
}

export async function submitHydro(
  path: string,
  fields: HydroFormInput = {},
  options: { method?: string; enctype?: string } = {},
): Promise<HydroSubmitResult> {
  await ensureEndpoint();
  const method = (options.method || 'POST').toUpperCase() === 'GET' ? 'GET' : 'POST';
  const enctype = (options.enctype || '').toLowerCase();
  const params = toHydroSearchParams(fields);
  const query = params.toString();
  const url = method === 'GET' && query
    ? `${hydroNativeUrl(path)}${path.includes('?') ? '&' : '?'}${query}`
    : hydroNativeUrl(path);
  const multipart = method === 'POST' && (enctype.includes('multipart/form-data') || hasBinaryEntries(fields));
  const body = method === 'GET' ? undefined : multipart ? toHydroFormData(fields) : params;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'text/html, application/json',
        ...(method === 'POST' && !multipart ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
      credentials: 'include',
      redirect: 'manual',
      signal: requestSignal(),
    });
  } catch {
    throw new ApiError('操作失败：无法连接 Hydro 服务。');
  }
  const text = await response.text().catch(() => '');
  const payload = parseResponsePayload(text, response.headers.get('content-type') || '');
  const location = response.headers.get('location') || (typeof payload?.url === 'string' ? payload.url : '');
  if (/\/login(?:[/?#]|$)/i.test(location) || /href=["']?\/login(?:[/?#]|["'])/i.test(text)) {
    throw sessionExpiredError();
  }
  if (response.status >= 300 && response.status < 400) {
    return {
      status: response.status,
      ok: true,
      redirected: true,
      redirectUrl: location || undefined,
      refresh: true,
      payload,
    };
  }
  if (response.ok) {
    return {
      status: response.status,
      ok: true,
      redirected: response.redirected,
      redirectUrl: location || undefined,
      refresh: responseRefreshes(response, text, payload),
      payload,
    };
  }
  const message = text.match(/<p[^>]*>([^<]+)<\/p>/i)?.[1]?.trim();
  throw new ApiError(message || `操作失败（HTTP ${response.status}）。`);
}

export async function postHydroForm(
  path: string,
  fields: HydroFormInput,
  options: { enctype?: string } = {},
): Promise<HydroSubmitResult> {
  return submitHydro(path, fields, { ...options, method: 'POST' });
}

export interface HydroAdminField {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  accept?: string;
  multiple?: boolean;
  options?: Array<{ value: string; label: string; selected: boolean }>;
}

export interface HydroAdminSubmit {
  id?: string;
  name?: string;
  value?: string;
  label: string;
  action?: string;
  method?: string;
  enctype?: string;
}

export interface HydroAdminLink {
  id: string;
  label: string;
  href: string;
}

export interface HydroAdminTableCell {
  text: string;
  href?: string;
}

export interface HydroAdminTableRow {
  id: string;
  cells: HydroAdminTableCell[];
  attributes: Record<string, string>;
}

export interface HydroAdminTable {
  id: string;
  title: string;
  headers: string[];
  rows: HydroAdminTableRow[];
}

export interface HydroAdminAction {
  id: string;
  label: string;
  action: string;
  fields: Array<{ name: string; value: string }>;
  method?: string;
  href?: string;
}

export interface HydroAdminForm {
  id: string;
  action: string;
  method?: string;
  enctype?: string;
  title: string;
  fields: HydroAdminField[];
  submits?: HydroAdminSubmit[];
  links?: HydroAdminLink[];
}

export interface HydroAdminPage {
  id: string;
  title: string;
  forms: HydroAdminForm[];
  tables: HydroAdminTable[];
  actions: HydroAdminAction[];
  links: HydroAdminLink[];
  path: string;
}

function uniqueAdminId(used: Set<string>, preferred: string, fallback: string): string {
  const base = preferred || fallback;
  let value = base;
  let index = 2;
  while (used.has(value)) value = `${base}-${index++}`;
  used.add(value);
  return value;
}

function routePath(path: string): string {
  try {
    return new URL(path, 'http://hydro.local').pathname;
  } catch {
    return path.split('?')[0];
  }
}

function internalPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const url = new URL(value, 'http://hydro.local');
    return url.origin === 'http://hydro.local' ? `${url.pathname}${url.search}${url.hash}` : value;
  } catch {
    return value;
  }
}

function elementLabel(element: Element, doc: Document): string {
  const id = element.getAttribute('id');
  const label = id ? doc.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`) : element.closest('label');
  return clean(label?.textContent)
    || clean(element.getAttribute('aria-label'))
    || clean(element.getAttribute('placeholder'))
    || element.getAttribute('name')
    || '';
}

function headingFor(element: Element, fallback: string): string {
  return clean(element.querySelector('h1, h2, h3, h4, legend, [data-heading], .section__title')?.textContent) || fallback;
}

function formControls(form: HTMLFormElement): Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  return Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input[name], select[name], textarea[name]',
  )).filter((element) => !(element instanceof HTMLInputElement && ['submit', 'button', 'reset', 'image'].includes(element.type)));
}

function formActionFields(form: HTMLFormElement): Array<{ name: string; value: string }> {
  const fields: Array<{ name: string; value: string }> = [];
  for (const control of formControls(form)) {
    if (control.disabled) continue;
    if (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type) && !control.checked) continue;
    if (control instanceof HTMLSelectElement && control.multiple) {
      for (const option of Array.from(control.selectedOptions)) fields.push({ name: control.name, value: option.value });
    } else if (control.type !== 'file') {
      fields.push({ name: control.name, value: control.value });
    }
  }
  return fields;
}

function actionFromElement(
  element: HTMLButtonElement | HTMLInputElement | HTMLAnchorElement,
  used: Set<string>,
  index: number,
  form?: HTMLFormElement,
): HydroAdminAction {
  const name = element.getAttribute('name');
  const value = element instanceof HTMLInputElement ? element.value : element.getAttribute('value') || '';
  const href = element instanceof HTMLAnchorElement ? element.getAttribute('href') || undefined : undefined;
  const formAction = internalPath(element.getAttribute('formaction'), form?.getAttribute('action') || '');
  const action = href && !href.startsWith('javascript:') ? href : formAction || '';
  const fields = form ? formActionFields(form) : [];
  if (name) fields.push({ name, value });
  return {
    id: uniqueAdminId(used, element.id, `action-${index + 1}`),
    label: clean(element.textContent) || clean(element.getAttribute('aria-label')) || value || name || '操作',
    action,
    fields,
    method: (element.getAttribute('formmethod') || form?.getAttribute('method') || 'POST').toUpperCase(),
    href,
  };
}

function scrapeForm(form: HTMLFormElement, doc: Document, index: number, used: Set<string>, fallbackAction: string): HydroAdminForm {
  const fields = formControls(form).map((element, fieldIndex) => {
    const auxiliary = element.name.startsWith('booleanKeys.') || Boolean(element.closest('.display-hidden'));
    const type = auxiliary ? 'hidden' : element instanceof HTMLSelectElement ? 'select' : element instanceof HTMLTextAreaElement ? 'textarea' : element.type || 'text';
    return {
      id: uniqueAdminId(used, element.id, `field-${index + 1}-${fieldIndex + 1}`),
      name: element.name,
      type,
      label: elementLabel(element, doc),
      value: element instanceof HTMLInputElement && element.type === 'file' ? '' : element.value,
      checked: element instanceof HTMLInputElement ? element.checked : false,
      disabled: element.disabled,
      required: element.required,
      placeholder: element.getAttribute('placeholder') || undefined,
      helpText: clean(element.closest('.form__item')?.querySelector('.help-text')?.textContent) || undefined,
      accept: element instanceof HTMLInputElement ? element.accept || undefined : undefined,
      multiple: element instanceof HTMLSelectElement || element instanceof HTMLInputElement ? element.multiple : undefined,
      options: element instanceof HTMLSelectElement
        ? Array.from(element.options).map((option) => ({ value: option.value, label: clean(option.textContent), selected: option.selected }))
        : undefined,
    } satisfies HydroAdminField;
  });
  const submits = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
    'button, input[type="submit"], input[type="button"]',
  )).map((element, submitIndex) => ({
    id: uniqueAdminId(used, element.id, `submit-${index + 1}-${submitIndex + 1}`),
    name: element.name || undefined,
    value: element instanceof HTMLInputElement ? element.value || undefined : element.getAttribute('value') || undefined,
    label: clean(element.textContent) || clean(element.getAttribute('aria-label')) || (element instanceof HTMLInputElement ? element.value : '') || '提交',
    action: internalPath(element.getAttribute('formaction'), form.getAttribute('action') || ''),
    method: element.getAttribute('formmethod') || form.getAttribute('method') || 'GET',
    enctype: element.getAttribute('formenctype') || form.getAttribute('enctype') || 'application/x-www-form-urlencoded',
  }));
  const links = Array.from(form.querySelectorAll<HTMLAnchorElement>('a[href]')).map((link, linkIndex) => ({
    id: uniqueAdminId(used, link.id, `form-${index + 1}-link-${linkIndex + 1}`),
    label: clean(link.textContent) || link.getAttribute('aria-label') || link.getAttribute('href') || '',
    href: link.getAttribute('href') || '',
  }));
  return {
    id: uniqueAdminId(used, form.id, `form-${index + 1}`),
    action: internalPath(form.getAttribute('action'), fallbackAction),
    method: (form.getAttribute('method') || 'GET').toUpperCase(),
    enctype: form.getAttribute('enctype') || 'application/x-www-form-urlencoded',
    title: headingFor(form, '设置表单'),
    fields,
    submits,
    links,
  };
}

function scrapeTables(root: Element, used: Set<string>): HydroAdminTable[] {
  return Array.from(root.querySelectorAll<HTMLTableElement>('table')).map((table, tableIndex) => ({
    id: uniqueAdminId(used, table.id, `table-${tableIndex + 1}`),
    title: headingFor(table.closest('.section') || table, '数据列表'),
    headers: Array.from(table.querySelectorAll('thead th, thead td')).map((cell) => clean(cell.textContent)),
    rows: Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).map((row, rowIndex) => ({
      id: uniqueAdminId(
        used,
        row.id,
        row.dataset.uid || row.dataset.gid || row.dataset.role || `row-${tableIndex + 1}-${rowIndex + 1}`,
      ),
      cells: Array.from(row.cells).map((cell) => ({
        text: clean(cell.textContent),
        href: cell.querySelector<HTMLAnchorElement>('a[href]')?.getAttribute('href') || undefined,
      })),
      attributes: Object.fromEntries(Array.from(row.attributes).map((attribute) => [attribute.name, attribute.value])),
    })),
  }));
}

function linkList(root: Element, used: Set<string>, prefix: string): HydroAdminLink[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).map((link, index) => ({
    id: uniqueAdminId(used, link.id, `${prefix}-link-${index + 1}`),
    label: clean(link.textContent) || link.getAttribute('aria-label') || link.getAttribute('href') || '',
    href: link.getAttribute('href') || '',
  }));
}

function virtualField(
  used: Set<string>,
  name: string,
  value = '',
  type = 'text',
  label = name,
  options?: HydroAdminField['options'],
): HydroAdminField {
  return {
    id: uniqueAdminId(used, '', `virtual-field-${name}`),
    name,
    type,
    label,
    value,
    checked: false,
    disabled: false,
    options,
  };
}

function virtualForm(
  used: Set<string>,
  path: string,
  title: string,
  fields: HydroAdminField[],
  submits: HydroAdminSubmit[] = [],
): HydroAdminForm {
  return {
    id: uniqueAdminId(used, '', `virtual-form-${used.size + 1}`),
    action: path,
    method: 'POST',
    enctype: 'application/x-www-form-urlencoded',
    title,
    fields,
    submits,
  };
}

function specialAdminForms(
  path: string,
  root: Element,
  forms: HydroAdminForm[],
  used: Set<string>,
): HydroAdminForm[] {
  const route = routePath(path);
  if (route === '/manage/config') {
    const textarea = root.querySelector<HTMLTextAreaElement>('[data-model="hydro://system/setting.yaml"], #config');
    return [virtualForm(used, path, '系统配置', [
      virtualField(used, 'value', textarea?.value || '', 'textarea', 'config'),
    ], [{ label: '保存' }])];
  }
  if (route === '/manage/script') {
    return Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr')).flatMap((row, rowIndex) => {
      const href = row.querySelector<HTMLAnchorElement>('a[href^="javascript:"]')?.getAttribute('href') || '';
      const id = href.match(/runScript\(\s*['"]([^'"]+)['"]\s*\)/)?.[1];
      if (!id) return [];
      return [virtualForm(used, path, clean(row.cells[1]?.textContent) || '运行脚本', [
        virtualField(used, 'id', id, 'hidden', 'ID'),
        virtualField(used, 'args', '{}', 'text', '参数'),
      ], [{ id: `script-submit-${rowIndex + 1}`, label: '运行' }])];
    });
  }
  if (route === '/manage/userimport') {
    const textarea = root.querySelector<HTMLTextAreaElement>('[name="users"]');
    return [virtualForm(used, path, '导入用户', [
      virtualField(used, 'users', textarea?.value || '', 'textarea', '用户'),
    ], [
      { id: 'user-import-preview', name: 'draft', value: 'true', label: '预览' },
      { id: 'user-import-submit', name: 'draft', value: 'false', label: '导入' },
    ])];
  }
  if (route === '/manage/userpriv') {
    return Array.from(root.querySelectorAll<HTMLElement>('[data-uid][data-priv]')).map((item, index) => {
      const isDefault = item.dataset.uid === 'default';
      return virtualForm(used, path, isDefault ? '默认用户权限' : `用户权限 ${item.dataset.uid}`, [
        virtualField(used, 'uid', isDefault ? '0' : item.dataset.uid || '', 'hidden', '用户 ID'),
        virtualField(used, 'priv', item.dataset.priv || '0', 'number', '权限值'),
        virtualField(used, 'system', String(isDefault), 'hidden', 'system'),
      ], [{ id: `user-priv-submit-${index + 1}`, label: '保存' }]);
    });
  }
  if (route === '/domain/user') {
    const roleOptions = Array.from(root.querySelector<HTMLSelectElement>('tbody select[name="role"]')?.options || [])
      .map((option) => ({ value: option.value, label: clean(option.textContent), selected: option.selected }));
    const addRoleOptions = roleOptions.filter((option) => option.value !== 'default');
    const result = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-uid]')).flatMap((row) => {
      const uid = row.dataset.uid || '';
      const role = row.querySelector<HTMLSelectElement>('select[name="role"]');
      if (!uid || !role || role.disabled) return [];
      const options = Array.from(role.options).map((option) => ({
        value: option.value,
        label: clean(option.textContent),
        selected: option.selected,
      }));
      return [
        virtualForm(used, path, `用户 ${uid}`, [
          virtualField(used, 'operation', 'set_user', 'hidden', 'operation'),
          virtualField(used, 'uid', uid, 'hidden', '用户 ID'),
          virtualField(used, 'role', role.value, 'select', '角色', options),
        ], [{ label: '保存' }]),
        virtualForm(used, path, `移除用户 ${uid}`, [
          virtualField(used, 'operation', 'set_user', 'hidden', 'operation'),
          virtualField(used, 'uid', uid, 'hidden', '用户 ID'),
          virtualField(used, 'role', 'default', 'hidden', '角色'),
        ], [{ label: '移除' }]),
      ];
    });
    result.unshift(virtualForm(used, path, '添加用户', [
      virtualField(used, 'operation', 'set_user', 'hidden', 'operation'),
      virtualField(used, 'uid', '', 'text', '用户 ID'),
      virtualField(used, 'role', addRoleOptions[0]?.value || '', 'select', '角色', addRoleOptions),
    ], [{ label: '添加' }]));
    return result;
  }
  if (route === '/domain/role') {
    const result = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-role]')).map((row) => virtualForm(used, path, `删除角色 ${row.dataset.role}`, [
      virtualField(used, 'operation', 'delete', 'hidden', 'operation'),
      virtualField(used, 'roles', row.dataset.role || '', 'hidden', '角色'),
    ], [{ label: '删除' }]));
    result.unshift(virtualForm(used, path, '创建角色', [
      virtualField(used, 'operation', 'add', 'hidden', 'operation'),
      virtualField(used, 'role', '', 'text', '角色名'),
    ], [{ label: '创建' }]));
    return result;
  }
  if (route === '/domain/group') {
    const result = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-gid]')).flatMap((row) => {
      const name = row.dataset.gid || '';
      return [
        virtualForm(used, path, `用户组 ${name}`, [
          virtualField(used, 'operation', 'update', 'hidden', 'operation'),
          virtualField(used, 'name', name, 'hidden', '组名'),
          virtualField(used, 'uids', row.querySelector<HTMLInputElement>('input[data-gid]')?.value || '', 'text', '用户 ID'),
        ], [{ label: '保存' }]),
        virtualForm(used, path, `删除用户组 ${name}`, [
          virtualField(used, 'operation', 'del', 'hidden', 'operation'),
          virtualField(used, 'name', name, 'hidden', '组名'),
        ], [{ label: '删除' }]),
      ];
    });
    result.unshift(virtualForm(used, path, '创建用户组', [
      virtualField(used, 'operation', 'update', 'hidden', 'operation'),
      virtualField(used, 'name', '', 'text', '组名'),
      virtualField(used, 'uids', '', 'text', '用户 ID'),
    ], [{ label: '创建' }]));
    return result;
  }
  return forms;
}

function pageActions(root: Element, path: string, used: Set<string>): HydroAdminAction[] {
  if ([
    '/manage/config',
    '/manage/script',
    '/manage/userimport',
    '/manage/userpriv',
    '/domain/user',
    '/domain/role',
    '/domain/group',
  ].includes(routePath(path))) return [];
  return Array.from(root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLAnchorElement>(
    'button, input[type="submit"], input[type="button"], a[data-operation], a[data-action]',
  )).filter((element) => !element.closest('form')).map((element, index) => actionFromElement(element, used, index));
}

export async function scrapeAdminPage(path: string): Promise<HydroAdminPage> {
  const doc = await readHydroPageResponse(path, false).then((result) => result.doc);
  const root = doc.querySelector('main, .main, #content') || doc.body;
  const used = new Set<string>();
  const forms = Array.from(root.querySelectorAll<HTMLFormElement>('form')).map((form, index) => scrapeForm(form, doc, index, used, path));
  const actions = pageActions(root, path, used);
  const pageForms = specialAdminForms(path, root, forms, used);
  return {
    id: uniqueAdminId(used, '', `page-${routePath(path).replace(/[^a-z0-9]+/gi, '-') || 'admin'}`),
    path,
    title: headingFor(root, path),
    forms: pageForms,
    tables: scrapeTables(root, used),
    actions,
    links: linkList(root, used, 'page'),
  };
}

export async function scrapeAdminForms(path: string): Promise<HydroAdminForm[]> {
  return (await scrapeAdminPage(path)).forms.map((form) => ({
    ...form,
    fields: form.fields.filter((field) => !field.disabled && field.type !== 'submit' && field.type !== 'button' && field.type !== 'file'),
  }));
}

export async function submitHydroAdminForm(
  path: string,
  method: string,
  fields: HydroFormInput,
  enctype?: string,
): Promise<HydroSubmitResult> {
  return submitHydro(path, fields, { method, enctype });
}

export async function scrapeProblemSolutions(pid: string, pageNumber = 1): Promise<ProblemSolutionsResult> {
  const page = await readHydroPageResponse(`/p/${encodeURIComponent(pid)}/solution?page=${pageNumber}`);
  if (!page.payload || !Array.isArray(page.payload.psdocs)) return { items: [], pageCount: 1, total: 0 };
  const items = page.payload.psdocs.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = textValue(item._id);
    if (!id) return [];
    const author = dictEntry(page.payload?.udict, item.owner);
    const status = dictEntry(page.payload?.pssdict, item.docId);
    const replies = Array.isArray(item.reply) ? item.reply.flatMap((reply) => {
      if (!isRecord(reply)) return [];
      const replyId = textValue(reply._id);
      if (!replyId) return [];
      const replyAuthor = dictEntry(page.payload?.udict, reply.owner);
      return [{ id: replyId, content: rawString(reply.content) ?? '', author: textValue(replyAuthor?.uname) || undefined, ownerId: numberValue(reply.owner) ?? undefined }];
    }) : [];
    return [{
      id,
      ownerId: numberValue(item.owner) ?? undefined,
      title: textValue(item.title) || undefined,
      content: rawString(item.content) ?? '',
      author: textValue(author?.uname) || undefined,
      updatedAt: textValue(item.updateAt) || undefined,
      vote: numberValue(item.vote) ?? 0,
      userVote: numberValue(status?.vote) ?? 0,
      replies,
    }];
  });
  return {
    items,
    pageCount: numberValue(page.payload.pcount) ?? 1,
    total: numberValue(page.payload.pscount) ?? items.length,
  };
}

export async function scrapeProblemStats(pid: string): Promise<ProblemStat[]> {
  const page = await readHydroPageResponse(`/p/${encodeURIComponent(pid)}/stat`);
  if (!page.payload || !Array.isArray(page.payload.rsdocs)) return [];
  return page.payload.rsdocs.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = textValue(item._id);
    if (!id) return [];
    const author = dictEntry(page.payload?.udict, item.uid);
    return [{ id, language: formatLanguage(item.lang), length: textValue(item.length) || undefined, time: formatTime(item.time), memory: formatMemory(item.memory), author: textValue(author?.uname) || undefined }];
  });
}

export async function scrapeProblemFiles(pid: string): Promise<ProblemFile[]> {
  const page = await readHydroPageResponse(`/p/${encodeURIComponent(pid)}/files`);
  if (!page.payload || !Array.isArray(page.payload.fragments)) return [];
  return page.payload.fragments.flatMap((fragment) => {
    if (!isRecord(fragment) || typeof fragment.html !== 'string') return [];
    return parseProblemFileHtml(fragment.html);
  });
}

export async function scrapeRecordDetail(rid: string, revision?: string): Promise<RecordDetail> {
  const query = revision ? `?rev=${encodeURIComponent(revision)}` : '';
  const page = await readHydroPageResponse(`/record/${rid}${query}`);
  const structuredDetail = page.payload ? parseRecordDetailPayload(page.payload, rid) : null;
  if (structuredDetail) return structuredDetail;
  const doc = page.doc;
  const detail: RecordDetail['detail'] = [];
  const terms = doc.querySelectorAll<HTMLElement>('.typo dt, .typo dd');
  for (let index = 0; index < terms.length; index += 2) {
    const label = clean(terms[index]?.textContent);
    const value = clean(terms[index + 1]?.textContent);
    if (label && value) detail.push({ label, value });
  }
  const problemAnchor = doc.querySelector<HTMLAnchorElement>('.typo a[href*="/p/"]');
  const submitter = detail.find((item) => item.label.includes('提交') || item.label.includes('Submit'));
  const language = detail.find((item) => item.label.includes('语言') || item.label.includes('Language'));
  return {
    rid,
    status: clean(doc.querySelector<HTMLElement>('.record-status--text')?.textContent) || undefined,
    score: clean(doc.querySelector<HTMLElement>('#status .section__title [style]')?.textContent) || undefined,
    progress: clean(doc.querySelector<HTMLElement>('#status .section__title')?.textContent),
    problem: clean(problemAnchor?.textContent),
    problemHref: problemAnchor?.getAttribute('href') ?? undefined,
    submitter: submitter?.value,
    language: language?.value,
    code: doc.querySelector<HTMLPreElement>('pre.line-numbers code')?.textContent ?? undefined,
    revisions: Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="?rev="]')).flatMap((anchor) => {
      const revisionId = new URL(anchor.href, window.location.href).searchParams.get('rev');
      return revisionId ? [{ id: revisionId, judgedAt: clean(anchor.textContent) }] : [];
    }),
    detail,
  };
}
