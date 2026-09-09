import type { HydroContest, HydroProblem, HydroUser } from '../types';
import { ensureEndpoint, fetchRead, hydroLoginUrl, hydroLogoutUrl, hydroNativeUrl, hydroUrl, requestSignal } from './endpoint';
import { scrapeProblemRows } from './scrape';
import { ApiError, sessionExpiredError } from './errors';

export { ApiError } from './errors';

export function localizedContent(value: unknown, language = 'zh'): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return value;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of [language, 'zh', 'en']) {
      if (typeof parsed[key] === 'string') return parsed[key];
    }
    const first = Object.values(parsed).find((item): item is string => typeof item === 'string');
    return first ?? value;
  } catch {
    return value;
  }
}

async function parseGraphqlResponse<T>(response: Response): Promise<T> {
  let payload: { data?: T; errors?: Array<{ message: string }> };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Hydro 返回了非 JSON 响应，请检查代理地址。');
  }
  if (!response.ok) {
    throw new ApiError(payload.errors?.[0]?.message ?? `请求失败（${response.status}）`);
  }
  if (payload.errors?.length) {
    throw new ApiError(payload.errors.map((item) => item.message).join('；'));
  }
  return payload.data as T;
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  await ensureEndpoint();
  let response: Response;
  try {
    response = await fetchRead(hydroUrl('/api'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      credentials: 'include',
    });
  } catch {
    throw new ApiError('无法连接 Hydro 服务，请检查网络或反向代理。');
  }
  return parseGraphqlResponse<T>(response);
}

const userFields = `
  _id
  uname
  displayName
  mail
  role
  loginat
  regat
  avatarUrl
  rpInfo
`;

interface UserData {
  user: HydroUser | null;
}

export function currentUser(): Promise<HydroUser | null> {
  return gql<UserData>(`query { user { ${userFields} } }`).then((data) => data.user);
}

export async function fetchUserByUname(uname: string): Promise<HydroUser | null> {
  const data = await gql<{ user: HydroUser | null }>(
    `query User($uname: String!) { user(uname: $uname) { ${userFields} } }`,
    { uname },
  );
  return data.user;
}

export async function login(uname: string, password: string, remember: boolean, tfa = ''): Promise<void> {
  await ensureEndpoint();
  const body = new URLSearchParams({
    uname,
    password,
    rememberme: remember ? 'on' : '',
    login_submit: '',
    tfa,
    authnChallenge: '',
  });
  let response: Response;
  try {
    response = await fetch(hydroLoginUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html, application/json',
      },
      body,
      credentials: 'include',
      redirect: 'manual',
      signal: requestSignal(),
    });
  } catch {
    throw new ApiError('无法连接 Hydro 登录服务，请检查网络或数据来源设置。');
  }
  if (![200, 301, 302, 303].includes(response.status)) {
    const text = await response.text().catch(() => '');
    let message = '';
    try {
      const json = JSON.parse(text);
      message = json?.error?.message ?? json?.message ?? '';
    } catch {
      const title = text.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
      const paragraph = text.match(/<p>([^<]*)<\/p>/)?.[1] ?? '';
      message = title.includes('错误') ? paragraph || title : title || paragraph;
    }
    throw new ApiError(message || `登录失败（HTTP ${response.status}）`);
  }
}

export async function logout(): Promise<void> {
  await ensureEndpoint();
  await fetch(hydroLogoutUrl(), { method: 'GET', credentials: 'include', redirect: 'manual', signal: requestSignal() });
}

const problemFields = `
  _id
  domainId
  docId
  docType
  pid
  title
  content
  data { name size lastModified }
  additional_file { name size lastModified }
  nSubmit
  nAccept
  difficulty
  tag
  hidden
`;

interface ProblemData {
  problem: HydroProblem | null;
}

export function fetchProblem(value: string): Promise<HydroProblem | null> {
  const numeric = /^\d+$/.test(value);
  const query = `query Problem($id: Int, $pid: String) {
    problem(id: $id, pid: $pid) { ${problemFields} }
  }`;
  return gql<ProblemData>(query, numeric ? { id: Number(value), pid: null } : { id: null, pid: value })
    .then((data) => data.problem);
}

interface ProblemsData {
  problems: HydroProblem[] | null;
}

export async function fetchProblemsByIds(ids: number[]): Promise<HydroProblem[]> {
  if (!ids.length) return [];
  const data = await gql<ProblemsData>(
    `query Problems($ids: [Int]) { problems(ids: $ids) {
      ${problemFields}
    } }`,
    { ids },
  );
  return data.problems ?? [];
}

const problemScanLimit = Number(import.meta.env.VITE_PROBLEM_SCAN_LIMIT ?? 1200);

export async function fetchProblemRange(limit = problemScanLimit): Promise<HydroProblem[]> {
  const ids: number[] = [];
  const seen = new Set<number>();
  const pageSize = 20;
  for (let page = 1; ids.length < limit; page += 1) {
    const rows = await scrapeProblemRows({ page: String(page) });
    const fresh = rows
      .map((row) => row.docId)
      .filter((docId) => Number.isInteger(docId) && docId > 0 && !seen.has(docId));
    if (!fresh.length) break;
    fresh.forEach((docId) => seen.add(docId));
    ids.push(...fresh);
    if (rows.length < pageSize) break;
  }
  const problems: HydroProblem[] = [];
  for (let start = 0; start < ids.length; start += 100) {
    problems.push(...await fetchProblemsByIds(ids.slice(start, start + 100)));
  }
  return problems.filter((problem) => !problem.hidden).slice(0, limit);
}

interface ContestData {
  contest: HydroContest | null;
}

