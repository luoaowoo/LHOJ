import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Collapse, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { ArrowLeft, ChevronDown, ChevronRight, FileText, GraduationCap, Settings2 } from 'lucide-react';
import { useAuth } from '../auth';
import { isSuperUser } from '../lib/permissions';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { difficultyColor } from '../lib/difficulty';
import HydroWorkspaceButton from '../components/HydroWorkspaceButton';
import { postHydroForm, scrapeTrainingDetail } from '../lib/scrape';
import { usePreferences } from '../prefs';
import type { TrainingDetail } from '../types';

export default function TrainingDetailPage() {
  const { user } = useAuth();
  const { trainingNodesCollapsed } = usePreferences();
  const { id = '' } = useParams();
  const [training, setTraining] = useState<TrainingDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState('');
  const [openNodes, setOpenNodes] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    if (!training) return;
    setOpenNodes(trainingNodesCollapsed ? new Set() : new Set(training.nodes.map((node) => node.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [training?.id]);

  const toggleNode = (nodeId: number) => {
    setOpenNodes((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

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

      <PageHeader
        icon={<GraduationCap size={21} />}
        title={training.title}
        subtitle={training.description}
        actions={(
          <>
            {user && !training.enrolled ? (
              <Button variant="contained" size="small" onClick={() => void enroll()} disabled={enrolling}>
                {enrolling ? '加入中' : '加入训练'}
              </Button>
            ) : training.enrolled ? <Chip label="已加入" color="primary" variant="outlined" /> : null}
            <HydroWorkspaceButton
              path={`/training/${encodeURIComponent(training.id)}/file`}
              title="训练文件"
              size="small"
              startIcon={<FileText size={15} />}
            >
              训练文件
            </HydroWorkspaceButton>
            {isSuperUser(user) ? (
              <HydroWorkspaceButton
                path={`/training/${encodeURIComponent(training.id)}/edit`}
                title="编辑训练"
                size="small"
                startIcon={<Settings2 size={15} />}
              >
                编辑训练
              </HydroWorkspaceButton>
            ) : null}
          </>
        )}
      />
      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 2.5 }}>
        <Chip label={`${training.donePids.length}/${training.problemCount} 题`} size="small" variant="outlined" />
        <Chip label={`${training.nodes.length} 章节`} size="small" variant="outlined" />
        <Chip label={`参与 ${training.attend ?? '—'}`} size="small" variant="outlined" />
        {training.done ? <Chip label="已完成" size="small" color="success" /> : null}
      </Box>

      {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {training.nodes.map((node) => {
          const open = openNodes.has(node.id);
          return (
            <Paper key={node.id} variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box
                onClick={() => toggleNode(node.id)}
                sx={{
                  px: { xs: 1.8, md: 2.3 }, py: 1.5, borderBottom: open ? '1px solid' : 0, borderColor: 'divider',
                  display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{node.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {node.problems.length} 道题
                  </Typography>
                </Box>
                <IconButton size="small" aria-label={open ? '收起章节' : '展开章节'}>
                  {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </IconButton>
              </Box>
              <Collapse in={open}>
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
                              <TableCell>
                                {problem.difficulty ? (
                                  <Chip
                                    label={problem.difficulty}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      color: difficultyColor(problem.difficulty),
                                      borderColor: difficultyColor(problem.difficulty),
                                      bgcolor: `${difficultyColor(problem.difficulty)}18`,
                                    }}
                                  />
                                ) : '—'}
                              </TableCell>
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
              </Collapse>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
