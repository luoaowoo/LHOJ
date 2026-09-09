import { Fragment, useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { Download, ExternalLink, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../auth';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusChip from '../components/StatusChip';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { postHydroForm, scrapeRecordDetail } from '../lib/scrape';
import { hydroPublicUrl, hydroWebSocketUrl } from '../lib/endpoint';
import type { RecordDetail } from '../types';

export default function RecordDetailPage() {
  const { user } = useAuth();
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
  }, [rid, reloadKey, revision]);

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

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {loading ? <LinearProgress aria-label="正在更新评测状态" /> : null}
      {error ? (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => setReloadKey((value) => value + 1)}>重试</Button>}>
          状态更新失败：{error}
        </Alert>
      ) : null}
      {actionError ? <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert> : null}
      <Paper variant="outlined" sx={{ p: { xs: 1.8, sm: 2.4 } }}>
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
            component="a"
            href={hydroPublicUrl(`/record/${rid}`)}
            target="_blank"
            rel="noreferrer"
            size="small"
            endIcon={<ExternalLink size={15} />}
          >
            Hydro 原始页面
          </Button>
        </Box>

        {detail.problem ? (
          detail.problemHref ? (
            <Typography
              component={RouterLink}
              to={`/problem/${encodeURIComponent(detail.problemHref.split('/').filter(Boolean).pop() ?? '')}`}
              variant="subtitle1"
              sx={{ display: 'inline-block', mt: 1.8, fontWeight: 650, color: 'primary.main' }}
            >
              {detail.problem}
            </Typography>
          ) : <Typography variant="subtitle1" sx={{ mt: 1.8, fontWeight: 650 }}>{detail.problem}</Typography>
        ) : null}

        {detail.detail.length > 0 ? (
          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(120px, 0.8fr) 1fr', sm: 'minmax(160px, 0.7fr) 1fr' },
              gap: 0.75,
              alignItems: 'start',
            }}
          >
            {detail.detail.map((item, index) => (
              <Fragment key={`${item.label}-${index}`}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
                <Typography variant="body2" sx={{ minWidth: 0, wordBreak: 'break-word' }}>{item.value}</Typography>
              </Fragment>
            ))}
          </Box>
        ) : null}
      </Paper>

      {detail.testCases?.length ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow>
                <TableCell>测试点</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>得分</TableCell>
                <TableCell>时间</TableCell>
                <TableCell>内存</TableCell>
                <TableCell>信息</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.testCases.map((testCase, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell><StatusChip text={testCase.status} score={testCase.score} /></TableCell>
                  <TableCell>{testCase.score || '-'}</TableCell>
                  <TableCell>{testCase.time || '-'}</TableCell>
                  <TableCell>{testCase.memory || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 360, wordBreak: 'break-word' }}>{testCase.message || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {detail.code ? (
        <Paper
          component="pre"
          variant="outlined"
          sx={{
            m: 0,
            p: 2,
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: 'pre',
          }}
        >
          {detail.code}
        </Paper>
      ) : null}
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
