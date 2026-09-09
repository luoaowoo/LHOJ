import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, Divider, InputAdornment, Link, LinearProgress, Pagination, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { CheckCircle2, Circle, Filter, Gauge, Plus, Search, Shuffle, Tags } from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { difficultyColor } from '../lib/difficulty';
import { scrapeProblemRows } from '../lib/scrape';
import type { ProblemRow } from '../types';

export default function ProblemListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [problems, setProblems] = useState<ProblemRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const query = searchParams.get('q') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const difficulty = searchParams.get('difficulty') ?? '';
  const requestedPage = Number(searchParams.get('page')) || 1;

  const updateFilters = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProblems(await scrapeProblemRows({ page: String(requestedPage) }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载题目失败。');
    } finally {
      setLoading(false);
    }
  }, [requestedPage]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!loading && !error && problems?.length === 0 && requestedPage > 1) updateFilters({ page: '' });
  }, [error, loading, problems, requestedPage]);

  const tags = useMemo(
    () => Array.from(new Set(problems?.flatMap((problem) => problem.tags) ?? [])).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [problems],
  );
  const difficulties = useMemo(
    () => Array.from(new Set(problems?.map((problem) => problem.difficulty).filter(Boolean) ?? [])).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [problems],
  );
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return [...(problems ?? [])].sort((a, b) => a.docId - b.docId).filter((problem) => {
      const haystack = [problem.pid, problem.title, String(problem.docId), ...problem.tags].filter(Boolean).join(' ').toLowerCase();
      return (!keyword || haystack.includes(keyword)) && (!tag || problem.tags.includes(tag)) && (!difficulty || problem.difficulty === difficulty);
    });
  }, [problems, query, tag, difficulty]);

  if (loading) return <FullPageLoader />;
  if (error) return <ErrorBox message={error} onRetry={() => void load()} />;
  if (!problems || problems.length === 0) return <EmptyBox message="暂无题目" />;

  const solved = filtered.filter((problem) => /通过|accepted|\bac\b/i.test(problem.status ?? '')).length;
  const acceptedTotal = filtered.reduce((sum, problem) => sum + (problem.accepted ?? 0), 0);
  const submittedTotal = filtered.reduce((sum, problem) => sum + (problem.submitted ?? 0), 0);
  const pageCount = Math.max(requestedPage, requestedPage + (problems.length >= 20 ? 1 : 0));

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="题库"
        subtitle="成就龙中学子信竞梦 · 选择一道题开始训练"
        actions={(
          <>
            <Button component="a" href={hydroPublicUrl('/problem/random')} target="_blank" rel="noreferrer" color="inherit" startIcon={<Shuffle size={16} />}>
              随机一题
            </Button>
            {user?.role === 'root' ? (
              <Button component="a" href={hydroPublicUrl('/problem/create')} target="_blank" rel="noreferrer" variant="contained" startIcon={<Plus size={16} />}>
                创建题目
              </Button>
            ) : null}
          </>
        )}
      />

      <Paper variant="outlined" sx={{ p: { xs: 1.2, md: 1.6 } }}>
        <TextField
          fullWidth
          value={query}
          onChange={(event) => updateFilters({ q: event.target.value, page: '' })}
          placeholder="输入题号、题目名称或算法关键词..."
          size="small"
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> } }}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Gauge size={17} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>难度梯度</Typography>
            <Stack direction="row" spacing={0.7} sx={{ flexWrap: 'wrap' }}>
              <Chip label="全部" size="small" color={!difficulty ? 'primary' : 'default'} onClick={() => updateFilters({ difficulty: '', page: '' })} />
              {difficulties.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  size="small"
                  onClick={() => updateFilters({ difficulty: item, page: '' })}
                  sx={{ borderColor: difficultyColor(item), color: difficulty === item ? difficultyColor(item) : 'text.secondary' }}
                  variant={difficulty === item ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Tags size={17} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', pt: 0.55 }}>算法标签</Typography>
            <Stack direction="row" spacing={0.7} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {tags.slice(0, 18).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  size="small"
                  variant={tag === item ? 'filled' : 'outlined'}
                  onClick={() => updateFilters({ tag: tag === item ? '' : item, page: '' })}
                />
              ))}
            </Stack>
          </Box>
          {(query || tag || difficulty) ? (
            <Button color="inherit" size="small" startIcon={<Filter size={15} />} onClick={() => setSearchParams({}, { replace: true })} sx={{ alignSelf: 'flex-start' }}>
              清除筛选
            </Button>
          ) : null}
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 280px' }, gap: 2 }}>
        <Box>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: { xs: 1.5, md: 2 }, py: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>题库检索结果</Typography>
                <Chip label={`${filtered.length} 道题`} size="small" color="info" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">按题号升序</Typography>
            </Box>
            <Divider />
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 55 }}>状态</TableCell>
                    <TableCell sx={{ width: 100 }}>题号</TableCell>
                    <TableCell>题目名称</TableCell>
                    <TableCell sx={{ width: 125 }}>算法标签</TableCell>
                    <TableCell sx={{ width: 105 }}>难度</TableCell>
                    <TableCell sx={{ width: 145 }}>通过率</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((problem) => {
                    const pid = problem.pid ?? String(problem.docId);
                    const href = `/problem/${encodeURIComponent(pid)}`;
                    const accepted = problem.accepted;
                    const submitted = problem.submitted;
                    const percentage = accepted != null && submitted ? Math.min(100, Math.max(0, (accepted / submitted) * 100)) : 0;
                    const passed = /通过|accepted|\bac\b/i.test(problem.status ?? '');
                    return (
                      <TableRow key={problem.docId} hover>
                        <TableCell>
                          <Box component="span" sx={{ display: 'inline-flex', color: passed ? 'success.main' : 'text.secondary' }}>
                            {passed ? <CheckCircle2 size={18} /> : <Circle size={17} />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Link component={RouterLink} to={href} sx={{ fontFamily: 'monospace', fontWeight: 700, textDecoration: 'none' }}>{pid}</Link>
                        </TableCell>
                        <TableCell>
                          <Link component={RouterLink} to={href} sx={{ fontWeight: 700, textDecoration: 'none' }}>{problem.title}</Link>
                        </TableCell>
                        <TableCell>
                          <Chip label={problem.tags[0] || '未分类'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={problem.difficulty || '未评定'}
                            size="small"
                            sx={{ color: difficultyColor(problem.difficulty || ''), bgcolor: `${difficultyColor(problem.difficulty || '')}1f` }}
                          />
                        </TableCell>
                        <TableCell>
                          {accepted == null || submitted == null ? (
                            <Typography variant="caption">—</Typography>
                          ) : (
                            <Tooltip title={`${accepted} 通过 / ${submitted} 提交 · ${percentage.toFixed(1)}%`} arrow>
                              <Box sx={{ minWidth: 110, cursor: 'help' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{percentage.toFixed(1)}%</Typography>
                                  <Typography variant="caption" color="text.secondary">{submitted} 次</Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: difficultyColor(problem.difficulty || '') } }}
                                />
                              </Box>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.2 }}>
              <Typography variant="caption" color="text.secondary">显示 {filtered.length} 题</Typography>
              <Pagination color="primary" size="small" count={pageCount} page={requestedPage} onChange={(_event, value) => updateFilters({ page: value === 1 ? '' : String(value) })} />
            </Stack>
          </Paper>
        </Box>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2.2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.8 }}>
              解题进度
              <Chip label="本页" size="small" sx={{ ml: 'auto' }} />
            </Typography>
            <Box sx={{ display: 'grid', placeItems: 'center', py: 2.3 }}>
              <Box
                sx={{
                  width: 128,
                  height: 128,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: (t) => `conic-gradient(${t.palette.primary.main} ${filtered.length ? (solved / filtered.length) * 360 : 0}deg, ${t.palette.action.hover} 0deg)`,
                }}
              >
                <Box sx={{ width: 98, height: 98, borderRadius: '50%', bgcolor: 'background.paper', display: 'grid', placeItems: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{solved}</Typography>
                </Box>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">当前筛选结果中已通过题目</Typography>
            <LinearProgress variant="determinate" value={filtered.length ? (solved / filtered.length) * 100 : 0} sx={{ mt: 1, height: 7, borderRadius: 4 }} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>题库数据</Typography>
            <Stack spacing={1.4} sx={{ mt: 1.8 }}>
              {([['题目数量', filtered.length], ['通过次数', acceptedTotal], ['提交次数', submittedTotal]] as const).map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}
