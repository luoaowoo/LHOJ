import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Divider, LinearProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { Clock3, Code2, Cpu, Download, HardDrive, ListChecks, RefreshCw, ShieldAlert, UserRound, XCircle } from 'lucide-react';
import { useAuth } from '../auth';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusChip from '../components/StatusChip';
import ConfettiCelebration from '../components/ConfettiCelebration';
import CodeEditor from '../components/CodeEditor';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { postHydroForm, scrapeRecordDetail } from '../lib/scrape';
import { hydroPublicUrl, hydroWebSocketUrl } from '../lib/endpoint';
import { hydroWorkspaceHref } from '../lib/hydro-workspace';
import type { RecordDetail } from '../types';
import { usePreferences } from '../prefs';

function detailValue(items: RecordDetail['detail'], patterns: RegExp[]) {
  return items.find((item) => patterns.some((pattern) => pattern.test(item.label)))?.value || '';
}

function recordEditorLanguage(language?: string): string {
  const value = (language ?? '').toLowerCase();
  if (value.includes('c++') || value.includes('cpp') || value === 'cc') return 'cpp';
  if (value === 'c') return 'c';
  if (value.includes('python') || value === 'py') return 'python';
  if (value.includes('java')) return 'java';
  if (value.includes('javascript') || value === 'js' || value.includes('node')) return 'javascript';
  if (value.includes('typescript') || value === 'ts') return 'typescript';
  if (value.includes('rust') || value === 'rs') return 'rust';
  if (value.includes('go')) return 'go';
  if (value.includes('kotlin') || value === 'kt') return 'kotlin';
  if (value.includes('php')) return 'php';
  if (value.includes('ruby') || value === 'rb') return 'ruby';
  if (value.includes('c#') || value.includes('csharp') || value === 'cs') return 'csharp';
  return 'plaintext';
}

