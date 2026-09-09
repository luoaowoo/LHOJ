import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, LinearProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Bell, CheckCircle2, ChevronDown, CircleUserRound, ExternalLink, Globe2, Image, Search, Settings2, ShieldCheck, Trophy, Wrench } from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchUserByIdentifier } from '../lib/api';
import { hydroAvatarUrl, hydroPublicUrl } from '../lib/endpoint';
import { difficultyColor } from '../lib/difficulty';
import { parseRp, ratingColor } from '../lib/rating';
import { formatDate, scrapeProblemRows } from '../lib/scrape';
import { usePreferences } from '../prefs';
import type { HydroUser, ProblemRow } from '../types';

function profileMetric(info: Record<string, unknown> | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const value = info?.[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

export default function UserPage() {
  const { uname } = useParams();
  const { user: sessionUser } = useAuth();
  const { usernameColoring } = usePreferences();
  const [profile, setProfile] = useState<HydroUser | null>(uname ? null : sessionUser);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(uname));
  const [tab, setTab] = useState<'profile' | 'solved' | 'compare' | 'rating'>('profile');
  const [compareInput, setCompareInput] = useState('');
  const [compareUser, setCompareUser] = useState<HydroUser | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [solvedProblems, setSolvedProblems] = useState<ProblemRow[] | null>(null);
  const [solvedLoading, setSolvedLoading] = useState(false);
  const [solvedError, setSolvedError] = useState('');

  useEffect(() => {
    if (!uname) {
      setLoading(false);
      setProfile(sessionUser);
      setError('');
      return;
    }

    let active = true;
    setLoading(true);
    setProfile(null);
    setError('');
    fetchUserByIdentifier(uname)
      .then((user) => {
        if (!active) return;
        if (!user) {
          setError('用户不存在或无权访问。');
          return;
        }
        setProfile(user);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : '用户资料加载失败。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uname, sessionUser]);

  useEffect(() => {
    if (tab !== 'solved' || solvedProblems || solvedLoading || !profile || profile._id !== sessionUser?._id) return;
    let active = true;
    setSolvedLoading(true);
    setSolvedError('');
    void (async () => {
      try {
        const rows: ProblemRow[] = [];
        // ponytail: cap at 20 pages; switch to a server aggregate when the site exceeds 1,000 problems.
        for (let page = 1; page <= 20; page += 1) {
          const next = await scrapeProblemRows({ page: String(page) });
          rows.push(...next);
          if (!next.length) break;
        }
        if (active) setSolvedProblems(rows.filter((problem) => /通过|accepted|\bac\b/i.test(problem.status ?? '')));
      } catch (cause) {
        if (active) setSolvedError(cause instanceof Error ? cause.message : '做题数据加载失败。');
      } finally {
        if (active) setSolvedLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile, sessionUser?._id, solvedProblems, tab]);

  if (loading) return <FullPageLoader />;
  if (error || !profile) {
    return <ErrorBox message={error || '请先登录后查看个人中心。'} />;
  }

  const initials = profile.uname.trim().slice(0, 2).toUpperCase() || '?';
  const encodedUname = encodeURIComponent(profile.uname);
  const canOpenOriginal = typeof profile._id === 'number';
  const ownProfile = !uname || profile._id === sessionUser?._id;
  const nameColor = usernameColoring === 'rp' ? ratingColor(parseRp(profile.rpInfo)) : undefined;
  const metrics = [
    { label: 'RP', value: profileMetric(profile.rpInfo, ['rp', 'rating', 'score']) },
    { label: '排名', value: profileMetric(profile.rpInfo, ['rank', 'ranking']) },
    { label: '通过题目', value: profileMetric(profile.rpInfo, ['accept', 'accepted', 'nAccept']) },
  ].filter((item): item is { label: string; value: string } => item.value !== null);
  const accountLinks: Array<{ label: string; description: string; path: string; icon: typeof Settings2; internal?: boolean }> = [
    { label: '账户设置', description: '个人资料与账户字段', path: '/account-settings/account', icon: Settings2, internal: true },
    { label: '安全设置', description: '密码和登录安全', path: '/security', icon: ShieldCheck, internal: true },
    { label: '站内消息', description: '查看通知与私信', path: '/messages', icon: Bell, internal: true },
    { label: '更换头像', description: '管理个人头像', path: '/home/avatar', icon: Image },
    { label: '我的域', description: '域成员与权限', path: '/home/domain', icon: Globe2 },
  ];
  const compare = async () => {
    const target = compareInput.trim();
    if (!target || compareLoading) return;
    setCompareLoading(true);
    try { setCompareUser(await fetchUserByIdentifier(target)); }
    finally { setCompareLoading(false); }
  };
  const ratingHistory = Object.values(profile.rpInfo ?? {}).find((value) => Array.isArray(value)) as unknown[] | undefined;
  const solvedGroups = (() => {
    const groups = new Map<string, ProblemRow[]>();
    for (const problem of solvedProblems ?? []) {
      const difficulty = problem.difficulty || '未评定';
      groups.set(difficulty, [...(groups.get(difficulty) ?? []), problem]);
    }
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right, 'zh-CN'));
  })();
  const solvedCount = solvedProblems?.length ?? 0;
  const maxDifficultyCount = Math.max(1, ...solvedGroups.map(([, problems]) => problems.length));
  const nextMilestone = Math.max(50, Math.ceil((solvedCount + 1) / 50) * 50);

  return (
    <Box>
      <PageHeader icon={<CircleUserRound size={20} />} title="个人中心" />
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Avatar
          src={hydroAvatarUrl(profile.avatarUrl, profile._id)}
          onError={(event) => event.currentTarget.removeAttribute('src')}
          alt=""
          sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 26 }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: nameColor ?? 'text.primary' }}>
            {profile.displayName || profile.uname}
          </Typography>
          {profile.displayName ? <Typography variant="body2" color="text.secondary">@{profile.uname}</Typography> : null}
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {profile.mail || '未设置邮箱'}
          </Typography>
          <Typography color="text.secondary">
            {profile.role || 'Hydro User'}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          <Button component={RouterLink} to={`/records?uidOrName=${encodedUname}`} variant="contained">
            我的评测
          </Button>
          {canOpenOriginal && (
            <Button
              component="a"
              href={hydroPublicUrl(`/user/${encodedUname}`)}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
            >
              Hydro 原始页面
            </Button>
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ mt: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_event, value: 'profile' | 'solved' | 'compare' | 'rating') => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="用户资料页签">
          <Tab value="profile" label="个人简介" />
          <Tab value="solved" label="通过的题目" />
          <Tab value="compare" label="做题对比" />
          <Tab value="rating" label="Rating 历史" />
        </Tabs>
        {tab === 'solved' ? <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          {!ownProfile ? <Alert severity="info">Hydro 未向公开个人资料提供逐题通过状态。</Alert> : solvedLoading ? <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={28} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>正在整理做题数据</Typography></Box> : solvedError ? <Alert severity="error">{solvedError}</Alert> : <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.2 }}>
              {[
                { label: '总通过', value: solvedCount, icon: CheckCircle2 },
                { label: '覆盖难度', value: solvedGroups.length, icon: Trophy },
                { label: '下一里程碑', value: `${nextMilestone} 题`, icon: CircleUserRound },
              ].map(({ label, value, icon: Icon }) => <Paper key={label} variant="outlined" sx={{ p: 1.7 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Icon size={18} color="currentColor" /><Typography variant="caption" color="text.secondary">{label}</Typography></Box><Typography variant="h5" sx={{ mt: .8, fontWeight: 700 }}>{value}</Typography></Paper>)}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(260px, .9fr)' }, gap: 1.5, mt: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>难度分布</Typography>
                {solvedGroups.length ? <Stack spacing={1.1}>{solvedGroups.map(([difficulty, problems]) => <Box key={difficulty}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: .45 }}><Typography variant="body2">{difficulty}</Typography><Typography variant="caption" color="text.secondary">{problems.length}</Typography></Box><LinearProgress variant="determinate" value={(problems.length / maxDifficultyCount) * 100} sx={{ height: 7, borderRadius: 1, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: difficultyColor(difficulty), borderRadius: 1 } }} /></Box>)}</Stack> : <Typography variant="body2" color="text.secondary">暂无通过记录</Typography>}
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>做题进度</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .6 }}>下一里程碑 {nextMilestone} 题</Typography>
                <LinearProgress variant="determinate" value={Math.min(100, (solvedCount / nextMilestone) * 100)} sx={{ mt: 2, height: 9, borderRadius: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{solvedCount} / {nextMilestone}，还差 {nextMilestone - solvedCount} 题</Typography>
              </Paper>
            </Box>

            <Paper variant="outlined" sx={{ mt: 1.5, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5 }}><Typography sx={{ fontWeight: 700 }}>通过的题目</Typography></Box>
              <Divider />
              {solvedGroups.length ? solvedGroups.map(([difficulty, problems]) => <Accordion key={difficulty} disableGutters elevation={0} square sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ChevronDown size={18} />}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: difficultyColor(difficulty) }} /><Typography sx={{ fontWeight: 600 }}>{difficulty}</Typography><Chip size="small" label={`${problems.length} 题`} /></Box></AccordionSummary>
                <AccordionDetails sx={{ pt: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: .7 }}>{problems.map((problem) => <Button key={problem.docId} component={RouterLink} to={`/problem/${encodeURIComponent(problem.pid || String(problem.docId))}`} color="inherit" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>{problem.pid} {problem.title}</Button>)}</AccordionDetails>
              </Accordion>) : <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">暂无通过记录</Typography></Box>}
            </Paper>
          </>}
        </Box> : null}
        {tab === 'compare' ? <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography sx={{ fontWeight: 700 }}>做题对比</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>选择另一位用户，查看双方已有的通过题目和 Rating 数据。</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField fullWidth size="small" label="用户 ID 或用户名" value={compareInput} onChange={(event) => setCompareInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void compare(); }} InputProps={{ startAdornment: <Search size={17} style={{ marginRight: 8 }} /> }} />
            <Button variant="contained" onClick={() => void compare()} disabled={!compareInput.trim() || compareLoading}>{compareLoading ? <CircularProgress size={18} color="inherit" /> : '开始对比'}</Button>
          </Box>
          {compareUser ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 2 }}>
            {[{ label: profile.displayName || profile.uname, user: profile }, { label: compareUser.displayName || compareUser.uname, user: compareUser }].map((item) => <Paper key={item.user._id} variant="outlined" sx={{ p: 2 }}><Typography sx={{ fontWeight: 700, mb: 1.2 }}>{item.label}</Typography><Stack spacing={0.8}><Typography variant="body2">通过题目：{profileMetric(item.user.rpInfo, ['accept', 'accepted', 'nAccept']) || '暂无数据'}</Typography><Typography variant="body2">Rating：{profileMetric(item.user.rpInfo, ['rp', 'rating', 'score']) || '暂无数据'}</Typography><Typography variant="body2">注册时间：{formatDate(item.user.regat)}</Typography></Stack></Paper>)}
          </Box> : <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>输入用户名或用户 ID 后开始对比。</Typography>}
        </Box> : null}
        {tab === 'rating' ? <Box sx={{ p: { xs: 2, md: 2.5 } }}><Typography sx={{ fontWeight: 700 }}>Rating 历史</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>展示 Hydro 返回的历史 Rating 数据。</Typography>{ratingHistory?.length ? <Stack spacing={1}>{ratingHistory.map((item, index) => <Paper key={index} variant="outlined" sx={{ p: 1.5 }}><Typography variant="body2">{typeof item === 'string' ? item : JSON.stringify(item)}</Typography></Paper>)}</Stack> : <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 3, textAlign: 'center', color: 'text.secondary' }}><Typography>暂无 Rating 历史数据</Typography></Box>}</Box> : null}
      </Paper>

      {tab === 'profile' ? <Paper variant="outlined" sx={{ mt: 2, p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>账户概览</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
          {[
            { label: '注册日期', value: formatDate(profile.regat) },
            { label: '最近登录', value: formatDate(profile.loginat) },
            ...metrics,
          ].map((item) => (
            <Box key={item.label}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography sx={{ mt: 0.25, fontWeight: 650 }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>
      </Paper> : null}

      {ownProfile && tab === 'profile' ? (
        <Paper variant="outlined" sx={{ mt: 2, overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.6 }}>
            <Typography variant="h6">账户管理</Typography>
          </Box>
          <Divider />
          <List disablePadding aria-label="账户管理">
            {accountLinks.map((item, index) => (
              <ListItem key={item.path} disablePadding divider={index < accountLinks.length - 1}>
                <ListItemButton
                  component={item.internal ? RouterLink : 'a'}
                  {...(item.internal ? { to: item.path } : { href: hydroPublicUrl(item.path), target: '_blank', rel: 'noreferrer' })}
                  sx={{ minHeight: 58, px: { xs: 2, md: 2.5 } }}
                >
                  <ListItemIcon sx={{ minWidth: 42 }}><item.icon size={19} /></ListItemIcon>
                  <ListItemText primary={item.label} secondary={item.description} />
                  {!item.internal ? <ExternalLink size={16} aria-hidden="true" /> : null}
                </ListItemButton>
              </ListItem>
            ))}
            {profile.role === 'root' ? (
              <ListItem disablePadding>
                <ListItemButton
                  component="a"
                  href={hydroPublicUrl('/manage')}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ minHeight: 58, px: { xs: 2, md: 2.5 } }}
                >
                  <ListItemIcon sx={{ minWidth: 42 }}><Wrench size={19} /></ListItemIcon>
                  <ListItemText primary="系统管理" secondary="Hydro 管理控制台" />
                  <ExternalLink size={16} aria-hidden="true" />
                </ListItemButton>
              </ListItem>
            ) : null}
          </List>
        </Paper>
      ) : null}
    </Box>
  );
}
