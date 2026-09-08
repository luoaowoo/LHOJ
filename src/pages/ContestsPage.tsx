import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Plus, RefreshCw, Trophy } from 'lucide-react';
import { useAuth } from '../auth';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { scrapeContestRows } from '../lib/scrape';
import type { ContestRow } from '../types';

export default function ContestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [rows, setRows] = useState<ContestRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await scrapeContestRows(page));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '比赛列表加载失败。');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || error || !rows || rows.length > 0 || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [error, loading, page, rows, searchParams, setSearchParams]);

  const retry = () => void load();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2.4, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
            <Trophy size={21} />
            比赛
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            来自 Hydro 的公开比赛列表。
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {user?.role === 'root' ? (
            <Button component="a" href={hydroPublicUrl('/contest/create')} target="_blank" rel="noreferrer" variant="contained" startIcon={<Plus size={16} />}>
              创建比赛
            </Button>
          ) : null}
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={retry}>
            刷新
          </Button>
        </Box>
      </Box>

      {error ? (
        <ErrorBox message={error} onRetry={retry} />
      ) : loading && !rows ? (
        <FullPageLoader />
      ) : !rows || rows.length === 0 ? (
        <EmptyBox message="暂无比赛" />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="比赛列表">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 210 }}>比赛</TableCell>
                <TableCell>赛制</TableCell>
                <TableCell>日期</TableCell>
                <TableCell>时长</TableCell>
                <TableCell>参与</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id || row.href || row.title} hover>
                  <TableCell>
                    {row.id ? (
                      <RouterLink to={`/contests/${encodeURIComponent(row.id)}`}>{row.title || '未命名比赛'}</RouterLink>
                    ) : (
                      row.title || '-'
                    )}
                  </TableCell>
                  <TableCell>{row.rule || '-'}</TableCell>
                  <TableCell>{row.date || '-'}</TableCell>
                  <TableCell>{row.duration || '-'}</TableCell>
                  <TableCell>{row.attend || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              page={page}
              count={page + (rows.length >= 20 ? 1 : 0)}
              onChange={(_, nextPage) => {
                const next = new URLSearchParams(searchParams);
                if (nextPage === 1) next.delete('page');
                else next.set('page', String(nextPage));
                setSearchParams(next);
              }}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}
    </Box>
  );
}