export default function RecordDetailPage() {
  const { user } = useAuth();
  const { confettiEmojis } = usePreferences();
  const { rid } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const revision = searchParams.get('rev') ?? '';
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [realtime, setRealtime] = useState(false);
  const [acting, setActing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [tab, setTab] = useState<'result' | 'code'>('result');
  const [celebrating, setCelebrating] = useState(false);
  const previousStatus = useRef<string | null>(null);
  const celebrate = useCallback(() => setCelebrating(true), []);

  useEffect(() => {
    if (!rid) {
      setLoading(false);
      setError('缺少评测记录编号');
      return;
    }
    let cancelled = false;
    setLoading(detail === null);
    setError('');
    scrapeRecordDetail(rid, revision || undefined)
      .then((data) => {
        if (cancelled) return;
        const wasPending = /Waiting|Running|Compiling|Fetched|Pending|Queued|Judging|等待|运行|编译|排队|评测/i.test(previousStatus.current ?? '');
        const accepted = /Accepted|通过|\bAC\b/i.test(data?.status ?? '');
        const marker = `lh-oj.confetti-shown.${rid}`;
        if (!revision && accepted && !localStorage.getItem(marker) && (wasPending || !previousStatus.current)) {
          localStorage.setItem(marker, '1');
          celebrate();
        }
        previousStatus.current = data?.status ?? null;
        setDetail(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '评测详情加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [celebrate, rid, reloadKey, revision]);

  useEffect(() => {
    if (revision || !rid || !detail?.domainId || !/Waiting|Running|Compiling|Fetched|Pending|Queued|Judging|等待|运行|编译|排队|评测/i.test(detail.status ?? '')) return;
    const query = new URLSearchParams({ domainId: detail.domainId, rid, noTemplate: 'true' });
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryCount = 0;
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(hydroWebSocketUrl(`/record-detail-conn?${query}`));
      socket.onopen = () => {
        retryCount = 0;
        setRealtime(true);
      };
      socket.onmessage = () => {
        if (document.visibilityState === 'visible') setReloadKey((value) => value + 1);
      };
      socket.onerror = () => setRealtime(false);
      socket.onclose = () => {
        setRealtime(false);
        if (!disposed) {
          const delay = Math.min(1000 * 2 ** retryCount, 30_000);
          retryCount += 1;
          retryTimer = window.setTimeout(connect, delay);
        }
      };
    };
    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
      setRealtime(false);
    };
  }, [rid, revision, detail?.domainId, detail?.status]);

  useEffect(() => {
    if (revision || realtime || !rid || !detail || !/Waiting|Running|Compiling|Fetched|Pending|Queued|Judging|等待|运行|编译|排队|评测/i.test(detail.status ?? '')) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') setReloadKey((value) => value + 1);
    };
    const timer = window.setInterval(refresh, 6000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [rid, revision, detail, realtime]);

  if (loading && !detail) return <FullPageLoader />;
  if (error && !detail) return <ErrorBox message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  if (!detail) return <EmptyBox message="暂无评测详情" />;

  const runOperation = async (operation: 'rejudge' | 'cancel') => {
    if (!rid || acting) return;
    setActing(true);
    setActionError('');
    try {
      await postHydroForm(`/record/${encodeURIComponent(rid)}`, { operation });
      setCancelOpen(false);
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '评测操作失败。');
    } finally {
      setActing(false);
    }
  };

  const judge = detailValue(detail.detail, [/评测机|judge|judger/i]) || 'LH评测机';
  const submittedAt = detailValue(detail.detail, [/提交时间|评测时间|submit|judged/i]);
  const totalTime = detailValue(detail.detail, [/总时间|运行时间|time/i]);
  const totalMemory = detailValue(detail.detail, [/总内存|内存|memory/i]);
  const infoRows = [
    { icon: UserRound, label: '用户', value: detail.submitter || detailValue(detail.detail, [/提交者|用户|user/i]) || '—' },
    { icon: ListChecks, label: '题目', value: detail.problem || '—' },
    { icon: Clock3, label: '时间', value: submittedAt || '—' },
    { icon: Code2, label: '语言', value: detail.language || detailValue(detail.detail, [/语言|language/i]) || '—' },
    { icon: Clock3, label: '总时间', value: totalTime || '—' },
    { icon: HardDrive, label: '总内存', value: totalMemory || '—' },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {celebrating ? <ConfettiCelebration emojis={confettiEmojis} onDone={() => setCelebrating(false)} /> : null}
      {loading ? <LinearProgress aria-label="正在更新评测状态" /> : null}
      {error ? (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => setReloadKey((value) => value + 1)}>重试</Button>}>
          状态更新失败：{error}
        </Alert>
      ) : null}
      {actionError ? <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 310px' }, gap: 2, alignItems: 'start' }}>
      <Paper variant="outlined" sx={{ p: { xs: 1.4, sm: 2.2 }, minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <StatusChip text={detail.status ?? '未知'} score={detail.score} />
          {detail.progress ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{detail.progress}</Typography>
          ) : null}
          {detail.score ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>得分 {detail.score}</Typography> : null}
          <Box sx={{ flex: 1 }} />
          {detail.revisions.length ? (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel id="record-revision-label">评测版本</InputLabel>
              <Select
                labelId="record-revision-label"
                label="评测版本"
                value={revision}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value) next.set('rev', event.target.value);
                  else next.delete('rev');
                  setSearchParams(next);
                }}
              >
                <MenuItem value="">最新版本</MenuItem>
                {detail.revisions.map((item) => <MenuItem key={item.id} value={item.id}>{item.judgedAt || item.id}</MenuItem>)}
              </Select>
            </FormControl>
          ) : null}
          {user?.role === 'root' && !revision ? (
            <>
              <Button size="small" color="inherit" startIcon={<RefreshCw size={15} />} disabled={acting} onClick={() => void runOperation('rejudge')}>
                重测
              </Button>
              <Button size="small" color="error" startIcon={<XCircle size={15} />} disabled={acting} onClick={() => setCancelOpen(true)}>
                取消结果
              </Button>
            </>
          ) : null}
          {user && !revision && detail.hackable && detail.userAccepted && detail.ownerId !== user._id && /Accepted|通过/i.test(detail.status ?? '') && detail.pid ? (
            <Button
              component={RouterLink}
              to={`/problem/${encodeURIComponent(detail.pid)}/hack/${encodeURIComponent(rid ?? '')}${detail.contestId ? `?tid=${encodeURIComponent(detail.contestId)}` : ''}`}
              size="small"
              color="error"
              startIcon={<ShieldAlert size={15} />}
            >
              Hack
            </Button>
          ) : null}
          <Button
            component="a"
            href={hydroPublicUrl(`/record/${rid}?download=true`)}
            size="small"
            startIcon={<Download size={15} />}
          >
            下载代码
          </Button>
          <Button
            component={RouterLink}
            to={hydroWorkspaceHref(`/record/${rid}`, 'Hydro 评测详情')}
            size="small"
          >
            完整评测工作区
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, value: 'result' | 'code') => setTab(value)} sx={{ mt: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="result" label="评测结果" />
          <Tab value="code" label="代码" />
        </Tabs>
        {tab === 'result' ? (
          detail.testCases?.length ? <Box sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
              <Typography variant="h5" sx={{ color: /Accepted|通过|AC/i.test(detail.status ?? '') ? 'success.main' : 'text.primary' }}>{detail.score || '—'}</Typography>
              <Typography sx={{ fontWeight: 650 }}>{detail.status || '未知状态'}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 1.2 }}>
            {detail.testCases.map((testCase, index) => <Paper key={index} variant="outlined" sx={{ p: 1.3, minHeight: 104, borderColor: /Accepted|通过|AC/i.test(testCase.status) ? 'success.main' : undefined }}>
              <Typography variant="caption" color="text.secondary">#{index + 1}</Typography>
              <Typography sx={{ mt: 1, fontWeight: 700, color: /Accepted|通过|AC/i.test(testCase.status) ? 'success.main' : 'text.primary' }}>{testCase.status}</Typography>
              <Typography variant="caption" color="text.secondary">{testCase.time || '—'} / {testCase.memory || '—'}</Typography>
              {testCase.message ? <Typography variant="caption" display="block" sx={{ mt: .5, wordBreak: 'break-word' }}>{testCase.message}</Typography> : null}
            </Paper>)}
            </Box>
          </Box> : <EmptyBox message="暂无测试点数据" />
        ) : detail.code ? <Box sx={{ mt: 2 }}><CodeEditor value={detail.code} onChange={() => undefined} language={recordEditorLanguage(detail.language)} readOnly minHeight={520} /></Box> : <EmptyBox message="暂无代码" />}
      </Paper>
      <Paper component="aside" variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>评测 #{detail.rid}</Typography>
        <Stack spacing={1.5}>{infoRows.map(({ icon: Icon, label, value }) => <Box key={label} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}><Icon size={17} color="currentColor" /><Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography></Box></Box>)}</Stack>
        <Divider sx={{ my: 1.8 }} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Cpu size={17} /><Typography variant="body2">{judge}</Typography><Chip size="small" label="评测" /></Box>
      </Paper>
      </Box>
      <ConfirmDialog
        open={cancelOpen}
        title="取消评测结果？"
        content="该记录会被标记为已取消，分数、时间和内存数据将清零。"
        confirmLabel="确认取消"
        cancelLabel="返回"
        destructive
        loading={acting}
        onConfirm={() => void runOperation('cancel')}
        onClose={() => setCancelOpen(false)}
      />
    </Box>
  );
}
