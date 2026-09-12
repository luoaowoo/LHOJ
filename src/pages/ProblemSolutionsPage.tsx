import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Pagination, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowDown, ArrowLeft, ArrowUp, Lightbulb, MessageSquare, Pencil, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../auth';
import ConfirmDialog from '../components/ConfirmDialog';
import Markdown from '../components/Markdown';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroWorkspaceHref } from '../lib/hydro-workspace';
import { postHydroForm, scrapeProblemSolutions } from '../lib/scrape';
import type { ProblemSolutionsResult } from '../types';

export default function ProblemSolutionsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const [result, setResult] = useState<ProblemSolutionsResult | null>(null);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [editing, setEditing] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editingReply, setEditingReply] = useState<{ psid: string; psrid: string } | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [deleting, setDeleting] = useState('');
  const [deletingReply, setDeletingReply] = useState<{ psid: string; psrid: string } | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setResult(await scrapeProblemSolutions(id, page));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '题解加载失败。');
    }
  }, [id, page]);

  useEffect(() => { void load(); }, [load]);
  if (!result && !error) return <FullPageLoader />;
  if (error) return <ErrorBox message={error} onRetry={() => void load()} />;

  const operate = async (operation: 'submit' | 'reply' | 'edit_solution' | 'delete_solution' | 'edit_reply' | 'delete_reply' | 'upvote' | 'downvote', psid?: string, psrid?: string) => {
    if (acting) return;
    setActing(true);
    setActionError('');
    try {
      await postHydroForm(`/p/${encodeURIComponent(id)}/solution`, {
        operation,
        ...(psid ? { psid } : {}),
        ...(psrid ? { psrid } : {}),
        ...(operation === 'submit' ? { content: content.trim() } : {}),
        ...(operation === 'reply' ? { content: replyContent.trim() } : {}),
        ...(operation === 'edit_solution' ? { content: editContent.trim() } : {}),
        ...(operation === 'edit_reply' ? { content: editReplyContent.trim() } : {}),
      });
      if (operation === 'submit') setContent('');
      if (operation === 'reply') {
        setReplyContent('');
        setReplyTo('');
      }
      if (operation === 'edit_solution') {
        setEditing('');
        setEditContent('');
      }
      if (operation === 'delete_solution') setDeleting('');
      if (operation === 'edit_reply') {
        setEditingReply(null);
        setEditReplyContent('');
      }
      if (operation === 'delete_reply') setDeletingReply(null);
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '题解操作失败。');
    } finally {
      setActing(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <Button component={RouterLink} to={`/problem/${encodeURIComponent(id)}`} color="inherit" size="small" startIcon={<ArrowLeft size={16} />}>返回题目</Button>
      </Box>
      <PageHeader
        icon={<Lightbulb size={22} />}
        title="题解"
        actions={(
          <Button component={RouterLink} to={hydroWorkspaceHref(`/p/${encodeURIComponent(id)}/solution`, '发布或管理题解')} size="small">
            发布或管理题解
          </Button>
        )}
      />
      {actionError ? <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert> : null}
      {!result?.items.length ? <EmptyBox message="暂无公开题解" /> : (
        <Stack spacing={1.5}>
          {result.items.map((solution) => (
            <Paper key={solution.id} component="article" variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>{solution.title || '题解'}</Typography><Typography variant="caption" color="text.secondary">{solution.author || '未知作者'}</Typography></Box>
                <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {user && (user._id === solution.ownerId || user.role === 'root') ? (
                    <>
                      <Button color="inherit" aria-label="编辑题解" disabled={acting} onClick={() => { setEditing(solution.id); setEditContent(solution.content); }}><Pencil size={15} /></Button>
                      <Button color="error" aria-label="删除题解" disabled={acting} onClick={() => setDeleting(solution.id)}><Trash2 size={15} /></Button>
                    </>
                  ) : null}
                  <Button color={solution.userVote === 1 ? 'primary' : 'inherit'} startIcon={<ArrowUp size={15} />} disabled={!user || acting} onClick={() => void operate('upvote', solution.id)}>{solution.vote}</Button>
                  <Button color={solution.userVote === -1 ? 'error' : 'inherit'} aria-label="反对题解" disabled={!user || acting} onClick={() => void operate('downvote', solution.id)}><ArrowDown size={15} /></Button>
                </Stack>
              </Box>
              {editing === solution.id ? (
                <Box component="form" sx={{ mt: 1.5 }} onSubmit={(event) => { event.preventDefault(); void operate('edit_solution', solution.id); }}>
                  <TextField fullWidth multiline minRows={5} label="编辑题解" value={editContent} onChange={(event) => setEditContent(event.target.value)} autoFocus />
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}><Button color="inherit" onClick={() => setEditing('')} disabled={acting}>取消</Button><Button type="submit" variant="contained" disabled={acting || !editContent.trim()}>保存</Button></Stack>
                </Box>
              ) : <Box sx={{ mt: 1.5 }}><Markdown content={solution.content || '暂无内容。'} /></Box>}
              {solution.replies.length ? (
                <Stack spacing={1} sx={{ mt: 1.5, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                  {solution.replies.map((reply) => (
                    <Box key={reply.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">{reply.author || '未知用户'}</Typography>
                        {user && (user._id === reply.ownerId || user.role === 'root') ? (
                          <Stack direction="row">
                            <Button color="inherit" aria-label="编辑回复" disabled={acting} onClick={() => { setEditingReply({ psid: solution.id, psrid: reply.id }); setEditReplyContent(reply.content); }}><Pencil size={14} /></Button>
                            <Button color="error" aria-label="删除回复" disabled={acting} onClick={() => setDeletingReply({ psid: solution.id, psrid: reply.id })}><Trash2 size={14} /></Button>
                          </Stack>
                        ) : null}
                      </Box>
                      {editingReply?.psid === solution.id && editingReply.psrid === reply.id ? (
                        <Box component="form" onSubmit={(event) => { event.preventDefault(); void operate('edit_reply', solution.id, reply.id); }}>
                          <TextField fullWidth multiline minRows={3} label="编辑回复" value={editReplyContent} onChange={(event) => setEditReplyContent(event.target.value)} autoFocus />
                          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}><Button color="inherit" onClick={() => setEditingReply(null)} disabled={acting}>取消</Button><Button type="submit" variant="contained" disabled={acting || !editReplyContent.trim()}>保存</Button></Stack>
                        </Box>
                      ) : <Markdown content={reply.content} />}
                    </Box>
                  ))}
                </Stack>
              ) : null}
              {user ? (
                <Box sx={{ mt: 1.5 }}>
                  {replyTo === solution.id ? (
                    <Box component="form" onSubmit={(event) => { event.preventDefault(); void operate('reply', solution.id); }}>
                      <TextField fullWidth multiline minRows={3} label="回复题解" value={replyContent} onChange={(event) => setReplyContent(event.target.value)} autoFocus />
                      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Button color="inherit" onClick={() => { setReplyTo(''); setReplyContent(''); }} disabled={acting}>取消</Button>
                        <Button type="submit" variant="contained" startIcon={<Send size={15} />} disabled={acting || !replyContent.trim()}>回复</Button>
                      </Stack>
                    </Box>
                  ) : (
                    <Button size="small" color="inherit" startIcon={<MessageSquare size={15} />} onClick={() => { setReplyTo(solution.id); setReplyContent(''); }}>回复</Button>
                  )}
                </Box>
              ) : null}
            </Paper>
          ))}
        </Stack>
      )}
      {result && result.pageCount > 1 ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><Pagination page={page} count={result.pageCount} onChange={(_event, value) => { const next = new URLSearchParams(searchParams); if (value === 1) next.delete('page'); else next.set('page', String(value)); setSearchParams(next); }} /></Box> : null}
      {user ? <Paper component="form" variant="outlined" sx={{ p: 2, mt: 2 }} onSubmit={(event) => { event.preventDefault(); void operate('submit'); }}><TextField fullWidth multiline minRows={5} label="发布题解" value={content} onChange={(event) => setContent(event.target.value)} /><Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}><Button type="submit" variant="contained" startIcon={<Send size={16} />} disabled={acting || !content.trim()}>发布</Button></Box></Paper> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除题解？"
        content="题解及其回复将被删除，此操作不能撤销。"
        confirmLabel="删除"
        loading={acting}
        onConfirm={() => void operate('delete_solution', deleting)}
        onClose={() => setDeleting('')}
      />
      <ConfirmDialog
        open={Boolean(deletingReply)}
        title="删除回复？"
        content="这条回复将被永久删除，此操作不能撤销。"
        confirmLabel="删除"
        loading={acting}
        onConfirm={() => { if (deletingReply) void operate('delete_reply', deletingReply.psid, deletingReply.psrid); }}
        onClose={() => setDeletingReply(null)}
      />
    </Box>
  );
}
