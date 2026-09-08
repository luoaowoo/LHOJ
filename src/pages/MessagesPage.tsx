import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { Bell, ExternalLink, Send, Trash2 } from 'lucide-react';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';
import { postHydroForm, scrapeUserMessages } from '../lib/scrape';
import type { UserMessage } from '../types';
import { useAuth } from '../auth';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UserMessage[] | null>(null);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [deleting, setDeleting] = useState<UserMessage | null>(null);
  const [acting, setActing] = useState(false);
  const load = useCallback(async () => { setError(''); try { setMessages(await scrapeUserMessages()); } catch (cause) { setError(cause instanceof Error ? cause.message : '消息加载失败。'); } }, []);
  useEffect(() => { void load(); }, [load]);
  const send = async () => {
    const uid = Number(recipient.trim());
    if (!Number.isSafeInteger(uid) || uid <= 0 || !content.trim() || acting) return;
    setActing(true); setError('');
    try { await postHydroForm('/home/messages', { operation: 'send', uid: String(uid), content: content.trim() }); setContent(''); setRecipient(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '消息发送失败。'); }
    finally { setActing(false); }
  };
  const remove = async () => { if (!deleting || acting) return; setActing(true); setError(''); try { await postHydroForm('/home/messages', { operation: 'delete_message', messageId: deleting.id }); setDeleting(null); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '消息删除失败。'); } finally { setActing(false); } };
  if (!messages && !error) return <FullPageLoader />;
  if (!messages && error) return <ErrorBox message={error} onRetry={() => void load()} />;
  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 2 }}><Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><Bell size={21} />站内消息</Typography><Button component="a" href={hydroPublicUrl('/home/messages')} target="_blank" rel="noreferrer" size="small" endIcon={<ExternalLink size={15} />}>Hydro 原始页面</Button></Box>
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    {messages?.length ? <Stack spacing={1.2}>{messages.map((message) => <Paper key={message.id} variant="outlined" sx={{ p: 2 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Box><Typography variant="subtitle2">{message.from === user?._id ? `发送给 ${message.sender || '用户'}` : message.sender || `用户 ${message.from}`}</Typography><Typography variant="body2" sx={{ mt: 0.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</Typography></Box>{message.from === user?._id ? <Button aria-label="删除消息" color="error" onClick={() => setDeleting(message)} disabled={acting}><Trash2 size={16} /></Button> : null}</Box></Paper>)}</Stack> : <EmptyBox message="暂无消息" />}
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.2 }}>发送消息</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField size="small" label="接收者 UID" value={recipient} onChange={(e) => setRecipient(e.target.value)} inputMode="numeric" sx={{ minWidth: { sm: 150 } }} /><TextField fullWidth size="small" label="内容" value={content} onChange={(e) => setContent(e.target.value)} /><Button variant="contained" startIcon={<Send size={15} />} onClick={() => void send()} disabled={acting || !recipient.trim() || !content.trim()}>发送</Button></Stack></Paper>
    <Dialog open={Boolean(deleting)} onClose={() => { if (!acting) setDeleting(null); }}><DialogTitle>删除消息？</DialogTitle><DialogContent><DialogContentText>只能删除自己发送的消息，此操作不能撤销。</DialogContentText></DialogContent><DialogActions><Button color="inherit" onClick={() => setDeleting(null)} disabled={acting}>取消</Button><Button color="error" variant="contained" onClick={() => void remove()} disabled={acting}>删除</Button></DialogActions></Dialog>
  </Box>;
}
