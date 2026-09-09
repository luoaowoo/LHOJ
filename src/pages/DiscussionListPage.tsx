import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, InputAdornment, Pagination, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField,
} from '@mui/material';
import { ExternalLink, MessageSquare, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { formatDate, scrapeDiscussionRows } from '../lib/scrape';
import type { DiscussionRow } from '../types';

export default function DiscussionListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<DiscussionRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const query = searchParams.get('q') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await scrapeDiscussionRows(page));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '讨论列表加载失败。');
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

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!rows || !keyword) return rows ?? [];
    return rows.filter((row) => `${row.title} ${row.parentId ?? ''} ${row.author ?? ''}`.toLowerCase().includes(keyword));
  }, [query, rows]);

  if (loading && !rows) return <FullPageLoader />;

  return (
    <Box>
      <PageHeader
        icon={<MessageSquare size={20} />}
        title="讨论"
        subtitle="交流题解、经验和站内问题。"
        actions={
          <>
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void load()}>
              刷新
            </Button>
            <Button
              component="a"
              href={hydroPublicUrl('/discuss/node/%E9%97%AE%E7%AD%94/create')}
              target="_blank"
              rel="noreferrer"
              variant="contained"
              endIcon={<ExternalLink size={15} />}
            >
              发布讨论
            </Button>
          </>
        }
      />

      <TextField
        value={query}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams);
          if (event.target.value) next.set('q', event.target.value);
          else next.delete('q');
          next.delete('page');
          setSearchParams(next, { replace: true });
        }}
        placeholder="搜索标题、分区或作者"
        size="small"
        sx={{ width: { xs: '100%', sm: 330 }, mb: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> } }}
      />

      {error ? <ErrorBox message={error} onRetry={() => void load()} /> : null}
      {!error && !loading && filteredRows.length === 0 ? <EmptyBox message="暂无讨论" /> : null}
      {!error && filteredRows.length > 0 ? (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="讨论列表" sx={{ minWidth: 760 }}>
            <TableHead><TableRow><TableCell sx={{ minWidth: 300 }}>主题</TableCell><TableCell>分区</TableCell><TableCell>作者</TableCell><TableCell>回复</TableCell><TableCell>浏览</TableCell><TableCell>更新时间</TableCell></TableRow></TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <RouterLink to={`/discuss/${encodeURIComponent(row.id)}`}>{row.title}</RouterLink>
                    {row.pinned ? <Chip label="置顶" size="small" sx={{ ml: 1 }} /> : null}
                  </TableCell>
                  <TableCell>{row.parentId || '—'}</TableCell>
                  <TableCell>{row.author || '—'}</TableCell>
                  <TableCell>{row.replies}</TableCell>
                  <TableCell>{row.views}</TableCell>
                  <TableCell>{formatDate(row.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </TableContainer>
          {!query.trim() ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              page={page}
              count={page + (rows?.length === 20 ? 1 : 0)}
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
          </Box> : null}
        </>
      ) : null}
    </Box>
  );
}
