import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  LinearProgress, Paper, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Typography,
} from '@mui/material';
import { Check, CircleDot, Clock3, Code2, ListChecks, MessageCircleQuestion, Printer, Settings2, Square, Trophy, Users } from 'lucide-react';
import { useAuth } from '../auth';
import ConfirmDialog from '../components/ConfirmDialog';
import HydroAvatar from '../components/HydroAvatar';
import HydroWorkspaceButton from '../components/HydroWorkspaceButton';
import Markdown from '../components/Markdown';
import PageHeader from '../components/PageHeader';
import ScoreboardTable from '../components/ScoreboardTable';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchContest, localizedContent } from '../lib/api';
import { contestRuleMeta, contestSchedule, contestState, formatCountdown } from '../lib/contestRule';
import { hydroAvatarUrl, serverNow } from '../lib/endpoint';
import { formatDate, postHydroForm, scrapeContestParticipants, scrapeContestParticipation, scrapeContestProblems, scrapeContestScoreboard } from '../lib/scrape';
import type { ContestParticipant, ContestParticipation } from '../lib/scrape';
import type { HydroContest, HydroProblem, ScoreboardRow } from '../types';

type ContestTab = 'overview' | 'problems' | 'scoreboard';

function ruleDescription(rule?: string): string {
  const value = (rule ?? '').toLowerCase();
  if (/acm|icpc/.test(value)) return '按通过题数排名；题数相同时，总罚时更少者优先。';
  if (value === 'oi') return '按各题最终提交得分之和排名，以 Hydro 榜单结果为准。';
  if (value === 'ioi' || value === 'strictioi') return '按各题得分之和排名，以 Hydro 榜单结果为准。';
  if (value === 'ledo') return '按 Ledo 赛制计分，以 Hydro 实时榜单结果为准。';
  if (value === 'cf' || value === 'codeforces') return '按 Codeforces 赛制计分，以 Hydro 实时榜单结果为准。';
  return '排名和计分以 Hydro 榜单结果为准。';
}

