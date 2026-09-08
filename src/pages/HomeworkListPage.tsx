import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { scrapeHomeworkRows } from '../lib/scrape';
import type { HomeworkRow } from '../types';

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === '进行中') return 'success';
  if (status === '未开始') return 'warning';
  if (status === '已结束') return 'error';
  return 'default';
}

export default function HomeworkListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HomeworkRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await scrapeHomeworkRows());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '作业列表加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !rows) return <FullPageLoader />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2.4, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
            <ClipboardList size={21} />
            作业
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            查看题目、截止时间和作业成绩。
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {user?.role === 'root' ? (
            <Button component="a" href={hydroPublicUrl('/homework/create')} target="_blank" rel="noreferrer" variant="contained" startIcon={<Plus size={16} />}>
              创建作业
            </Button>
          ) : null}
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void load()}>
            刷新
          </Button>
        </Box>
      </Box>

      {error ? <ErrorBox message={error} onRetry={() => void load()} /> : null}
      {!error && !loading && (!rows || rows.length === 0) ? <EmptyBox message="暂无作业" /> : null}
      {!error && rows && rows.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="作业列表" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 280 }}>作业</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>开始时间</TableCell>
                <TableCell>截止时间</TableCell>
                <TableCell>题目</TableCell>
                <TableCell>参与</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <RouterLink to={`/homework/${encodeURIComponent(row.id)}`}>{row.title}</RouterLink>
                    {row.description ? (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                        {row.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell><Chip label={row.status} color={statusColor(row.status)} size="small" variant="outlined" /></TableCell>
                  <TableCell>{row.beginAt ? new Date(row.beginAt).toLocaleString('zh-CN') : '—'}</TableCell>
                  <TableCell>{row.endAt ? new Date(row.endAt).toLocaleString('zh-CN') : '—'}</TableCell>
                  <TableCell>{row.problemCount}</TableCell>
                  <TableCell>{row.attend ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
