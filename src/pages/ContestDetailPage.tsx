import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Paper, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Typography,
} from '@mui/material';
import { Check, CircleDot, Clock3, Code2, ExternalLink, ListChecks, MessageCircleQuestion, Printer, Settings2, Square, Trophy, Users } from 'lucide-react';
import { useAuth } from '../auth';
import ConfirmDialog from '../components/ConfirmDialog';
import HydroAvatar from '../components/HydroAvatar';
import Markdown from '../components/Markdown';
import PageHeader from '../components/PageHeader';
import ScoreboardTable from '../components/ScoreboardTable';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchContest, fetchProblemsByIds, localizedContent } from '../lib/api';
import { contestRuleMeta } from '../lib/contestRule';
import { hydroAvatarUrl, hydroPublicUrl } from '../lib/endpoint';
import { formatDate, postHydroForm, scrapeContestParticipants, scrapeContestParticipation, scrapeContestScoreboard } from '../lib/scrape';
import type { ContestParticipant, ContestParticipation } from '../lib/scrape';
import type { HydroContest, HydroProblem, ScoreboardRow } from '../types';

type ContestTab = 'overview' | 'problems' | 'scoreboard';

function getContestState(contest: HydroContest, now: number) {
  const begin = Date.parse(contest.beginAt);
  const end = Date.parse(contest.endAt);
  if (!Number.isFinite(begin) || !Number.isFinite(end)) return { label: '未知', color: 'default' as const };
  if (now < begin) return { label: '未开始', color: 'warning' as const };
  if (now >= end) return { label: '已结束', color: 'error' as const };
  return { label: '进行中', color: 'success' as const };
}

