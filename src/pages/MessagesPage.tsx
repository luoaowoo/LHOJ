import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Bell, MoreHorizontal, Plus, Send, Trash2, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroAvatarUrl } from '../lib/endpoint';
import { postHydroForm, scrapeUserMessages } from '../lib/scrape';
import type { UserMessage } from '../types';
import { useAuth } from '../auth';

function conversationId(message: UserMessage, userId?: number): number { return message.from === userId ? (message.to[0] ?? 0) : message.from; }
function timeLabel(value?: string): string { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UserMessage[] | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [deleting, setDeleting] = useState<UserMessage | null>(null);
  const [acting, setActing] = useState(false);
  const load = useCallback(async () => { setError(''); try { setMessages(await scrapeUserMessages()); } catch (cause) { setError(cause instanceof Error ? cause.message : '消息加载失败。'); } }, []);
  useEffect(() => { void load(); }, [load]);
  const conversations = useMemo(() => { const grouped = new Map<number, UserMessage[]>(); messages?.forEach((message) => { const id = conversationId(message, user?._id); grouped.set(id, [...(grouped.get(id) ?? []), message]); }); return [...grouped.entries()].map(([id, items]) => ({ id, items, latest: items[items.length - 1] })).sort((a, b) => (b.latest.sentAt ?? '').localeCompare(a.latest.sentAt ?? '')); }, [messages, user?._id]);
  const activeId = selectedId ?? conversations[0]?.id ?? null;
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const activeName = activeConversation?.latest.sender || (activeId ? `用户 ${activeId}` : '选择一个会话');
  const send = async () => { const uid = Number((recipient || activeId || '').toString().trim()); if (!Number.isSafeInteger(uid) || uid <= 0 || !content.trim() || acting) return; setActing(true); setError(''); try { await postHydroForm('/home/messages', { operation: 'send', uid: String(uid), content: content.trim() }); setContent(''); setRecipient(''); setNewConversationOpen(false); setSelectedId(uid); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '消息发送失败。'); } finally { setActing(false); } };
  const remove = async () => { if (!deleting || acting) return; setActing(true); setError(''); try { await postHydroForm('/home/messages', { operation: 'delete_message', messageId: deleting.id }); setDeleting(null); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '消息删除失败。'); } finally { setActing(false); } };
  if (!messages && !error) return <FullPageLoader />;
  if (!messages && error) return <ErrorBox message={error} onRetry={() => void load()} />;
  return <Box>
    <PageHeader icon={<Bell size={20} />} title="站内消息" />
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    <Paper variant="outlined" sx={{ height: { xs: 'min(720px, calc(100vh - 150px))', md: 'min(760px, calc(100vh - 170px))' }, minHeight: 520, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' }, overflow: 'hidden' }}>
      <Box sx={{ borderRight: { md: '1px solid' }, borderBottom: { xs: '1px solid', md: 0 }, borderColor: 'divider', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography sx={{ fontWeight: 700 }}>会话</Typography><Tooltip title="新建会话"><IconButton aria-label="新建会话" onClick={() => setNewConversationOpen(true)}><Plus size={18} /></IconButton></Tooltip></Box>
        <Divider />
        <Box sx={{ overflowY: 'auto', flex: 1 }}>{conversations.length ? conversations.map((conversation) => { const message = conversation.latest; const name = message.sender || `用户 ${conversation.id}`; return <Box key={conversation.id} onClick={() => setSelectedId(conversation.id)} sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.2, cursor: 'pointer', bgcolor: activeId === conversation.id ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}><Avatar src={hydroAvatarUrl(undefined, conversation.id)} sx={{ width: 40, height: 40, bgcolor: 'primary.main', flex: '0 0 auto' }}>{name.slice(0, 1)}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography noWrap sx={{ fontWeight: 650 }}>{name}</Typography><Typography variant="caption" color="text.secondary" noWrap>{timeLabel(message.sentAt)}</Typography></Box><Typography variant="body2" color="text.secondary" noWrap>{message.content}</Typography></Box></Box>; }) : <EmptyBox message="暂无会话" />}</Box>
      </Box>
      <Box sx={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Box><Typography sx={{ fontWeight: 700 }}>{activeName}</Typography><Typography variant="caption" color="text.secondary">站内消息</Typography></Box><MoreHorizontal size={20} opacity={0.55} /></Box>
        <Divider />
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 2, md: 3 }, bgcolor: 'background.default' }}>{activeConversation ? <Stack spacing={1.5}>{activeConversation.items.map((message) => { const mine = message.from === user?._id; return <Box key={message.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 1 }}><Box sx={{ maxWidth: 'min(72%, 560px)' }}><Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: mine ? 'right' : 'left', mb: 0.4 }}>{timeLabel(message.sentAt)}</Typography><Box sx={{ px: 1.5, py: 1, borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', bgcolor: mine ? 'primary.main' : 'background.paper', color: mine ? 'primary.contrastText' : 'text.primary', border: mine ? 0 : '1px solid', borderColor: 'divider', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</Box></Box>{mine ? <Tooltip title="删除消息"><IconButton size="small" aria-label="删除消息" onClick={() => setDeleting(message)} disabled={acting}><Trash2 size={15} /></IconButton></Tooltip> : null}</Box>; })}</Stack> : <EmptyBox message="选择左侧会话，或新建一个会话" />}</Box>
        <Divider /><Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', gap: 1, alignItems: 'flex-end' }}><TextField fullWidth multiline maxRows={4} size="small" placeholder="输入消息..." value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} disabled={!activeId || acting} /><Tooltip title="发送"><span><IconButton color="primary" aria-label="发送消息" onClick={() => void send()} disabled={!activeId || acting || !content.trim()}><Send size={20} /></IconButton></span></Tooltip></Box>
      </Box>
    </Paper>
    <Dialog open={newConversationOpen} onClose={() => setNewConversationOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ pr: 6 }}>新建会话<IconButton aria-label="关闭" onClick={() => setNewConversationOpen(false)} sx={{ position: 'absolute', right: 12, top: 10 }}><X size={20} /></IconButton></DialogTitle><DialogContent><TextField autoFocus fullWidth label="用户 ID" value={recipient} onChange={(event) => setRecipient(event.target.value)} inputMode="numeric" onKeyDown={(event) => { if (event.key === 'Enter') void send(); }} /></DialogContent><DialogActions><Button onClick={() => setNewConversationOpen(false)}>取消</Button><Button variant="contained" onClick={() => { setSelectedId(Number(recipient)); setNewConversationOpen(false); }} disabled={!Number.isSafeInteger(Number(recipient)) || Number(recipient) <= 0}>开始会话</Button></DialogActions></Dialog>
    <ConfirmDialog open={Boolean(deleting)} title="删除消息？" content="只能删除自己发送的消息，此操作不能撤销。" confirmLabel="删除" loading={acting} onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
  </Box>;
}
