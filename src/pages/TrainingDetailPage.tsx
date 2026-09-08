import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { ArrowLeft, FileText, GraduationCap, Settings2 } from 'lucide-react';
import { useAuth } from '../auth';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { postHydroForm, scrapeTrainingDetail } from '../lib/scrape';
import type { TrainingDetail } from '../types';

export default function TrainingDetailPage() {
  const { user } = useAuth();
  const { id = '' } = useParams();
  const [training, setTraining] = useState<TrainingDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await scrapeTrainingDetail(id);
      if (!next) setError('训练不存在或无权访问。');
      else setTraining(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '训练详情加载失败。');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !training) return <FullPageLoader />;
  if (error || !training) return <ErrorBox message={error || '训练不存在。'} onRetry={() => void load()} />;

  const enroll = async () => {
    if (enrolling) return;
    setEnrolling(true);
    setActionError('');
    try {
      await postHydroForm(`/training/${encodeURIComponent(training.id)}`, { operation: 'enroll' });
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '加入训练失败。');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <Button component={RouterLink} to="/training" color="inherit" size="small" startIcon={<ArrowLeft size={16} />}>
          训练列表
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
              <GraduationCap size={21} />
              {training.title}
            </Typography>
            {training.description ? <Typography color="text.secondary" sx={{ mt: 0.7 }}>{training.description}</Typography> : null}
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1.4 }}>
              <Chip label={`${training.donePids.length}/${training.problemCount} 题`} size="small" variant="outlined" />
              <Chip label={`${training.nodes.length} 章节`} size="small" variant="outlined" />
              <Chip label={`参与 ${training.attend ?? '—'}`} size="small" variant="outlined" />
              {training.done ? <Chip label="已完成" size="small" color="success" /> : null}
            </Box>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {user && !training.enrolled ? (
              <Button variant="contained" size="small" onClick={() => void enroll()} disabled={enrolling}>
                {enrolling ? '加入中' : '加入训练'}
              </Button>
            ) : training.enrolled ? <Chip label="已加入" color="primary" variant="outlined" /> : null}
            <Button
              component="a"
              href={hydroPublicUrl(`/training/${encodeURIComponent(training.id)}/file`)}
              target="_blank"
              rel="noreferrer"
              size="small"
              startIcon={<FileText size={15} />}
            >
              训练文件
            </Button>
            {user?.role === 'root' ? (
              <Button
                component="a"
                href={hydroPublicUrl(`/training/${encodeURIComponent(training.id)}/edit`)}
                target="_blank"
                rel="noreferrer"
                size="small"
                startIcon={<Settings2 size={15} />}
              >
                编辑训练
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Paper>

      {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {training.nodes.map((node) => (
          <Paper key={node.id} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: { xs: 1.8, md: 2.3 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{node.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {node.problems.length} 道题
              </Typography>
            </Box>
            {node.problems.length > 0 ? (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" aria-label={`${node.title}题目`}>
                  <TableHead>
                    <TableRow>
                      <TableCell>题号</TableCell>
                      <TableCell sx={{ minWidth: 240 }}>题目</TableCell>
                      <TableCell>难度</TableCell>
                      <TableCell>通过 / 提交</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {node.problems.map((problem) => {
                      const done = training.donePids.includes(problem.docId);
                      return (
                        <TableRow key={`${node.id}-${problem.docId}`} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{problem.pid}</TableCell>
                          <TableCell>
                            <RouterLink to={`/problem/${encodeURIComponent(problem.pid)}`}>
                              {problem.title}
                            </RouterLink>
                          </TableCell>
                          <TableCell>{problem.difficulty ?? '—'}</TableCell>
                          <TableCell>
                            {done ? <Chip label="已完成" color="success" size="small" variant="outlined" /> : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : <EmptyBox message="本章节暂无题目" />}
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
