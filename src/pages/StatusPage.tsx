import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Activity, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { formatDate, scrapeJudgeStatuses, type JudgeStatus } from '../lib/scrape';

export default function StatusPage() {
  const [items, setItems] = useState<JudgeStatus[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try { setItems(await scrapeJudgeStatuses()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '状态加载失败。'); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (!items && refreshing) return <FullPageLoader />;
  if (!items && error) return <ErrorBox message={error} onRetry={() => void load()} />;
  return <Box>
    <PageHeader
      icon={<Activity size={20} />}
      title="系统状态"
      actions={<Button variant="outlined" startIcon={<RefreshCw size={16} />} disabled={refreshing} onClick={() => void load()}>刷新</Button>}
    />
    {error ? <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert> : null}
    {!items?.length ? <EmptyBox message="暂无判题服务状态" /> : <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>服务</TableCell><TableCell>状态</TableCell><TableCell>编译器</TableCell><TableCell>电源</TableCell><TableCell>最近更新</TableCell></TableRow></TableHead><TableBody>{items.map((item) => <TableRow key={item.id} hover><TableCell>{item.name}</TableCell><TableCell><Chip size="small" color={item.online ? 'success' : 'error'} label={item.online ? '在线' : '离线'} /></TableCell><TableCell>{item.compilerCount}</TableCell><TableCell>{item.battery || '—'}</TableCell><TableCell>{item.updatedAt ? formatDate(item.updatedAt) : '—'}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
  </Box>;
}
