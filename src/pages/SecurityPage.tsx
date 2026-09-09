import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemText, Paper, Stack, TextField, Typography } from '@mui/material';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { confirmSudo, formatDate, postHydroForm, scrapeSecurity } from '../lib/scrape';
import type { UserSession } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';

export default function SecurityPage() {
  const { logout: clearAuth } = useAuth();
  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [error, setError] = useState('');
  const [sudoOpen, setSudoOpen] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [tfa, setTfa] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError('');
    try {
      const result = await scrapeSecurity();
      setSessions(result.sessions);
      if (result.sudoRequired) setSudoOpen(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '安全信息加载失败。'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const verify = async () => {
    if (!password && !tfa) return;
    setBusy(true); setError('');
    try { await confirmSudo(password, tfa); setPassword(''); setTfa(''); setSudoOpen(false); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '验证失败。'); }
    finally { setBusy(false); }
  };
  const remove = async (session: UserSession) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await postHydroForm('/home/security', { operation: 'delete_token', tokenDigest: session.id }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '退出会话失败。'); }
    finally { setBusy(false); }
  };
  const removeAll = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await postHydroForm('/home/security', { operation: 'delete_all_tokens' }); setConfirmAllOpen(false); await clearAuth(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '退出全部会话失败。'); }
    finally { setBusy(false); }
  };
  const changePassword = async () => {
    if (busy || !currentPassword || !newPassword || newPassword !== verifyPassword) return;
    setBusy(true); setError('');
    try {
      await postHydroForm('/home/security', {
        operation: 'change_password',
        current: currentPassword,
        password: newPassword,
        verifyPassword,
      });
      setCurrentPassword(''); setNewPassword(''); setVerifyPassword('');
      await clearAuth();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '修改密码失败。'); }
    finally { setBusy(false); }
  };
  if (!sessions && !error) return <FullPageLoader />;
  if (!sessions && error) return <ErrorBox message={error} onRetry={() => void load()} />;
  return <Box sx={{ maxWidth: 820 }}>
    <PageHeader icon={<ShieldCheck size={20} />} title="安全设置" />
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="h6">活动会话</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>管理当前账号已登录的浏览器和设备。</Typography>
      <Divider sx={{ my: 2 }} />
      <List disablePadding>{sessions?.map((session) => {
        const ua = `${session.updateUaInfo?.os?.name || ''} ${session.updateUaInfo?.os?.version || ''}`.trim() || '未知设备';
        const browser = `${session.updateUaInfo?.browser?.name || ''} ${session.updateUaInfo?.browser?.version || ''}`.trim();
        const detail = [browser, session.updateIp, session.updateGeoip?.display, session.updateAt ? formatDate(session.updateAt) : ''].filter(Boolean).join(' · ');
        return <ListItem key={session.id} divider secondaryAction={!session.isCurrent ? <Button color="error" startIcon={<LogOut size={16} />} onClick={() => void remove(session)} disabled={busy}>退出</Button> : null}>
          <ListItemText primary={`${ua}${session.isCurrent ? ' · 当前会话' : ''}`} secondary={detail || '暂无设备详情'} />
        </ListItem>;
      })}</List>
      <Button color="error" variant="outlined" startIcon={<LogOut size={16} />} onClick={() => setConfirmAllOpen(true)} disabled={busy || !sessions?.length} sx={{ mt: 1 }}>退出全部会话</Button>
    </Paper>
    <Paper component="form" variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mt: 2 }} onSubmit={(event) => { event.preventDefault(); void changePassword(); }}>
      <Typography variant="h6">修改密码</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2 }}>修改后所有设备都需要使用新密码重新登录。</Typography>
      <Stack spacing={1.5} sx={{ maxWidth: 460 }}>
        <TextField label="当前密码" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        <TextField label="新密码" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        <TextField label="再次输入新密码" type="password" autoComplete="new-password" value={verifyPassword} onChange={(event) => setVerifyPassword(event.target.value)} error={Boolean(verifyPassword && newPassword !== verifyPassword)} helperText={verifyPassword && newPassword !== verifyPassword ? '两次输入的新密码不一致' : ' '} required />
        <Button type="submit" variant="contained" disabled={busy || !currentPassword || !newPassword || newPassword !== verifyPassword} sx={{ alignSelf: 'flex-start' }}>修改密码</Button>
      </Stack>
    </Paper>
    <Button component="a" href={hydroPublicUrl('/home/security')} target="_blank" rel="noreferrer" size="small" sx={{ mt: 1.5 }}>打开 Hydro 完整安全设置</Button>
    <Dialog open={sudoOpen} onClose={() => { if (!busy) setSudoOpen(false); }} fullWidth maxWidth="xs">
      <DialogTitle>验证身份</DialogTitle>
      <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><TextField label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /><TextField label="两步验证码（可选）" value={tfa} onChange={(e) => setTfa(e.target.value)} inputMode="numeric" /></Stack></DialogContent>
      <DialogActions><Button onClick={() => setSudoOpen(false)} disabled={busy}>取消</Button><Button variant="contained" onClick={() => void verify()} disabled={busy || (!password && !tfa)}>验证</Button></DialogActions>
    </Dialog>
    <ConfirmDialog
      open={confirmAllOpen}
      title="退出全部会话"
      content="确定退出全部会话吗？当前会话也会失效。"
      confirmLabel="退出全部"
      loading={busy}
      onConfirm={() => void removeAll()}
      onClose={() => setConfirmAllOpen(false)}
    />
  </Box>;
}
