import { useEffect, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { BarChart3, CheckCircle2, Files, Gauge, Hash, MessageSquare, Send, Settings2, SlidersHorizontal, Star } from 'lucide-react';
import { useAuth } from '../auth';
import { isSuperUser } from '../lib/permissions';
import Markdown from '../components/Markdown';
import HydroWorkspaceButton from '../components/HydroWorkspaceButton';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchProblem, localizedContent } from '../lib/api';
import { difficultyColor } from '../lib/difficulty';
import { postHydroForm, scrapeProblemStar } from '../lib/scrape';
import type { HydroProblem } from '../types';

interface ProblemLocationState {
  submitted?: boolean;
}

export default function ProblemPage() {
  const { user } = useAuth();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tid = searchParams.get('tid') ?? '';
  const [problem, setProblem] = useState<HydroProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starred, setStarred] = useState(false);
  const [starring, setStarring] = useState(false);
  const [actionError, setActionError] = useState('');
  const submitted = Boolean((location.state as ProblemLocationState | null)?.submitted);
  const [snackbarOpen, setSnackbarOpen] = useState(submitted);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError('缺少题目编号。');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      fetchProblem(id, tid || undefined),
      user && !tid ? scrapeProblemStar(id).catch(() => false) : Promise.resolve(false),
    ])
      .then(([nextProblem, nextStarred]) => {
        if (active) {
          setProblem(nextProblem);
          setStarred(nextStarred);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : '加载题目失败。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, tid, user?._id]);

  useEffect(() => {
    if (submitted) setSnackbarOpen(true);
  }, [submitted]);

  if (loading) return <FullPageLoader />;
  if (error) return <ErrorBox message={error} />;
  if (!problem) return <ErrorBox message="题目不存在" />;

  const pid = problem.pid ?? String(problem.docId);
  const content = localizedContent(problem.content);
  const tags = problem.tag ?? [];
  const discussionHref = `/problem/${encodeURIComponent(pid)}/solutions`;
  const submitHref = `/problem/${encodeURIComponent(id)}/submit${
    tid ? `?tid=${encodeURIComponent(tid)}` : ''
  }`;
  const accepted = problem.nAccept;
  const submittedCount = problem.nSubmit;
  const stats =
    accepted == null || submittedCount == null ? '—' : `${accepted}/${submittedCount}`;

  const toggleStar = async () => {
    if (!user || starring) return;
    setStarring(true);
    setActionError('');
    try {
      const next = !starred;
      await postHydroForm(`/p/${encodeURIComponent(pid)}`, { operation: 'star', star: String(next) });
      setStarred(next);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : '收藏操作失败。');
    } finally {
      setStarring(false);
    }
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
        <Typography component="h1" variant="h4" sx={{ wordBreak: 'break-word' }}>
          {pid} {problem.title}
        </Typography>
        <Stack direction="row" useFlexGap sx={{ mt: 1.5, gap: .8, flexWrap: 'wrap' }}>
          <Chip icon={<Gauge size={14} />} label={problem.difficulty ?? '未评定'} sx={{ color: difficultyColor(String(problem.difficulty ?? '')) }} />
          <Chip icon={<Hash size={14} />} label="传统题" variant="outlined" />
          {submittedCount != null ? <Chip icon={<Send size={14} />} label={`${submittedCount} 提交`} variant="outlined" /> : null}
          {accepted != null ? <Chip icon={<CheckCircle2 size={14} />} label={`${accepted} 通过`} variant="outlined" /> : null}
          {tags.map((tag) => <Chip key={tag} label={tag} variant="outlined" />)}
          {problem.hidden ? <Chip label="隐藏题目" color="warning" /> : null}
        </Stack>
      </Paper>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 300px' },
          alignItems: 'start',
          gap: 2,
        }}
      >
        <Paper component="article" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <Typography component="h2" variant="h5" sx={{ mb: 2 }}>题目描述</Typography>
          <Box sx={{ maxWidth: 860 }}>
            {content.trim() ? (
              <Markdown content={content} />
            ) : (
              <EmptyBox message="暂无题目描述" />
            )}
          </Box>
        </Paper>

        <Paper component="aside" variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.8}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Send size={16} />}
              onClick={() => navigate(submitHref)}
            >
              提交
            </Button>
            {!tid ? <Button
              fullWidth
              color="inherit"
              component={RouterLink}
              to={discussionHref}
              startIcon={<MessageSquare size={16} />}
            >
              题解
            </Button> : null}
            {user && !tid ? (
              <Button
                fullWidth
                color={starred ? 'primary' : 'inherit'}
                variant={starred ? 'outlined' : 'text'}
                startIcon={<Star size={16} fill={starred ? 'currentColor' : 'none'} />}
                disabled={starring}
                onClick={() => void toggleStar()}
              >
                {starring ? '处理中' : starred ? '已收藏' : '收藏题目'}
              </Button>
            ) : null}
            {actionError ? <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert> : null}
            {!tid ? <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8 }}>
              <Button component={RouterLink} to={`/problem/${encodeURIComponent(pid)}/stats`} size="small" color="inherit" startIcon={<BarChart3 size={15} />}>统计</Button>
              <Button component={RouterLink} to={`/problem/${encodeURIComponent(pid)}/files`} size="small" color="inherit" startIcon={<Files size={15} />}>文件</Button>
            </Box> : null}
            {(isSuperUser(user)) ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8 }}>
                <HydroWorkspaceButton path={`/p/${encodeURIComponent(pid)}/edit`} title="编辑题目" size="small" color="inherit" startIcon={<Settings2 size={15} />}>编辑题目</HydroWorkspaceButton>
                <HydroWorkspaceButton path={`/p/${encodeURIComponent(pid)}/config`} title="题目数据配置" size="small" color="inherit" startIcon={<SlidersHorizontal size={15} />}>数据配置</HydroWorkspaceButton>
              </Box>
            ) : null}
            <Divider />
            <Typography variant="subtitle2">题目信息</Typography>
            <Box>
              <Typography variant="caption" color="text.secondary">
                通过 / 提交
              </Typography>
              <Typography sx={{ fontWeight: 650 }}>{stats}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                难度
              </Typography>
              <Typography sx={{ fontWeight: 650 }}>{problem.difficulty ?? '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                标签
              </Typography>
              {tags.length ? (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.7, flexWrap: 'wrap' }}>
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontWeight: 650 }}>—</Typography>
              )}
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnackbarOpen(false)}
        >
          提交已送达，评测进行中。
        </Alert>
      </Snackbar>
    </>
  );
}