function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [days ? `${days} 天` : '', `${hours} 小时`, `${minutes} 分`, `${rest} 秒`].filter(Boolean).join(' ');
}

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
  const [now, setNow] = useState(Date.now());
  const [contentError, setContentError] = useState('');
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
    setContentError('');
    if (!id) {
      setError('缺少比赛 ID。');
      setLoading(false);
      return;
    }
    try {
      const [data, nextParticipation, nextParticipants] = await Promise.all([
        fetchContest(id),
        scrapeContestParticipation(id).catch(() => null),
        user ? scrapeContestParticipants(id).catch(() => []) : Promise.resolve([]),
      ]);
      if (!data) {
        setError('比赛不存在或无权访问。');
        return;
      }
      const exactContest = {
        ...data,
        beginAt: nextParticipation?.beginAt ?? data.beginAt,
        endAt: nextParticipation?.endAt ?? data.endAt,
      };
      setContest(exactContest);
      setParticipation(nextParticipation);
      setParticipants(nextParticipants);
      const currentTime = Date.now();
      if (currentTime < Date.parse(exactContest.beginAt)) {
        setProblems([]);
        setScoreboard(null);
        setTab('overview');
        return;
      }
      const canViewContent = currentTime >= Date.parse(exactContest.endAt) || Boolean(nextParticipation?.attended) || user?.role === 'root';
      if (!canViewContent) {
        setProblems([]);
        setScoreboard(null);
        setTab('overview');
        return;
      }
      const [problemResult, scoreboardResult] = await Promise.allSettled([
        fetchProblemsByIds(exactContest.pids, id),
        scrapeContestScoreboard(id),
      ]);
      setProblems(problemResult.status === 'fulfilled' ? problemResult.value : []);
      setScoreboard(scoreboardResult.status === 'fulfilled' ? scoreboardResult.value : null);
      if (problemResult.status === 'rejected') {
        setContentError(problemResult.reason instanceof Error ? problemResult.reason.message : '题目暂时无法加载。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '比赛信息加载失败。');
    } finally {
      setLoading(false);
    }
  }, [id, user?._id]);

  useEffect(() => {
    setContest(null);
    setProblems(null);
    setScoreboard(null);
    setParticipation(null);
    setParticipants([]);
    setTab('overview');
    void load();
  }, [load]);

  useEffect(() => {
    if (!contest) return;
    const begin = Date.parse(contest.beginAt);
    let reloaded = Date.now() >= begin;
    const timer = window.setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (!reloaded && nextNow >= begin) {
        reloaded = true;
        void load();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [contest?.beginAt, load]);

  if (loading && !contest) return <FullPageLoader />;
  if (error || !contest) return <ErrorBox message={error || '比赛不存在或无权访问。'} onRetry={id ? () => void load() : undefined} />;

  const state = getContestState(contest, now);
  const started = state.label === '进行中' || state.label === '已结束';
  const canViewContent = state.label === '已结束' || Boolean(participation?.attended) || user?.role === 'root';
  const rule = contestRuleMeta(participation?.rule);
  const beginAt = Date.parse(contest.beginAt);

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

  const registrationButton = !user ? (
    <Button component={RouterLink} to="/login" state={{ from: location.pathname + location.search }} variant="contained" size="small">登录后报名</Button>
  ) : participation?.attended ? (
    <Button variant="outlined" size="small" startIcon={<Check size={16} />} disabled>已报名</Button>
  ) : participation && !participation.attended && state.label !== '已结束' ? (
    <Button variant="contained" size="small" onClick={() => participation.requiresCode ? setJoinOpen(true) : void joinContest()} disabled={acting}>{acting ? '报名中' : '报名比赛'}</Button>
  ) : null;

  return <Box>
    <PageHeader icon={<Trophy size={20} />} title={contest.title} actions={<>
      {user && participation?.attended ? <FormControlLabel control={<Switch checked={participation.subscribed} disabled={acting} onChange={(_event, checked) => void setSubscribed(checked)} />} label="比赛通知" /> : null}
      {user && participation?.attended && !participation.ended && state.label === '进行中' ? <Button color="error" size="small" startIcon={<Square size={14} />} onClick={() => setEarlyEndOpen(true)} disabled={acting}>提前结束</Button> : null}
      {started ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/scoreboard`)} target="_blank" rel="noreferrer" size="small" endIcon={<ExternalLink size={15} />}>完整榜单</Button> : null}
      {started ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/code`)} target="_blank" rel="noreferrer" size="small" startIcon={<Code2 size={15} />}>比赛代码</Button> : null}
      {user && participation?.attended && started ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/clarification`)} target="_blank" rel="noreferrer" size="small" startIcon={<MessageCircleQuestion size={15} />}>比赛答疑</Button> : null}
      {user ? <Button onClick={() => setParticipantsOpen(true)} size="small" startIcon={<Users size={15} />}>参赛选手</Button> : null}
      {contest.allowPrint && started ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/print`)} target="_blank" rel="noreferrer" size="small" startIcon={<Printer size={15} />}>打印题面</Button> : null}
      {user?.role === 'root' ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/balloon`)} target="_blank" rel="noreferrer" size="small" startIcon={<CircleDot size={15} />}>气球管理</Button> : null}
      {user?.role === 'root' ? <Button component="a" href={hydroPublicUrl(`/contest/${encodeURIComponent(contestId)}/management`)} target="_blank" rel="noreferrer" size="small" startIcon={<Settings2 size={15} />}>管理比赛</Button> : null}
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
        {started && canViewContent ? <Tab value="problems" label="题目列表" /> : null}
        {started && canViewContent ? <Tab value="scoreboard" label="排行榜" /> : null}
      </Tabs>
    </Paper>

    {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}
    {tab === 'overview' ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>比赛说明</Typography><Markdown content={localizedContent(contest.content) || '暂无比赛说明。'} /></Paper>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2.25 }}>
          <Typography sx={{ fontWeight: 800, color: state.color === 'success' ? 'success.main' : state.color === 'error' ? 'error.main' : 'text.primary' }}>{state.label === '未开始' ? `距离开始还有 ${formatCountdown(beginAt - now)}` : state.label === '进行中' ? '比赛正在进行' : '比赛已经结束'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: registrationButton ? 1.5 : 0 }}>{participation?.attended ? '您已报名本场比赛。' : state.label === '未开始' ? '报名后请等待比赛开始，题目将自动开放。' : state.label === '进行中' ? '报名后即可进入比赛并查看题目。' : '比赛题目和排名可从上方页签查看。'}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.25 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>比赛信息</Typography><Stack spacing={1}>
          <Typography variant="body2">开始时间：{formatDate(contest.beginAt)}</Typography><Typography variant="body2">结束时间：{formatDate(contest.endAt)}</Typography><Typography variant="body2">比赛赛制：{participation?.rule ? rule.label : '以主办方设置为准'}</Typography><Typography variant="body2" color="text.secondary">{ruleDescription(participation?.rule)}</Typography>
        </Stack></Paper>
      </Stack>
    </Box> : null}

    {tab === 'problems' && started ? <Paper variant="outlined">
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}><Typography variant="h6" sx={{ fontWeight: 700 }}>题目列表</Typography></Box>
      {contentError ? <Alert severity="warning" sx={{ m: 2 }}>{contentError}</Alert> : null}
      {problems && problems.length > 0 ? <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" aria-label="比赛题目列表">
        <TableHead><TableRow><TableCell>题号</TableCell><TableCell sx={{ minWidth: 240 }}>标题</TableCell><TableCell>通过 / 提交</TableCell></TableRow></TableHead>
        <TableBody>{problems.map((problem, index) => {
          const problemId = problem.pid ?? String(problem.docId);
          return <TableRow key={problem._id} hover><TableCell>{String.fromCharCode(65 + index)}</TableCell><TableCell><RouterLink to={`/problem/${encodeURIComponent(problemId)}?tid=${encodeURIComponent(contestId)}`}>{problem.title || problemId}</RouterLink></TableCell><TableCell>{problem.nAccept ?? '-'} / {problem.nSubmit ?? '-'}</TableCell></TableRow>;
        })}</TableBody>
      </Table></TableContainer> : contentError ? null : <EmptyBox message={participation && !participation.attended ? '请先报名比赛后查看题目' : '暂无题目'} />}
    </Paper> : null}

    {tab === 'scoreboard' && started ? scoreboard?.rows.length ? <ScoreboardTable title={`${rule.label} 排行榜`} headers={scoreboard.headers} rows={scoreboard.rows} /> : <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><ListChecks size={30} /><Typography sx={{ mt: 1, fontWeight: 700 }}>暂无排行榜数据</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{ruleDescription(participation?.rule)}</Typography></Paper> : null}

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
    <ConfirmDialog open={earlyEndOpen} title="提前结束比赛？" content="结束后将不能继续提交本场比赛，且此操作无法撤销。" confirmLabel="确认结束" destructive loading={acting} onConfirm={() => void earlyEnd()} onClose={() => setEarlyEndOpen(false)} />
  </Box>;
}
