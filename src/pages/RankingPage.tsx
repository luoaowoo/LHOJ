import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { BarChart3, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { scrapeRankingRows } from '../lib/scrape';
import type { RankingRow } from '../types';

export default function RankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await scrapeRankingRows(page));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '排行榜加载失败。');
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
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="排行榜"
        subtitle="按 Hydro RP 排序的用户榜单。"
        actions={(
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={retry}>
            刷新
          </Button>
        )}
      />

      {error ? (
        <ErrorBox message={error} onRetry={retry} />
      ) : loading && !rows ? (
        <FullPageLoader />
      ) : !rows || rows.length === 0 ? (
        <EmptyBox message="暂无排行数据" />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table
            size="small"
            aria-label="排行榜"
            sx={{ '& .MuiTableCell-root': { py: 0.75, px: 1.25 } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>排名</TableCell>
                <TableCell sx={{ minWidth: 170 }}>用户</TableCell>
                <TableCell align="right">RP</TableCell>
                <TableCell align="right">AC</TableCell>
                <TableCell sx={{ minWidth: 220 }}>简介</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.user || 'row'}-${index}`} hover>
                  <TableCell>{row.rank || '-'}</TableCell>
                  <TableCell>
                    {row.user ? (
                      <RouterLink to={row.userHref?.match(/\/user\/([^/?#]+)/)?.[1] ? `/user/${row.userHref.match(/\/user\/([^/?#]+)/)?.[1]}` : `/user/${encodeURIComponent(row.user)}`}>{row.user}</RouterLink>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">{row.rp || '-'}</TableCell>
                  <TableCell align="right">{row.accept || '-'}</TableCell>
                  <TableCell>{row.bio || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              page={page}
              count={page + (rows.length >= 100 ? 1 : 0)}
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
