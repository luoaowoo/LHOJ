import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Avatar, Box, Button, CircularProgress, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Bell, CircleUserRound, ExternalLink, Globe2, Image, Search, Settings2, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchUserByIdentifier } from '../lib/api';
import { hydroAvatarUrl, hydroPublicUrl } from '../lib/endpoint';
import { parseRp, ratingColor } from '../lib/rating';
import { formatDate } from '../lib/scrape';
import { usePreferences } from '../prefs';
import type { HydroUser } from '../types';

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
  const [tab, setTab] = useState<'profile' | 'compare' | 'rating'>('profile');
  const [compareInput, setCompareInput] = useState('');
  const [compareUser, setCompareUser] = useState<HydroUser | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

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
        <Tabs value={tab} onChange={(_event, value: 'profile' | 'compare' | 'rating') => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="用户资料页签">
          <Tab value="profile" label="个人简介" />
          <Tab value="compare" label="做题对比" />
          <Tab value="rating" label="Rating 历史" />
        </Tabs>
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
