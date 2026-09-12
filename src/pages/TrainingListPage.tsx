import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { GraduationCap, Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import HydroWorkspaceButton from '../components/HydroWorkspaceButton';
import { scrapeTrainingRows } from '../lib/scrape';
import type { TrainingRow } from '../types';

export default function TrainingListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TrainingRow[] | null>(null);
  const query = searchParams.get('q') ?? '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await scrapeTrainingRows());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '训练列表加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!rows || !keyword) return rows ?? [];
    return rows.filter((row) => `${row.title} ${row.description ?? ''}`.toLowerCase().includes(keyword));
  }, [query, rows]);

  if (loading && !rows) return <FullPageLoader />;

  return (
    <Box>
      <PageHeader
        icon={<GraduationCap size={21} />}
        title="训练"
        subtitle="按章节循序完成题目，记录自己的训练进度。"
        actions={(
          <>
            {user?.role === 'root' ? (
              <HydroWorkspaceButton path="/training/create" title="创建训练" variant="contained" startIcon={<Plus size={16} />}>
                创建训练
              </HydroWorkspaceButton>
            ) : null}
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void load()}>
              刷新
            </Button>
          </>
        )}
      />

      <TextField
        value={query}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams);
          if (event.target.value) next.set('q', event.target.value);
          else next.delete('q');
          setSearchParams(next, { replace: true });
        }}
        placeholder="搜索训练名称"
        size="small"
        sx={{ width: { xs: '100%', sm: 300 }, mb: 2 }}
        slotProps={{ input: { startAdornment: <Search size={17} style={{ marginRight: 8 }} /> } }}
      />

      {error ? <ErrorBox message={error} onRetry={() => void load()} /> : null}
      {!error && !loading && filteredRows.length === 0 ? <EmptyBox message="暂无训练" /> : null}
      {!error && filteredRows.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="训练列表" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 260 }}>训练</TableCell>
                <TableCell>进度</TableCell>
                <TableCell>章节</TableCell>
                <TableCell>题目</TableCell>
                <TableCell>参与</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => {
                const progress = row.problemCount > 0
                  ? `${row.donePids.length}/${row.problemCount}`
                  : '—';
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <RouterLink to={`/training/${encodeURIComponent(row.id)}`}>
                        {row.title}
                      </RouterLink>
                      {row.pin ? <Chip label="置顶" size="small" sx={{ ml: 1 }} /> : null}
                      {row.description ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                          {row.description}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Chip label={row.done ? '已完成' : progress} color={row.done ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{row.nodeCount}</TableCell>
                    <TableCell>{row.problemCount}</TableCell>
                    <TableCell>{row.attend ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
