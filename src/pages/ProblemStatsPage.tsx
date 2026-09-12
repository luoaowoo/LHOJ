import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { scrapeProblemStats } from '../lib/scrape';
import type { ProblemStat } from '../types';

export default function ProblemStatsPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const tid = searchParams.get('tid') ?? '';
  const [rows, setRows] = useState<ProblemStat[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setRows(await scrapeProblemStats(id, tid || undefined)); } catch (cause) { setError(cause instanceof Error ? cause.message : '统计加载失败。'); } }, [id, tid]);
  useEffect(() => { void load(); }, [load]);
  if (!rows && !error) return <FullPageLoader />;
  if (error) return <ErrorBox message={error} onRetry={() => void load()} />;
  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <Button component={RouterLink} to={`/problem/${encodeURIComponent(id)}${tid ? `?tid=${encodeURIComponent(tid)}` : ''}`} color="inherit" size="small" startIcon={<ArrowLeft size={16} />}>返回题目</Button>
      </Box>
      <PageHeader icon={<BarChart3 size={22} />} title="最优提交" />
      {!rows?.length ? <EmptyBox message="暂无统计数据" /> : (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="题目提交统计"><TableHead><TableRow><TableCell>用户</TableCell><TableCell>语言</TableCell><TableCell>代码长度</TableCell><TableCell>时间</TableCell><TableCell>内存</TableCell></TableRow></TableHead><TableBody>
            {rows.map((row) => <TableRow key={row.id} hover><TableCell>{row.author || '—'}</TableCell><TableCell>{row.language}</TableCell><TableCell>{row.length || '—'}</TableCell><TableCell>{row.time || '—'}</TableCell><TableCell>{row.memory || '—'}</TableCell></TableRow>)}
          </TableBody></Table>
        </TableContainer>
      )}
    </Box>
  );
}
