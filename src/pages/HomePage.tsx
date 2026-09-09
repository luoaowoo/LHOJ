import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import {
  ArrowRight, BookOpen, CalendarDays, ClipboardList, GraduationCap, ListChecks,
  BarChart3, Megaphone, MessageSquare, Settings2, Trophy,
} from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import Markdown from '../components/Markdown';
import HomeCarousel from '../components/HomeCarousel';
import StatusChip from '../components/StatusChip';
import { fetchHomepageConfig } from '../lib/homepage';
import type { CarouselSlide } from '../lib/homepage';
import { scrapeContestRows, scrapeUnsolvedProblems } from '../lib/scrape';
import type { ContestRow, UnsolvedProblem } from '../types';

const cards = [
  { to: '/problems', title: '题库', body: '题目列表', icon: BookOpen },
  { to: '/records', title: '评测记录', body: '提交与评测', icon: ListChecks },
  { to: '/contests', title: '比赛', body: '赛程与赛况', icon: Trophy },
  { to: '/training', title: '训练', body: '章节与进度', icon: GraduationCap },
  { to: '/homework', title: '作业', body: '题目与截止时间', icon: ClipboardList },
  { to: '/discuss', title: '讨论', body: '题解与交流', icon: MessageSquare },
  { to: '/ranking', title: '排行榜', body: '用户排名与 RP', icon: BarChart3 },
  { to: '/settings', title: '外观', body: '主题与色板', icon: Settings2 },
];

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 3, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">{children}</Typography>
    </Box>
  );
}

function UnsolvedPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<UnsolvedProblem[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return undefined;
    let active = true;
    setItems(null); setError('');
    void scrapeUnsolvedProblems(user.uname)
      .then((rows) => { if (active) setItems(rows); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '未完成题目加载失败。'); });
    return () => { active = false; };
  }, [user]);
  useEffect(load, [load]);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 700 }}>未完成的题目</Typography>
        {user ? (
          <Button component={RouterLink} to={`/records?uidOrName=${encodeURIComponent(user.uname)}`} size="small">
            全部记录
          </Button>
        ) : null}
      </Box>
      {/* The homepage is public, so never fire an authenticated scrape for guests. */}
      {!user ? (
        <PanelMessage>
          登录后可以在这里看到尝试过但还没通过的题目。
          <Box sx={{ mt: 1.5 }}>
            <Button component={RouterLink} to="/login" size="small" variant="contained">去登录</Button>
          </Box>
        </PanelMessage>
      ) : error ? (
        <Box sx={{ px: 2, py: 3, display: 'grid', placeItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="error" role="alert">{error}</Typography>
          <Button size="small" onClick={load}>重试</Button>
        </Box>
      ) : !items ? (
        <Box sx={{ px: 2, py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={22} /></Box>
      ) : !items.length ? (
        <PanelMessage>最近没有未完成的题目，继续加油。</PanelMessage>
      ) : (
        <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
          {items.map((item) => (
            <Button
              key={item.pid}
              component={RouterLink}
              to={`/problem/${encodeURIComponent(item.pid)}`}
              color="inherit"
              sx={{ minHeight: 58, px: 2, py: 1, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 0 }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>{item.title}</Typography>
                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <StatusChip text={item.status} />
                  <Typography variant="caption" color="text.secondary">
                    {item.attempts} 次尝试
                  </Typography>
                </Box>
              </Box>
            </Button>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function RecentContestsPanel() {
  const [items, setItems] = useState<ContestRow[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setItems(null); setError('');
    void scrapeContestRows(1)
      .then((rows) => setItems(rows.slice(0, 5)))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '比赛加载失败。'));
  }, []);
  useEffect(load, [load]);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 700 }}>最近比赛</Typography>
        <Button component={RouterLink} to="/contests" size="small">全部比赛</Button>
      </Box>
      {error ? (
        <Box sx={{ px: 2, py: 3, display: 'grid', placeItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="error">{error}</Typography>
          <Button size="small" onClick={load}>重试</Button>
        </Box>
      ) : !items ? (
        <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={22} /></Box>
      ) : !items.length ? (
        <PanelMessage>暂无比赛</PanelMessage>
      ) : (
        <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
          {items.map((item) => (
            <Button
              key={item.id}
              component={RouterLink}
              to={`/contests/${encodeURIComponent(item.id)}`}
              color="inherit"
              sx={{ px: 2, py: 1.25, minHeight: 68, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 0 }}
            >
              <Box sx={{ minWidth: 0, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{item.title || '未命名比赛'}</Typography>
                <Stack direction="row" spacing={0.6} useFlexGap sx={{ mt: 0.7, flexWrap: 'wrap' }}>
                  {item.rule ? <Chip icon={<Trophy size={12} />} label={item.rule} size="small" color="success" sx={{ height: 23 }} /> : null}
                  <Chip icon={<CalendarDays size={12} />} label={item.date || '时间待定'} size="small" variant="outlined" sx={{ height: 23, maxWidth: '100%' }} />
                </Stack>
              </Box>
            </Button>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState('');
  const [slides, setSlides] = useState<CarouselSlide[]>([]);

  useEffect(() => {
    let active = true;
    void fetchHomepageConfig()
      .then((config) => {
        if (!active) return;
        setAnnouncement(config.announcement);
        setSlides(config.slides);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <Box>
      <PageHeader
        title={user ? `欢迎回来，${user.uname}` : '欢迎来到 LH-oj'}
        subtitle="LH-oj · 成就龙中学子信竞梦"
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 2, alignItems: 'start' }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <HomeCarousel slides={slides} />
          {announcement ? (
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Megaphone size={18} />
                <Typography sx={{ fontWeight: 700 }}>公告</Typography>
              </Box>
              <Markdown content={announcement} />
            </Paper>
          ) : null}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1.5, md: 2 } }}>
            {cards.map((card) => (
              <Card key={card.to} sx={{ height: '100%' }} variant="outlined">
                <CardActionArea component={RouterLink} to={card.to} sx={{ height: '100%', p: 2.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.2 }}>
                    <card.icon size={21} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>{card.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>
                    {card.body}
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.6, color: 'primary.main' }}>
                    <Typography variant="caption" sx={{ fontWeight: 650 }}>打开</Typography>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Box>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Stack>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <UnsolvedPanel />
          <RecentContestsPanel />
        </Stack>
      </Box>
    </Box>
  );
}
