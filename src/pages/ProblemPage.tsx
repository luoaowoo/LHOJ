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
import { BarChart3, Files, MessageSquare, Send, Settings2, SlidersHorizontal, Star } from 'lucide-react';
import { useAuth } from '../auth';
import Markdown from '../components/Markdown';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchProblem, localizedContent } from '../lib/api';
import { hydroPublicUrl } from '../lib/endpoint';
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
      fetchProblem(id),
      user ? scrapeProblemStar(id).catch(() => false) : Promise.resolve(false),
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
  }, [id, user?._id]);

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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 300px' },
          alignItems: 'start',
          gap: 2,
        }}
      >
        <Paper component="article" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {problem.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            #{pid}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
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
            <Typography variant="subtitle2" color="text.secondary">
              题目信息
            </Typography>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Send size={16} />}
              onClick={() => navigate(submitHref)}
            >
              提交
            </Button>
            <Button
              fullWidth
              color="inherit"
              component={RouterLink}
              to={discussionHref}
              startIcon={<MessageSquare size={16} />}
            >
              题解
            </Button>
            {user ? (
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
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8 }}>
              <Button component={RouterLink} to={`/problem/${encodeURIComponent(pid)}/stats`} size="small" color="inherit" startIcon={<BarChart3 size={15} />}>统计</Button>
              <Button component={RouterLink} to={`/problem/${encodeURIComponent(pid)}/files`} size="small" color="inherit" startIcon={<Files size={15} />}>文件</Button>
            </Box>
            {user?.role === 'root' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8 }}>
                <Button component="a" href={hydroPublicUrl(`/p/${encodeURIComponent(pid)}/edit`)} target="_blank" rel="noreferrer" size="small" color="inherit" startIcon={<Settings2 size={15} />}>编辑题目</Button>
                <Button component="a" href={hydroPublicUrl(`/p/${encodeURIComponent(pid)}/config`)} target="_blank" rel="noreferrer" size="small" color="inherit" startIcon={<SlidersHorizontal size={15} />}>数据配置</Button>
              </Box>
            ) : null}
            <Divider />
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
            {problem.hidden && <Chip label="隐藏题目" color="warning" size="small" />}
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
