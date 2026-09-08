import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, Divider, Pagination, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { ArrowLeft, ExternalLink, LogIn, MessageSquare, Pencil, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../auth';
import Markdown from '../components/Markdown';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { postHydroForm, scrapeDiscussionDetail } from '../lib/scrape';
import type { DiscussionDetail } from '../types';

export default function DiscussionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [reply, setReply] = useState('');
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deletingDiscussion, setDeletingDiscussion] = useState(false);
  const [editingReply, setEditingReply] = useState<{ drid: string; drrid?: string; content: string } | null>(null);
  const [deletingReply, setDeletingReply] = useState<{ drid: string; drrid?: string } | null>(null);
  const [tailReplyTo, setTailReplyTo] = useState('');
  const [tailReplyContent, setTailReplyContent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const next = await scrapeDiscussionDetail(id, page);
      if (!next) setLoadError('讨论不存在或无权访问。');
      else setDiscussion(next);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '讨论详情加载失败。');
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitReply = async () => {
    const content = reply.trim();
    if (!content || posting) return;
    setPosting(true);
    setSubmitError('');
    try {
      await postHydroForm(`/discuss/${encodeURIComponent(id)}`, { operation: 'reply', content });
      setReply('');
      await load();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : '回复失败。');
    } finally {
      setPosting(false);
    }
  };

  const updateDiscussion = async (operation: 'update' | 'delete') => {
    if (posting) return;
    setPosting(true);
    setSubmitError('');
    try {
      await postHydroForm(`/discuss/${encodeURIComponent(id)}/edit`, {
        operation,
        did: id,
        ...(operation === 'update' ? { title: editTitle.trim(), content: editContent.trim() } : {}),
      });
      if (operation === 'delete') navigate('/discuss', { replace: true });
      else {
        setEditingDiscussion(false);
        await load();
      }
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : '讨论操作失败。');
    } finally {
      setPosting(false);
      setDeletingDiscussion(false);
    }
  };

  const updateReply = async (operation: 'edit_reply' | 'delete_reply' | 'edit_tail_reply' | 'delete_tail_reply') => {
    const target = operation.startsWith('edit_') ? editingReply : deletingReply;
    if (!target || posting) return;
    setPosting(true);
    setSubmitError('');
    try {
      await postHydroForm(`/discuss/${encodeURIComponent(id)}`, {
        operation,
        drid: target.drid,
        ...(target.drrid ? { drrid: target.drrid } : {}),
        ...(operation.startsWith('edit_') && editingReply ? { content: editingReply.content.trim() } : {}),
      });
      setEditingReply(null);
      setDeletingReply(null);
      await load();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : '回复操作失败。');
    } finally {
      setPosting(false);
    }
  };

  const submitTailReply = async (drid: string) => {
    if (!tailReplyContent.trim() || posting) return;
    setPosting(true);
    setSubmitError('');
    try {
      await postHydroForm(`/discuss/${encodeURIComponent(id)}`, {
        operation: 'tail_reply',
        drid,
        content: tailReplyContent.trim(),
      });
      setTailReplyTo('');
      setTailReplyContent('');
      await load();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : '回复失败。');
    } finally {
      setPosting(false);
    }
  };

  if (loading && !discussion) return <FullPageLoader />;
  if (loadError || !discussion) return <ErrorBox message={loadError || '讨论不存在。'} onRetry={() => void load()} />;
  const canManageDiscussion = Boolean(user && (user._id === discussion.ownerId || user.role === 'root'));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button component={RouterLink} to="/discuss" color="inherit" size="small" startIcon={<ArrowLeft size={16} />}>
          讨论列表
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canManageDiscussion ? <Button size="small" startIcon={<Pencil size={15} />} onClick={() => { setEditTitle(discussion.title); setEditContent(discussion.content); setEditingDiscussion(true); }}>编辑</Button> : null}
          {canManageDiscussion ? <Button size="small" color="error" startIcon={<Trash2 size={15} />} onClick={() => setDeletingDiscussion(true)}>删除</Button> : null}
          <Button component="a" href={hydroPublicUrl(`/discuss/${encodeURIComponent(id)}`)} target="_blank" rel="noreferrer" size="small" endIcon={<ExternalLink size={15} />}>
            Hydro 原始页面
          </Button>
        </Box>
      </Box>

      <Paper component="article" variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        {editingDiscussion ? (
          <Box component="form" onSubmit={(event) => { event.preventDefault(); void updateDiscussion('update'); }}>
            <TextField fullWidth label="标题" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} autoFocus />
            <TextField fullWidth multiline minRows={6} label="正文" value={editContent} onChange={(event) => setEditContent(event.target.value)} sx={{ mt: 1.5 }} />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}><Button color="inherit" onClick={() => setEditingDiscussion(false)} disabled={posting}>取消</Button><Button type="submit" variant="contained" disabled={posting || !editTitle.trim() || !editContent.trim()}>保存</Button></Stack>
          </Box>
        ) : <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><MessageSquare size={21} />{discussion.title}</Typography>}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.7 }}>
          {discussion.parentId ? `${discussion.parentId} · ` : ''}{discussion.author || '未知作者'} · {discussion.views} 次浏览 · {discussion.replies} 条回复
        </Typography>
        {!editingDiscussion ? <><Divider sx={{ my: 2 }} />{discussion.content ? <Markdown content={discussion.content} /> : <EmptyBox message="暂无正文" />}</> : null}
      </Paper>

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {discussion.repliesDetail.map((item, index) => (
          <Paper key={item.id} variant="outlined" sx={{ p: { xs: 1.8, md: 2.2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">#{index + 1} · {item.author || '未知用户'}</Typography>
              {user && (user._id === item.ownerId || user.role === 'root') ? <Stack direction="row"><Button aria-label="编辑回复" color="inherit" disabled={posting} onClick={() => setEditingReply({ drid: item.id, content: item.content })}><Pencil size={14} /></Button><Button aria-label="删除回复" color="error" disabled={posting} onClick={() => setDeletingReply({ drid: item.id })}><Trash2 size={14} /></Button></Stack> : null}
            </Box>
            {editingReply?.drid === item.id && !editingReply.drrid ? <Box component="form" sx={{ mt: 1 }} onSubmit={(event) => { event.preventDefault(); void updateReply('edit_reply'); }}><TextField fullWidth multiline minRows={3} label="编辑回复" value={editingReply.content} onChange={(event) => setEditingReply({ ...editingReply, content: event.target.value })} autoFocus /><Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}><Button color="inherit" onClick={() => setEditingReply(null)} disabled={posting}>取消</Button><Button type="submit" variant="contained" disabled={posting || !editingReply.content.trim()}>保存</Button></Stack></Box> : <Box sx={{ mt: 0.8 }}><Markdown content={item.content || '（空回复）'} /></Box>}
            {item.replies?.length ? (
              <Stack spacing={1} sx={{ mt: 1.5, pl: { xs: 1.5, sm: 3 }, borderLeft: 2, borderColor: 'divider' }}>
                {item.replies.map((nested) => (
                  <Box key={nested.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography variant="caption" color="text.secondary">{nested.author || '未知用户'}</Typography>{user && (user._id === nested.ownerId || user.role === 'root') ? <Stack direction="row"><Button aria-label="编辑楼中楼回复" color="inherit" disabled={posting} onClick={() => setEditingReply({ drid: item.id, drrid: nested.id, content: nested.content })}><Pencil size={14} /></Button><Button aria-label="删除楼中楼回复" color="error" disabled={posting} onClick={() => setDeletingReply({ drid: item.id, drrid: nested.id })}><Trash2 size={14} /></Button></Stack> : null}</Box>
                    {editingReply?.drid === item.id && editingReply.drrid === nested.id ? <Box component="form" onSubmit={(event) => { event.preventDefault(); void updateReply('edit_tail_reply'); }}><TextField fullWidth multiline minRows={3} label="编辑回复" value={editingReply.content} onChange={(event) => setEditingReply({ ...editingReply, content: event.target.value })} autoFocus /><Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}><Button color="inherit" onClick={() => setEditingReply(null)} disabled={posting}>取消</Button><Button type="submit" variant="contained" disabled={posting || !editingReply.content.trim()}>保存</Button></Stack></Box> : <Markdown content={nested.content || '（空回复）'} />}
                  </Box>
                ))}
              </Stack>
            ) : null}
            {user ? tailReplyTo === item.id ? (
              <Box component="form" sx={{ mt: 1.5 }} onSubmit={(event) => { event.preventDefault(); void submitTailReply(item.id); }}>
                <TextField fullWidth multiline minRows={2} label={`回复 ${item.author || '该用户'}`} value={tailReplyContent} onChange={(event) => setTailReplyContent(event.target.value)} autoFocus />
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}><Button color="inherit" onClick={() => { setTailReplyTo(''); setTailReplyContent(''); }} disabled={posting}>取消</Button><Button type="submit" variant="contained" startIcon={<Send size={15} />} disabled={posting || !tailReplyContent.trim()}>回复</Button></Stack>
              </Box>
            ) : <Button size="small" color="inherit" startIcon={<MessageSquare size={14} />} sx={{ mt: 1 }} onClick={() => { setTailReplyTo(item.id); setTailReplyContent(''); }}>回复此楼</Button> : null}
          </Paper>
        ))}
      </Stack>

      {discussion.pageCount > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Pagination
            color="primary"
            page={page}
            count={discussion.pageCount}
            onChange={(_event, value) => {
              const next = new URLSearchParams(searchParams);
              if (value === 1) next.delete('page');
              else next.set('page', String(value));
              setSearchParams(next);
            }}
          />
        </Box>
      ) : null}

      {user ? <Paper component="form" variant="outlined" sx={{ p: { xs: 1.8, md: 2.2 } }} onSubmit={(event) => { event.preventDefault(); void submitReply(); }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.2 }}>回复讨论</Typography>
        <TextField
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          fullWidth
          multiline
          minRows={4}
          placeholder="写下你的回复"
          inputProps={{ 'aria-label': '回复内容' }}
        />
        {submitError ? <Alert severity="error" sx={{ mt: 1.2 }}>{submitError}</Alert> : null}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.2 }}>
          <Button type="submit" variant="contained" startIcon={posting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />} disabled={!reply.trim() || posting}>
            {posting ? '发送中' : '发送回复'}
          </Button>
        </Box>
      </Paper> : (
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography color="text.secondary">登录后参与讨论</Typography>
          <Button component={RouterLink} to="/login" state={{ from: `/discuss/${id}` }} variant="contained" startIcon={<LogIn size={16} />}>登录</Button>
        </Paper>
      )}
      <Dialog open={deletingDiscussion} onClose={() => { if (!posting) setDeletingDiscussion(false); }}><DialogTitle>删除讨论？</DialogTitle><DialogContent><DialogContentText>讨论及全部回复将被永久删除，此操作不能撤销。</DialogContentText></DialogContent><DialogActions><Button color="inherit" onClick={() => setDeletingDiscussion(false)} disabled={posting}>取消</Button><Button color="error" variant="contained" onClick={() => void updateDiscussion('delete')} disabled={posting}>删除</Button></DialogActions></Dialog>
      <Dialog open={Boolean(deletingReply)} onClose={() => { if (!posting) setDeletingReply(null); }}><DialogTitle>删除回复？</DialogTitle><DialogContent><DialogContentText>这条回复将被永久删除，此操作不能撤销。</DialogContentText></DialogContent><DialogActions><Button color="inherit" onClick={() => setDeletingReply(null)} disabled={posting}>取消</Button><Button color="error" variant="contained" onClick={() => void updateReply(deletingReply?.drrid ? 'delete_tail_reply' : 'delete_reply')} disabled={posting}>删除</Button></DialogActions></Dialog>
    </Box>
  );
}