export default function ContestDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const contestId = id ?? '';
  const [contest, setContest] = useState<HydroContest | null>(null);
  const [problems, setProblems] = useState<HydroProblem[] | null>(null);
  const [scoreboard, setScoreboard] = useState<{ headers: string[]; rows: ScoreboardRow[] } | null>(null);
  const [participation, setParticipation] = useState<ContestParticipation | null>(null);
  const [participants, setParticipants] = useState<ContestParticipant[]>([]);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [tab, setTab] = useState<ContestTab>('overview');
  const [now, setNow] = useState(serverNow());
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemError, setProblemError] = useState('');
  const [scoreboardError, setScoreboardError] = useState('');
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [earlyEndOpen, setEarlyEndOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setProblemError('');
    setScoreboardError('');
    if (!id) {
      setError('缺少比赛 ID。');
      setLoading(false);
      return;
    }
    try {
      const [data, nextParticipation, nextParticipants] = await Promise.all([
        fetchContest(id),
        user ? scrapeContestParticipation(id).catch(() => null) : Promise.resolve(null),
        user ? scrapeContestParticipants(id).catch(() => []) : Promise.resolve([]),
      ]);
      if (!data) {
        setError('比赛不存在或无权访问。');
        return;
      }
      const exactContest = { ...data, ...contestSchedule(data, nextParticipation), allowPrint: nextParticipation?.allowPrint ?? data.allowPrint };
      setContest(exactContest);
      setParticipation(nextParticipation);
      setParticipants(nextParticipants);
      const currentTime = serverNow();
      setNow(currentTime);
      const phase = contestState(exactContest, currentTime);
      if (phase === '未开始' || phase === '未知') {
        setProblems([]);
        setScoreboard(null);
        setTab('overview');
        return;
      }
      try {
        setScoreboard(await scrapeContestScoreboard(id));
      } catch (cause) {
        setScoreboard(null);
        setScoreboardError(cause instanceof Error ? cause.message : '排行榜暂时无法加载。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '比赛信息加载失败。');
    } finally {
      setLoading(false);
    }
  }, [id, user?._id]);

  const started = contest ? contestState(contest, now) !== '未开始' && contestState(contest, now) !== '未知' : false;

  const loadProblems = useCallback(async () => {
    if (!id || !user) return;
    setProblemLoading(true);
    setProblemError('');
    setProblems(null);
    try {
      const result = await scrapeContestProblems(id, contest?.pids ?? []);
      setProblems(result.problems);
      const expected = contest?.pids.length ?? 0;
      if (expected && result.problems.length !== expected) {
        setProblemError(`有 ${expected - result.problems.length} 道题未能加载，请刷新重试。`);
      }
      if (result.endAt) {
        setContest((current) => current ? { ...current, endAt: result.endAt! } : current);
      }
    } catch (cause) {
      setProblems([]);
      setProblemError(participation && !participation.attended
        ? '请先报名比赛后查看题目。'
        : cause instanceof Error ? cause.message : '题目暂时无法加载。');
    } finally {
      setProblemLoading(false);
    }
  }, [id, user?._id, contest?.pids, participation?.attended]);

  useEffect(() => {
    if (tab === 'problems' && started && user) void loadProblems();
  }, [tab, started, user?._id, loadProblems]);

  useEffect(() => {
    setContest(null);
    setProblems(null);
    setScoreboard(null);
    setParticipation(null);
    setParticipants([]);
    setTab('overview');
    void load();
  }, [load]);

  const phaseRef = useRef('');
  useEffect(() => {
    if (!contest) return;
    phaseRef.current = contestState(contest, serverNow());
    const timer = window.setInterval(() => {
      const nextNow = serverNow();
      setNow(nextNow);
      const nextPhase = contestState(contest, nextNow);
      if (nextPhase !== phaseRef.current) {
        phaseRef.current = nextPhase;
        if (nextPhase === '进行中' || nextPhase === '已结束') void load();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [contest?.beginAt, contest?.endAt, load]);

  if (loading && !contest) return <FullPageLoader />;
  if (error || !contest) return <ErrorBox message={error || '比赛不存在或无权访问。'} onRetry={id ? () => void load() : undefined} />;

  const stateLabel = contestState(contest, now);
  const state = {
    label: stateLabel,
    color: stateLabel === '未开始' ? 'warning' as const : stateLabel === '已结束' ? 'error' as const : stateLabel === '进行中' ? 'success' as const : 'default' as const,
  };
  const rule = contestRuleMeta(participation?.rule);
  const beginAt = Date.parse(contest.beginAt);
  const endAt = Date.parse(contest.endAt);
  const canViewScoreboard = Boolean(scoreboard) && !scoreboardError;
  const globalEndAt = Date.parse(participation?.globalEndAt ?? contest.endAt);
  const isAdmin = user?.role === 'root' || user?.role === 'admin';
  const canViewCode = isAdmin || (Number.isFinite(globalEndAt) && now >= globalEndAt);
  const canManageContest = isAdmin || user?._id === contest.owner;

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
      setActionError(cause instanceof Error ? cause.message : '结束我的比赛失败。');
    } finally {
      setActing(false);
    }
  };

  const registrationButton = !user && state.label !== '已结束' ? (
    <Button component={RouterLink} to="/login" state={{ from: location.pathname + location.search }} variant="contained" size="small">登录后报名</Button>
  ) : participation?.attended ? (
    <Button variant="outlined" size="small" startIcon={<Check size={16} />} disabled>已报名</Button>
  ) : user && participation && !participation.attended && state.label !== '已结束' ? (
    <Button variant="contained" size="small" onClick={() => participation.requiresCode ? setJoinOpen(true) : void joinContest()} disabled={acting}>{acting ? '报名中' : '报名比赛'}</Button>
  ) : null;

  return <Box>
    <PageHeader icon={<Trophy size={20} />} title={contest.title} actions={<>
      {user && participation?.attended ? <FormControlLabel control={<Switch checked={participation.subscribed} disabled={acting} onChange={(_event, checked) => void setSubscribed(checked)} />} label="比赛通知" /> : null}
      {user && participation?.attended && !participation.ended && state.label === '进行中' ? <Button color="error" size="small" startIcon={<Square size={14} />} onClick={() => setEarlyEndOpen(true)} disabled={acting}>结束我的比赛</Button> : null}
      {started && canViewScoreboard ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/scoreboard`} title="比赛完整榜单" size="small">完整榜单</HydroWorkspaceButton> : null}
      {canViewCode ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/code`} title="比赛代码" size="small" startIcon={<Code2 size={15} />}>比赛代码</HydroWorkspaceButton> : null}
      {user && participation?.attended && started ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/clarification`} title="比赛答疑" size="small" startIcon={<MessageCircleQuestion size={15} />}>比赛答疑</HydroWorkspaceButton> : null}
      {user ? <Button onClick={() => setParticipantsOpen(true)} size="small" startIcon={<Users size={15} />}>参赛选手</Button> : null}
      {contest.allowPrint && started ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/print`} title="打印题面" size="small" startIcon={<Printer size={15} />}>打印题面</HydroWorkspaceButton> : null}
      {canManageContest ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/edit`} title="编辑比赛" size="small" startIcon={<Settings2 size={15} />}>编辑比赛</HydroWorkspaceButton> : null}
      {canManageContest ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/balloon`} title="气球管理" size="small" startIcon={<CircleDot size={15} />}>气球管理</HydroWorkspaceButton> : null}
      {canManageContest ? <HydroWorkspaceButton path={`/contest/${encodeURIComponent(contestId)}/management`} title="管理比赛" size="small" startIcon={<Settings2 size={15} />}>管理比赛</HydroWorkspaceButton> : null}
    </>} />

    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Chip label={state.label} color={state.color} size="small" />
          {participation?.rule ? <Chip icon={<Trophy size={14} />} label={rule.label} size="small" sx={{ bgcolor: rule.color, color: rule.label === '作业' ? '#6f3030' : '#fff', '& .MuiChip-icon': { color: 'inherit' } }} /> : null}
          <Chip icon={<Clock3 size={14} />} label={`开始 ${formatDate(contest.beginAt)}`} variant="outlined" size="small" />
          <Chip icon={<Clock3 size={14} />} label={`结束 ${formatDate(contest.endAt)}`} variant="outlined" size="small" />
        </Stack>
        <Stack spacing={1.25} alignItems="flex-end">
          <Stack direction="row" spacing={3}>
            <Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">题目数</Typography><Typography sx={{ fontWeight: 800 }}>{contest.pids.length}</Typography></Box>
            <Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">参与人数</Typography><Typography sx={{ fontWeight: 800 }}>{contest.attend}</Typography></Box>
          </Stack>
          {registrationButton}
        </Stack>
      </Box>
      <Tabs value={tab} onChange={(_event, value: ContestTab) => setTab(value)} sx={{ px: { xs: 1, md: 1.5 }, mt: 1 }} aria-label="比赛内容">
        <Tab value="overview" label="比赛说明" />
        {started ? <Tab value="problems" label="题目列表" /> : null}
        {started ? <Tab value="scoreboard" label="排行榜" /> : null}
      </Tabs>
    </Paper>

    {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}
    {tab === 'overview' ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>比赛说明</Typography><Markdown content={localizedContent(contest.content) || '暂无比赛说明。'} /></Paper>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2.25 }}>
          <Typography sx={{ fontWeight: 800, color: state.color === 'success' ? 'success.main' : state.color === 'error' ? 'error.main' : 'text.primary' }}>{state.label === '未开始' ? `距离开始还有 ${formatCountdown(beginAt - now)}` : state.label === '进行中' ? `距离结束还有 ${formatCountdown(endAt - now)}` : state.label === '已结束' ? '比赛已经结束' : '比赛时间无效'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: registrationButton ? 1.5 : 0 }}>{participation?.attended ? '您已报名本场比赛。' : state.label === '未开始' ? '报名后请等待比赛开始，题目将自动开放。' : state.label === '进行中' ? '报名后即可进入比赛并查看题目。' : '比赛题目和排名可从上方页签查看。'}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.25 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>比赛信息</Typography><Stack spacing={1}>
          <Typography variant="body2">开始时间：{formatDate(contest.beginAt)}</Typography><Typography variant="body2">结束时间：{formatDate(contest.endAt)}</Typography><Typography variant="body2">比赛赛制：{participation?.rule ? rule.label : '以主办方设置为准'}</Typography><Typography variant="body2" color="text.secondary">{ruleDescription(participation?.rule)}</Typography>
        </Stack></Paper>
      </Stack>
    </Box> : null}

    {tab === 'problems' && started ? <Paper variant="outlined">
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}><Typography variant="h6" sx={{ fontWeight: 700 }}>题目列表</Typography></Box>
      {problemLoading ? <LinearProgress sx={{ m: 2 }} /> : null}
      {problemError ? <Alert severity="warning" sx={{ m: 2 }}>{problemError}</Alert> : null}
      {!problemLoading && problems && problems.length > 0 ? <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" aria-label="比赛题目列表">
        <TableHead><TableRow><TableCell>题号</TableCell><TableCell sx={{ minWidth: 240 }}>标题</TableCell><TableCell>通过 / 提交</TableCell>{isAdmin ? <TableCell align="right">操作</TableCell> : null}</TableRow></TableHead>
        <TableBody>{problems.map((problem, index) => {
          const problemId = problem.pid ?? String(problem.docId);
          return <TableRow key={problem._id} hover><TableCell>{String.fromCharCode(65 + index)}</TableCell><TableCell><RouterLink to={`/problem/${encodeURIComponent(problemId)}?tid=${encodeURIComponent(contestId)}`}>{problem.title || problemId}</RouterLink></TableCell><TableCell>{problem.nAccept ?? '-'} / {problem.nSubmit ?? '-'}</TableCell>{isAdmin ? <TableCell align="right"><HydroWorkspaceButton path={`/p/${encodeURIComponent(problemId)}/edit`} title="编辑比赛题目" size="small">编辑</HydroWorkspaceButton></TableCell> : null}</TableRow>;
        })}</TableBody>
      </Table></TableContainer> : problemError || problemLoading ? null : <EmptyBox message={participation && !participation.attended ? '请先报名比赛后查看题目' : '暂无题目'} />}
    </Paper> : null}

    {tab === 'scoreboard' && started ? <Box>{scoreboardError ? <Alert severity="warning" sx={{ mb: 2 }}>{scoreboardError}</Alert> : null}{scoreboard?.rows.length ? <ScoreboardTable title={`${rule.label} 排行榜`} headers={scoreboard.headers} rows={scoreboard.rows} /> : scoreboardError ? null : <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><ListChecks size={30} /><Typography sx={{ mt: 1, fontWeight: 700 }}>暂无排行榜数据</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{ruleDescription(participation?.rule)}</Typography></Paper>}</Box> : null}

    <Dialog open={joinOpen} onClose={() => { if (!acting) setJoinOpen(false); }} fullWidth maxWidth="xs"><DialogTitle>报名比赛</DialogTitle><DialogContent><TextField autoFocus fullWidth label="邀请码" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button color="inherit" onClick={() => setJoinOpen(false)} disabled={acting}>取消</Button><Button variant="contained" onClick={() => void joinContest()} disabled={acting || !inviteCode.trim()}>报名</Button></DialogActions></Dialog>
    <Dialog open={participantsOpen} onClose={() => setParticipantsOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>参赛选手（{participants.length}）</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {participants.length ? <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
          {participants.map((participant) => <Box key={participant.uid} component={RouterLink} to={`/user/${participant.uid}`} onClick={() => setParticipantsOpen(false)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.25, color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
            <HydroAvatar src={hydroAvatarUrl(participant.avatar, participant.uid)} name={participant.name} userId={participant.uid} size={36} />
            <Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{participant.name}</Typography><Typography variant="caption" color="text.secondary">UID {participant.uid}</Typography></Box>
          </Box>)}
        </Stack> : <EmptyBox message="暂无参赛选手" />}
      </DialogContent>
      <DialogActions><Button onClick={() => setParticipantsOpen(false)}>关闭</Button></DialogActions>
    </Dialog>
    <ConfirmDialog open={earlyEndOpen} title="结束我的比赛？" content="结束后将不能继续提交本场比赛，且此操作无法撤销。" confirmLabel="确认结束" destructive loading={acting} onConfirm={() => void earlyEnd()} onClose={() => setEarlyEndOpen(false)} />
  </Box>;
}
