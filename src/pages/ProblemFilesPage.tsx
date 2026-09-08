import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { ArrowLeft, Download, Files } from 'lucide-react';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { scrapeProblemFiles } from '../lib/scrape';
import type { ProblemFile } from '../types';

export default function ProblemFilesPage() {
  const { id = '' } = useParams();
  const [files, setFiles] = useState<ProblemFile[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setFiles(await scrapeProblemFiles(id)); } catch (cause) { setError(cause instanceof Error ? cause.message : '文件列表加载失败。'); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (!files && !error) return <FullPageLoader />;
  if (error) return <ErrorBox message={error} onRetry={() => void load()} />;
  return (
    <Box>
      <Button component={RouterLink} to={`/problem/${encodeURIComponent(id)}`} color="inherit" size="small" startIcon={<ArrowLeft size={16} />} sx={{ mb: 2 }}>返回题目</Button>
      <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, mb: 2 }}><Files size={21} />测试数据</Typography>
      {!files?.length ? <EmptyBox message="暂无可查看文件" /> : (
        <TableContainer component={Paper} variant="outlined"><Table size="small" aria-label="测试数据文件"><TableHead><TableRow><TableCell>文件名</TableCell><TableCell>大小</TableCell><TableCell align="right">下载</TableCell></TableRow></TableHead><TableBody>
          {files.map((file) => <TableRow key={file.name} hover><TableCell>{file.name}</TableCell><TableCell>{file.size || '—'}</TableCell><TableCell align="right"><Button component="a" href={hydroPublicUrl(file.href)} size="small" startIcon={<Download size={15} />}>下载</Button></TableCell></TableRow>)}
        </TableBody></Table></TableContainer>
      )}
    </Box>
  );
}
