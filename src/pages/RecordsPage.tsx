import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, FormControl, InputLabel, MenuItem, Pagination, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { ListChecks, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroWorkspaceHref } from '../lib/hydro-workspace';
import { scrapeRecordRows } from '../lib/scrape';
import type { RecordRow } from '../types';

interface Filters {
  uidOrName: string;
  pid: string;
  status: string;
}

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: '1', label: 'Accepted' },
  { value: '2', label: 'Wrong Answer' },
  { value: '3', label: 'Time Exceeded' },
  { value: '4', label: 'Memory Exceeded' },
  { value: '6', label: 'Runtime Error' },
  { value: '7', label: 'Compile Error' },
  { value: '20', label: 'Running' },
  { value: '0', label: 'Waiting' },
];

function hydroWorkspacePath(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return value;
    }
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function problemLink(row: RecordRow): { label: string; to?: string } {
  const label = row.problem || row.problemHref || '*';
  const match = row.problemHref?.match(/(?:^|\/)p\/([^/?#]+)/i);
  if (match?.[1]) return { label, to: `/problem/${encodeURIComponent(decodeURIComponent(match[1]))}` };
  if (row.problemHref) return { label, to: hydroWorkspaceHref(hydroWorkspacePath(row.problemHref), label) };
  return { label };
}

export default function RecordsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters: Filters = {
    uidOrName: searchParams.get('uidOrName') ?? '',
    pid: searchParams.get('pid') ?? '',
    status: searchParams.get('status') ?? '',
  };
  const urlPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const [filters, setFilters] = useState<Filters>(urlFilters);
  const [applied, setApplied] = useState<Filters>(urlFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(urlPage);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const appliedRef = useRef(applied);
  const requestId = useRef(0);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    appliedRef.current = applied;
  }, [applied]);

  useEffect(() => {
    setFilters(urlFilters);
    setApplied(urlFilters);
    setPage(urlPage);
  }, [searchParams]);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    if (initialLoadRef.current) setLoading(true);
    setError('');
    const params = Object.fromEntries(
      Object.entries(appliedRef.current).filter(([, value]) => value.trim().length > 0),
    );
    params.page = String(page);
    try {
      const data = await scrapeRecordRows(params);
      if (request !== requestId.current) return;
      setRows(data);
    } catch (err) {
      if (request !== requestId.current) return;
      setError(err instanceof Error ? err.message : '评测记录加载失败');
    } finally {
      if (request === requestId.current) {
        setLoading(false);
        initialLoadRef.current = false;
      }
    }
  }, [page]);

  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = window.setInterval(refresh, 6000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load, applied, refreshKey]);

  const applyFilters = () => {
    setApplied({
      uidOrName: filters.uidOrName.trim(),
      pid: filters.pid.trim(),
      status: filters.status.trim(),
    });
    setPage(1);
    const next = new URLSearchParams();
    Object.entries({
      uidOrName: filters.uidOrName.trim(),
      pid: filters.pid.trim(),
      status: filters.status.trim(),
    }).forEach(([key, value]) => { if (value) next.set(key, value); });
    setSearchParams(next, { replace: true });
    setRefreshKey((value) => value + 1);
  };

  const onFilterKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') applyFilters();
  };

  return (
    <Box>
      <PageHeader icon={<ListChecks size={20} />} title="评测记录" subtitle="查看提交状态、运行时间和评测结果" />
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.2,
          p: { xs: 1.4, md: 1.8 },
        }}
      >
        <TextField
          size="small"
          label="用户"
          value={filters.uidOrName}
          onChange={(event) => setFilters((value) => ({ ...value, uidOrName: event.target.value }))}
          onKeyDown={onFilterKeyDown}
          sx={{ width: { xs: '100%', sm: 180 } }}
        />
        <TextField
          size="small"
          label="题目"
          value={filters.pid}
          onChange={(event) => setFilters((value) => ({ ...value, pid: event.target.value }))}
          onKeyDown={onFilterKeyDown}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 170 } }}>
          <InputLabel id="record-status-label">状态</InputLabel>
          <Select
            labelId="record-status-label"
            label="状态"
            value={filters.status}
            onChange={(event) => {
              const nextFilters = { ...filters, status: event.target.value };
              setFilters(nextFilters);
              setApplied(nextFilters);
              setPage(1);
              const next = new URLSearchParams(searchParams);
              if (nextFilters.status) next.set('status', nextFilters.status); else next.delete('status');
              next.delete('page');
              setSearchParams(next, { replace: true });
            }}
          >
            {statusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={applyFilters}
          sx={{ minHeight: 40 }}
        >
          刷新
        </Button>
      </Paper>

      {loading && initialLoadRef.current ? <FullPageLoader /> : null}
      {!loading && error ? <ErrorBox message={error} onRetry={applyFilters} /> : null}
      {!loading && !error && rows.length === 0 ? <EmptyBox message="暂无评测记录" /> : null}
      {!error && rows.length > 0 ? (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>状态</TableCell>
                <TableCell>题目</TableCell>
                <TableCell>提交者</TableCell>
                <TableCell>时间</TableCell>
                <TableCell>内存</TableCell>
                <TableCell>语言</TableCell>
                <TableCell>提交时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const problem = problemLink(row);
                return (
                  <TableRow
                    key={row.rid}
                    hover
                    role={row.rid ? 'link' : undefined}
                    tabIndex={row.rid ? 0 : undefined}
                    onClick={() => {
                      if (row.rid) navigate(`/records/${encodeURIComponent(row.rid)}`);
                    }}
                    onKeyDown={(event) => {
                      if (row.rid && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        navigate(`/records/${encodeURIComponent(row.rid)}`);
                      }
                    }}
                    sx={{
                      cursor: row.rid ? 'pointer' : 'default',
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                    }}
                  >
                    <TableCell>
                      <StatusChip text={row.status || '未知'} score={row.score} />
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {problem.to ? (
                        <RouterLink to={problem.to}>{problem.label}</RouterLink>
                      ) : (
                        <Typography>{problem.label}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.submitter}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>{row.memory}</TableCell>
                    <TableCell>{row.language}</TableCell>
                    <TableCell>{row.submittedAt}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              page={page}
              count={page + (rows.length >= 100 ? 1 : 0)}
              onChange={(_, nextPage) => {
                setPage(nextPage);
                const next = new URLSearchParams(searchParams);
                if (nextPage === 1) next.delete('page'); else next.set('page', String(nextPage));
                setSearchParams(next, { replace: true });
              }}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}
