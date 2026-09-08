import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel,
  Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { CircleDot, Code2, ExternalLink, MessageCircleQuestion, Printer, Settings2, Trophy, Users, Clock3, Square } from 'lucide-react';
import { useAuth } from '../auth';
import Markdown from '../components/Markdown';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchContest, fetchProblemsByIds, localizedContent } from '../lib/api';
import { postHydroForm, scrapeContestParticipation, scrapeContestScoreboard } from '../lib/scrape';
import type { ContestParticipation } from '../lib/scrape';
import { hydroPublicUrl } from '../lib/endpoint';
import type { ScoreboardRow } from '../types';
import type { HydroContest, HydroProblem } from '../types';

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface ContestState {
  label: string;
  color: 'default' | 'error' | 'success' | 'warning';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function getContestState(contest: HydroContest): ContestState {
  const begin = Date.parse(contest.beginAt);
  const end = Date.parse(contest.endAt);
  if (!Number.isFinite(begin) || !Number.isFinite(end)) return { label: '未知', color: 'default' };
  const now = Date.now();
  if (now < begin) return { label: '未开始', color: 'warning' };
  if (now > end) return { label: '已结束', color: 'error' };
  return { label: '进行中', color: 'success' };
}

export default function ContestDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const contestId = id ?? '';
  const [contest, setContest] = useState<HydroContest | null>(null);
  const [problems, setProblems] = useState<HydroProblem[] | null>(null);
  const [scoreboard, setScoreboard] = useState<{ headers: string[]; rows: ScoreboardRow[] } | null>(null);
  const [participation, setParticipation] = useState<ContestParticipation | null>(null);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [earlyEndOpen, setEarlyEndOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setContest(null);
    setProblems(null);
    setScoreboard(null);
    setParticipation(null);
    setLoading(true);
    setError('');
    if (!id) {
      setError('缺少比赛 ID。');
      setLoading(false);
      return;
    }
    try {
      const data = await fetchContest(id);
      if (!data) {
        setError('比赛不存在或无权访问。');
        return;
      }
      setContest(data);
      const [nextProblems, nextScoreboard, nextParticipation] = await Promise.all([
        fetchProblemsByIds(data.pids),
        scrapeContestScoreboard(id).catch(() => null),
        user ? scrapeContestParticipation(id).catch(() => null) : Promise.resolve(null),
      ]);
      setProblems(nextProblems);
      setScoreboard(nextScoreboard);
      setParticipation(nextParticipation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '比赛信息加载失败。');
    } finally {
      setLoading(false);
    }
  }, [id, user?._id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !contest) return <FullPageLoader />;
  if (error || !contest) {
    return <ErrorBox message={error || '比赛不存在或无权访问。'} onRetry={id ? () => void load() : undefined} />;
  }

  const state = getContestState(contest);

  const joinContest = async () => {
    if (acting) return;
    setActing(true);
    setActionError('');
    try {
      await postHydroForm(`/contest/${encodeURIComponent(contestId)}`, { operation: 'attend', code: inviteCode });
      setJoinOpen(false);
      setInviteCode('');
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '比赛报名失败。');
    } finally {
      setActing(false);
    }
  };

  const setSubscribed = async (subscribed: boolean) => {
    if (acting) return;
    setActing(true);
    setActionError('');
    try {
      await postHydroForm(`/contest/${encodeURIComponent(contestId)}`, { operation: 'subscribe', subscribe: String(subscribed) });
      setParticipation((current) => current ? { ...current, subscribed } : current);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '通知设置失败。');
    } finally {
      setActing(false);
    }
  };

  const earlyEnd = async () => {
    if (acting) return;
    setActing(true);
    setActionError('');
    try {
      await postHydroForm(`/contest/${encodeURIComponent(contestId)}`, { operation: 'early_end' });
      setEarlyEndOpen(false);
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '提前结束比赛失败。');
    } finally {
      setActing(false);
    }
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
              <Trophy size={21} />
              {contest.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
              <Chip label={state.label} color={state.color} size="small" />
              <Chip icon={<Clock3 size={14} />} label={`开始 ${formatDate(contest.beginAt)}`} variant="outlined" size="small" />
              <Chip icon={<Clock3 size={14} />} label={`结束 ${formatDate(contest.endAt)}`} variant="outlined" size="small" />
              <Chip icon={<Users size={14} />} label={`参与 ${contest.attend}`} variant="outlined" size="small" />
            </Box>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {user && participation && !participation.attended && state.label !== '已结束' ? (
              <Button variant="contained" size="small" onClick={() => participation.requiresCode ? setJoinOpen(true) : void joinContest()} disabled={acting}>
                {acting ? '报名中' : '报名比赛'}
              </Button>
            ) : null}
            {user && participation?.attended ? (
              <FormControlLabel
                control={<Switch checked={participation.subscribed} disabled={acting} onChange={(_event, checked) => void setSubscribed(checked)} />}
                label="比赛通知"
              />
            ) : null}
            {user && participation?.attended && !participation.ended && state.label === '进行中' ? (
              <Button color="error" size="small" startIcon={<Square size={14} />} onClick={() => setEarlyEndOpen(true)} disabled={acting}>提前结束</Button>
            ) : null}
            <Button
              component="a"
              href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/scoreboard`)}
              target="_blank"
              rel="noreferrer"
              size="small"
              endIcon={<ExternalLink size={15} />}
            >
              完整榜单
            </Button>
            <Button
              component="a"
              href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/code`)}
              target="_blank"
              rel="noreferrer"
              size="small"
              startIcon={<Code2 size={15} />}
            >
              比赛代码
            </Button>
            {user && participation?.attended ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/clarification`)} target="_blank" rel="noreferrer" size="small" startIcon={<MessageCircleQuestion size={15} />}>比赛答疑</Button> : null}
            {user ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/user`)} target="_blank" rel="noreferrer" size="small" startIcon={<Users size={15} />}>参赛用户</Button> : null}
            {contest.allowPrint ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/print`)} target="_blank" rel="noreferrer" size="small" startIcon={<Printer size={15} />}>打印题面</Button> : null}
            {user?.role === 'root' ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/balloon`)} target="_blank" rel="noreferrer" size="small" startIcon={<CircleDot size={15} />}>气球管理</Button> : null}
            {user?.role === 'root' ? (
              <Button
                component="a"
                href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/management`)}
                target="_blank"
                rel="noreferrer"
                size="small"
                startIcon={<Settings2 size={15} />}
              >
                管理比赛
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Paper>

      {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          比赛说明
        </Typography>
        <Markdown content={localizedContent(contest.content) || '暂无比赛说明。'} />
      </Paper>

      {scoreboard?.rows.length ? (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>排行榜</Typography>
          </Box>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 620 }} aria-label="比赛排行榜">
              {scoreboard.headers.length ? <TableHead><TableRow>{scoreboard.headers.map((header, index) => <TableCell key={index}>{header || `列 ${index + 1}`}</TableCell>)}</TableRow></TableHead> : null}
              <TableBody>{scoreboard.rows.map((row, index) => <TableRow key={index} hover>{row.cells.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell || '-'}</TableCell>)}</TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      <Paper variant="outlined">
        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            题目列表
          </Typography>
        </Box>
        {problems && problems.length > 0 ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="比赛题目列表">
              <TableHead>
                <TableRow>
                  <TableCell>题号</TableCell>
                  <TableCell sx={{ minWidth: 240 }}>标题</TableCell>
                  <TableCell>通过 / 提交</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {problems.map((problem) => {
                  const problemId = problem.pid ?? String(problem.docId);
                  const target = `/problem/${encodeURIComponent(problemId)}?tid=${encodeURIComponent(contestId)}`;
                  return (
                    <TableRow key={problem._id} hover>
                      <TableCell>{problemId}</TableCell>
                      <TableCell>
                        <RouterLink to={target}>{problem.title || problemId}</RouterLink>
                      </TableCell>
                      <TableCell>{problem.nAccept ?? '-'} / {problem.nSubmit ?? '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyBox message="暂无题目" />
        )}
      </Paper>
      <Dialog open={joinOpen} onClose={() => { if (!acting) setJoinOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle>报名比赛</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="邀请码" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setJoinOpen(false)} disabled={acting}>取消</Button>
          <Button variant="contained" onClick={() => void joinContest()} disabled={acting || !inviteCode.trim()}>报名</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={earlyEndOpen} onClose={() => { if (!acting) setEarlyEndOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle>提前结束比赛？</DialogTitle>
        <DialogContent><DialogContentText>结束后将不能继续提交本场比赛，且此操作无法撤销。</DialogContentText></DialogContent>
        <DialogActions><Button color="inherit" onClick={() => setEarlyEndOpen(false)} disabled={acting}>取消</Button><Button color="error" variant="contained" onClick={() => void earlyEnd()} disabled={acting}>确认结束</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
