import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, Divider, InputAdornment, MenuItem, Pagination, Paper,
  Select, Stack, TextField, Typography,
} from '@mui/material';
import { CalendarDays, Clock3, Plus, RefreshCw, Search, Trophy, Users } from 'lucide-react';
import { useAuth } from '../auth';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import HydroWorkspaceButton from '../components/HydroWorkspaceButton';
import { contestRuleMeta } from '../lib/contestRule';
import { scrapeContestRows } from '../lib/scrape';
import type { ContestRow } from '../types';

const rules = ['全部', 'ACM', 'OI', 'IOI', 'IOI(Strict)', 'Ledo', 'CF'];

function contestDay(date?: string): string {
  if (!date) return '--';
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime())) return String(parsed.getDate()).padStart(2, '0');
  const match = date.match(/(?:^|[-/年])([0-9]{1,2})(?:日)?(?:\s|$)/);
  return match ? match[1].padStart(2, '0') : '--';
}

function contestMonth(date?: string): string {
  if (!date) return '时间待定';
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }
  const match = date.match(/(\d{4})[-/年](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}` : '时间待定';
}

export default function ContestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [rows, setRows] = useState<ContestRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '');
  const [rule, setRule] = useState(searchParams.get('rule') ?? '全部');
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await scrapeContestRows(page)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '比赛列表加载失败。'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setKeyword(searchParams.get('q') ?? ''); setRule(searchParams.get('rule') ?? '全部'); }, [searchParams]);

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return (rows ?? []).filter((item) => (!query || `${item.title} ${item.id} ${item.rule}`.toLowerCase().includes(query)) && (rule === '全部' || contestRuleMeta(item.rule).label === rule));
  }, [keyword, rows, rule]);
  const update = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => value && value !== '全部' ? params.set(key, value) : params.delete(key));
    setSearchParams(params, { replace: true });
  };
  if (loading && !rows) return <FullPageLoader />;
  if (error && !rows) return <ErrorBox message={error} onRetry={() => void load()} />;
  return <Box>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2.4 }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}><Trophy size={23} />比赛</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .45 }}>参加比赛，检验算法能力</Typography></Box>
      <Stack direction="row" spacing={1}>{user?.role === 'root' ? <HydroWorkspaceButton path="/contest/create" title="创建比赛" variant="contained" startIcon={<Plus size={16} />}>创建比赛</HydroWorkspaceButton> : null}<Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void load()}>刷新</Button></Stack>
    </Box>
    {error ? <Box sx={{ mb: 2 }}><ErrorBox message={error} onRetry={() => void load()} /></Box> : null}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'rgba(255,255,255,.025)' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField fullWidth size="small" value={keyword} onChange={(event) => { setKeyword(event.target.value); update({ q: event.target.value, page: '' }); }} placeholder="搜索比赛" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> } }} /><Select size="small" value={rule} onChange={(event) => { setRule(event.target.value); update({ rule: event.target.value, page: '' }); }} sx={{ minWidth: { sm: 145 } }}>{rules.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Stack></Box>
        <Divider />
        {filtered.length ? <Stack divider={<Divider />}>
          {filtered.map((item) => { const meta = contestRuleMeta(item.rule); return <Box key={item.id || item.href || item.title} component={RouterLink} to={`/contests/${encodeURIComponent(item.id)}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '62px minmax(0,1fr)', sm: '72px minmax(0,1fr) auto' }, gap: { xs: 1.2, sm: 2 }, alignItems: 'start', px: { xs: 1.5, md: 2.2 }, py: { xs: 1.7, md: 2.2 }, color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
            <Box sx={{ textAlign: 'center', pt: .1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2, color: 'primary.main' }}>{contestDay(item.date)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .45, whiteSpace: 'nowrap' }}>{contestMonth(item.date)}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' }}>{item.title || '未命名比赛'}</Typography><Stack direction="row" spacing={.7} useFlexGap sx={{ mt: .8, flexWrap: 'wrap' }}><Chip icon={<CalendarDays size={14} />} label={item.date || '时间待定'} size="small" variant="outlined" /><Chip icon={<Trophy size={14} />} label={meta.label} size="small" sx={{ bgcolor: meta.color, color: meta.label === '作业' ? '#6f3030' : '#fff', '& .MuiChip-icon': { color: 'inherit' } }} /><Chip icon={<Clock3 size={14} />} label={item.duration || '时长待定'} size="small" variant="outlined" />{item.rated ? <Chip label="Rated" size="small" color="warning" /> : null}{item.attend ? <Chip icon={<Users size={14} />} label={item.attend} size="small" variant="outlined" /> : null}</Stack></Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, pt: .3 }}>查看详情 ›</Typography>
          </Box>; })}
        </Stack> : <EmptyBox message="暂无匹配的比赛" />}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.2 }}><Typography variant="caption" color="text.secondary">共 {filtered.length} 场</Typography><Pagination page={page} count={page + ((rows?.length ?? 0) >= 20 ? 1 : 0)} onChange={(_, nextPage) => update({ page: nextPage === 1 ? '' : String(nextPage) })} color="primary" size="small" /></Stack>
      </Paper>
      <Stack spacing={2}><Paper variant="outlined" sx={{ p: 2.3 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>比赛管理</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2 }}>创建和管理你的竞赛活动。</Typography>{user?.role === 'root' ? <HydroWorkspaceButton fullWidth variant="contained" startIcon={<Plus size={17} />} path="/contest/create" title="创建比赛">创建比赛</HydroWorkspaceButton> : <Typography variant="body2" color="text.secondary">管理员可从这里创建比赛</Typography>}</Paper><Paper variant="outlined" sx={{ p: 2.3 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>比赛提示</Typography><Stack spacing={1.1} sx={{ mt: 1.5 }}>{['赛前确认开始时间和赛制', '比赛中可在详情页查看榜单', '提交记录会实时同步评测'].map((item) => <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>)}</Stack></Paper></Stack>
    </Box>
  </Box>;
}
