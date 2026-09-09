import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { ArrowLeft, ClipboardList, Code2, ExternalLink, FileText, Settings2 } from 'lucide-react';
import { useAuth } from '../auth';
import Markdown from '../components/Markdown';
import PageHeader from '../components/PageHeader';
import ScoreboardTable from '../components/ScoreboardTable';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { localizedContent } from '../lib/api';
import { formatDate, postHydroForm, scrapeHomeworkDetail, scrapeHomeworkScoreboard } from '../lib/scrape';
import type { HomeworkDetail, ScoreboardRow } from '../types';

export default function HomeworkDetailPage() {
  const { user } = useAuth();
  const { id = '' } = useParams();
  const [homework, setHomework] = useState<HomeworkDetail | null>(null);
  const [scoreboard, setScoreboard] = useState<{ headers: string[]; rows: ScoreboardRow[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await scrapeHomeworkDetail(id);
      if (!next) setError('作业不存在或无权访问。');
      else setHomework(next);
      if (next) setScoreboard(await scrapeHomeworkScoreboard(id).catch(() => null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '作业详情加载失败。');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !homework) return <FullPageLoader />;
  if (error || !homework) return <ErrorBox message={error || '作业不存在。'} onRetry={() => void load()} />;

  const attend = async () => {
    if (attending) return;
    setAttending(true);
    setActionError('');
    try {
      await postHydroForm(`/homework/${encodeURIComponent(homework.id)}`, { operation: 'attend' });
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '参加作业失败。');
    } finally {
      setAttending(false);
    }
  };

  return (
    <Box>
      <Button component={RouterLink} to="/homework" color="inherit" size="small" startIcon={<ArrowLeft size={16} />} sx={{ mb: 2 }}>
        作业列表
      </Button>
      <PageHeader
        icon={<ClipboardList size={21} />}
        title={homework.title}
        subtitle={`${homework.beginAt ? `开始：${formatDate(homework.beginAt)}` : ''}${homework.endAt ? `　截止：${formatDate(homework.endAt)}` : ''}` || undefined}
        actions={(
          <>
            {user && !homework.attended && homework.status !== '已结束' ? (
              <Button variant="contained" size="small" onClick={() => void attend()} disabled={attending}>
                {attending ? '参加中' : '参加作业'}
              </Button>
            ) : homework.attended ? <Chip label="已参加" color="primary" variant="outlined" /> : null}
            <Button component="a" href={hydroPublicUrl(`/homework/${encodeURIComponent(homework.id)}/scoreboard`)} target="_blank" rel="noreferrer" size="small" endIcon={<ExternalLink size={15} />}>
              完整榜单
            </Button>
            <Button component="a" href={hydroPublicUrl(`/homework/${encodeURIComponent(homework.id)}/code`)} target="_blank" rel="noreferrer" size="small" startIcon={<Code2 size={15} />}>
              作业代码
            </Button>
            <Button component="a" href={hydroPublicUrl(`/homework/${encodeURIComponent(homework.id)}/file`)} target="_blank" rel="noreferrer" size="small" startIcon={<FileText size={15} />}>
              作业文件
            </Button>
            {user?.role === 'root' ? (
              <Button component="a" href={hydroPublicUrl(`/homework/${encodeURIComponent(homework.id)}/edit`)} target="_blank" rel="noreferrer" size="small" startIcon={<Settings2 size={15} />}>
                编辑作业
              </Button>
            ) : null}
          </>
        )}
      />
      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 2.5 }}>
        <Chip label={homework.status} size="small" color={homework.status === '进行中' ? 'success' : 'default'} />
        <Chip label={`${homework.problemCount} 道题`} size="small" variant="outlined" />
        <Chip label={`参与 ${homework.attend ?? '—'}`} size="small" variant="outlined" />
      </Box>

      {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>作业说明</Typography>
        <Markdown content={localizedContent(homework.description) || '暂无作业说明。'} />
      </Paper>

      {scoreboard?.rows.length ? (
        <ScoreboardTable title="作业排行榜" headers={scoreboard.headers} rows={scoreboard.rows} />
      ) : null}

      <Paper variant="outlined">
        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>题目列表</Typography>
        </Box>
        {homework.problems.length > 0 ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="作业题目列表">
              <TableHead><TableRow><TableCell>题号</TableCell><TableCell sx={{ minWidth: 280 }}>标题</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
              <TableBody>
                {homework.problems.map((problem) => {
                  const context = `?tid=${encodeURIComponent(homework.id)}`;
                  const problemPath = `/problem/${encodeURIComponent(problem.pid)}`;
                  return (
                    <TableRow key={problem.docId} hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{problem.pid}</TableCell>
                      <TableCell><RouterLink to={`${problemPath}${context}`}>{problem.title}</RouterLink></TableCell>
                      <TableCell>
                        <Button component={RouterLink} size="small" to={`${problemPath}/submit${context}`}>
                          提交
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : <EmptyBox message="暂无题目" />}
      </Paper>
    </Box>
  );
}