export function fetchContest(id: string): Promise<HydroContest | null> {
  return gql<ContestData>(
    `query Contest($id: ObjectID!) {
      contest(id: $id) {
        _id domainId docId owner beginAt title content endAt attend pids rated
      }
    }`,
    { id },
  ).then((data) => data.contest);
}

export interface SubmitResult {
  rid?: string;
  location?: string;
}

export interface SubmitConfig {
  problem: HydroProblem;
  languages: Array<{ value: string; label: string }>;
}

export async function fetchSubmitConfig(pid: string, tid?: string): Promise<SubmitConfig> {
  await ensureEndpoint();
  const query = tid ? `?tid=${encodeURIComponent(tid)}` : '';
  let response: Response;
  try {
    response = await fetchRead(hydroNativeUrl(`/p/${encodeURIComponent(pid)}/submit${query}`), {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
  } catch {
    throw new ApiError('无法读取题目的提交配置。');
  }
  if (!response.ok) throw new ApiError(`无法读取提交配置（HTTP ${response.status}）。`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Hydro 返回了无效的提交配置。');
  }
  if (!payload || typeof payload !== 'object') throw new ApiError('Hydro 返回了无效的提交配置。');
  const body = payload as Record<string, unknown>;
  if (!body.pdoc || typeof body.pdoc !== 'object') throw new ApiError('题目不存在或当前账号无权提交。');
  const problem = body.pdoc as HydroProblem & { config?: { langs?: unknown } };
  const labels = body.langRange && typeof body.langRange === 'object'
    ? body.langRange as Record<string, unknown>
    : {};
  const configured = Array.isArray(problem.config?.langs)
    ? problem.config.langs.filter((value): value is string => typeof value === 'string')
    : Object.keys(labels);
  const languages = configured.map((value) => ({
    value,
    label: typeof labels[value] === 'string' ? labels[value] : value,
  }));
  return { problem, languages };
}

export async function submitCode(pid: string, lang: string, code: string, tid?: string): Promise<SubmitResult> {
  await ensureEndpoint();
  const body = new URLSearchParams({
    lang,
    code,
    login_submit: '',
    pretest: '',
    input: '',
  });
  return submitProblemBody(pid, body, tid, {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'text/html, application/json',
  });
}

export async function submitFile(pid: string, lang: string, file: File, tid?: string): Promise<SubmitResult> {
  await ensureEndpoint();
  const body = new FormData();
  body.set('lang', lang);
  body.set('file', file, file.name);
  body.set('login_submit', '');
  body.set('pretest', '');
  body.set('input', '');
  return submitProblemBody(pid, body, tid);
}

export async function submitPretest(pid: string, lang: string, code: string, input: string, tid?: string): Promise<SubmitResult> {
  await ensureEndpoint();
  const body = new URLSearchParams({ lang, code, pretest: 'true', input });
  return submitProblemBody(pid, body, tid, {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'text/html, application/json',
  });
}

export async function submitHack(pid: string, targetRid: string, input: string, file?: File, tid?: string): Promise<SubmitResult> {
  await ensureEndpoint();
  const body = new FormData();
  body.set('input', input);
  body.set('autoOrganizeInput', 'true');
  if (file) body.set('file', file, file.name);
  const query = tid ? `?tid=${encodeURIComponent(tid)}` : '';
  let response: Response;
  try {
    response = await fetch(hydroNativeUrl(`/p/${encodeURIComponent(pid)}/hack/${encodeURIComponent(targetRid)}${query}`), {
      method: 'POST',
      headers: { Accept: 'text/html, application/json' },
      body,
      credentials: 'include',
      redirect: 'follow',
      signal: requestSignal(),
    });
  } catch {
    throw new ApiError('Hack 提交失败：无法连接 Hydro 服务。');
  }
  const recordMatch = response.url.match(/\/record\/([0-9a-fA-F]{24})/);
  if (recordMatch) return { rid: recordMatch[1], location: response.url };
  const text = await response.text().catch(() => '');
  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    if (typeof payload.rid === 'string') return { rid: payload.rid, location: response.url };
    if (typeof payload.url === 'string' && payload.url.includes('/login')) throw sessionExpiredError();
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
  }
  throw new ApiError(response.ok ? 'Hydro 未返回 Hack 评测编号。' : `Hack 提交失败（HTTP ${response.status}）。`);
}

async function submitProblemBody(
  pid: string,
  body: BodyInit,
  tid?: string,
  headers: HeadersInit = { Accept: 'text/html, application/json' },
): Promise<SubmitResult> {
  let response: Response;
  try {
    const query = tid ? `?tid=${encodeURIComponent(tid)}` : '';
    response = await fetch(hydroNativeUrl(`/p/${encodeURIComponent(pid)}/submit${query}`), {
      method: 'POST',
      headers,
      body,
      credentials: 'include',
      redirect: 'follow',
      signal: requestSignal(),
    });
  } catch {
    throw new ApiError('提交失败：无法连接 Hydro 服务。');
  }
  const location = response.url;
  const recordMatch = location.match(/\/record\/([0-9a-fA-F]{24})/);
  if (recordMatch) return { rid: recordMatch[1], location };
  if (location.includes('/login')) throw sessionExpiredError();
  if (response.redirected) return { location };
  const text = await response.text().catch(() => '');
  try {
    const bodyJson = JSON.parse(text) as Record<string, unknown>;
    if (typeof bodyJson.url === 'string' && /^\/login(?:[/?#]|$)/.test(bodyJson.url)) throw sessionExpiredError();
    if (typeof bodyJson.rid === 'string' || typeof bodyJson.rid === 'number') {
      return { rid: String(bodyJson.rid), location };
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
  }
  const title = text.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  if (title.includes('错误') || response.status >= 400) {
    throw new ApiError('提交失败：请确认题目允许该语言，并检查提交内容。');
  }
  return { location };
}
