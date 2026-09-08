import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import {
  ArrowRight, BookOpen, CircleUserRound, ClipboardList, GraduationCap, ListChecks,
  BarChart3, MessageSquare, Settings2, Trophy,
} from 'lucide-react';
import { useAuth } from '../auth';
import { scrapeProblemRows } from '../lib/scrape';
import type { ProblemRow } from '../types';

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

export default function HomePage() {
  const { user } = useAuth();
  const [recentProblems, setRecentProblems] = useState<ProblemRow[]>([]);

  useEffect(() => {
    let active = true;
    void scrapeProblemRows({ page: '1' })
      .then((rows) => { if (active) setRecentProblems(rows.slice(0, 6)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.6 }}>
          {user ? `欢迎回来，${user.uname}` : '欢迎来到 LH-oj'}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          LH-oj · 成就龙中学子信竞梦
        </Typography>
      </Box>
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        {cards.map((card) => (
          <Grid key={card.to} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ height: '100%' }} variant="outlined">
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
          </Grid>
        ))}
      </Grid>
      {recentProblems.length ? (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>最近题目</Typography>
            <Button component={RouterLink} to="/problems" size="small" endIcon={<ArrowRight size={15} />}>全部题目</Button>
          </Box>
          <Paper variant="outlined">
            <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
              {recentProblems.map((problem) => (
                <Button key={problem.docId} component={RouterLink} to={`/problem/${encodeURIComponent(problem.pid || String(problem.docId))}`} color="inherit" sx={{ minHeight: 54, px: 2, py: 1, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 0 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>{problem.pid} · {problem.title}</Typography><Typography variant="caption" color="text.secondary">{problem.accepted} 通过 / {problem.submitted} 提交</Typography></Box>
                  {problem.status ? <Chip label={problem.status} size="small" color={problem.status.toLowerCase().includes('accept') ? 'success' : 'default'} /> : null}
                </Button>
              ))}
            </Stack>
          </Paper>
        </Box>
      ) : null}
      <Card variant="outlined" sx={{ mt: 2, p: 2.2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'action.selected' }}>
          <CircleUserRound size={21} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 650 }}>个人中心</Typography>
          <Typography variant="body2" color="text.secondary">账户资料</Typography>
        </Box>
        <Button component={RouterLink} to="/user" size="small" endIcon={<ArrowRight size={16} />}>
          查看
        </Button>
      </Card>
    </Box>
  );
}
