import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormLabel, InputAdornment, MenuItem, Paper, Radio,
  RadioGroup, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField,
  Typography,
} from '@mui/material';
import { KeyRound, Mail, RefreshCw, Save, Search, ShieldCheck, X } from 'lucide-react';
import { fetchUsersByIds } from '../lib/api';
import { hydroAvatarUrl } from '../lib/endpoint';
import { isSuperUser, privilegeNames } from '../lib/permissions';
import { confirmSudo, formatDate, postHydroForm, submitHydroAdminForm } from '../lib/scrape';
import { useAuth } from '../auth';
import type { HydroUser } from '../types';
import ConfirmDialog from './ConfirmDialog';
import HydroAvatar from './HydroAvatar';

// ponytail: Hydro 4.14.1 has no all-users query; scan UID batches and stop after a clear gap.
// Replace this with a server-side user query if IDs ever become sparse beyond 100,000.
const scanChunkSize = 500;
const emptyChunksToStop = 2;
const maxScannedUid = 100_000;
const roleLabels: Record<string, string> = {
  default: '普通用户',
  guest: '访客',
  root: '系统管理员',
};

type PrivilegeMode = 'default' | 'banned' | 'custom';

function numericPrivilege(value: HydroUser['priv']): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isKnownUser(value: HydroUser | null | undefined): value is HydroUser {
  return Boolean(value && Number.isSafeInteger(value._id) && value._id > 0
    && value.uname && value.uname !== 'Unknown User');
}

function statusChip(user: HydroUser) {
  const priv = numericPrivilege(user.priv);
  if (priv === 0) return <Chip size="small" color="error" label="已封禁" />;
  if (priv === -1) return <Chip size="small" color="warning" label="超级管理员" />;
  if (isSuperUser(user)) return <Chip size="small" color="warning" variant="outlined" label="管理员" />;
  return <Chip size="small" color="success" variant="outlined" label="正常" />;
}

export default function AdminUsersPanel() {
  const { user: sessionUser } = useAuth();
  const [users, setUsers] = useState<HydroUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [scanned, setScanned] = useState(0);
  const [editing, setEditing] = useState<HydroUser | null>(null);
  const [privilegeMode, setPrivilegeMode] = useState<PrivilegeMode>('custom');
  const [customPrivilege, setCustomPrivilege] = useState('0');
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<HydroUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [sudoTfa, setSudoTfa] = useState('');
  const [sudoLoading, setSudoLoading] = useState(false);
  const [pendingPrivilege, setPendingPrivilege] = useState<{ user: HydroUser; value: number } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    setScanned(0);
    try {
      const found: HydroUser[] = [];
      let emptyChunks = 0;
      for (let start = 1; start <= maxScannedUid; start += scanChunkSize) {
        const length = Math.min(scanChunkSize, maxScannedUid - start + 1);
        const ids = Array.from({ length }, (_, index) => start + index);
        const batch = (await fetchUsersByIds(ids)).filter(isKnownUser);
        found.push(...batch);
        setScanned(start + length - 1);
        if (batch.length) emptyChunks = 0;
        else emptyChunks += 1;
        if (emptyChunks >= emptyChunksToStop) break;
      }
      found.sort((left, right) => left._id - right._id);
      setUsers(found);
      setPage(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '用户数据加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const defaultPrivilege = useMemo(() => {
    const counts = new Map<number, number>();
    users.forEach((user) => {
      const priv = numericPrivilege(user.priv);
      if (priv !== null && priv > 0) counts.set(priv, (counts.get(priv) ?? 0) + 1);
    });
    let common: number | null = null;
    let count = 0;
    counts.forEach((nextCount, nextValue) => {
      if (nextCount > count) {
        count = nextCount;
        common = nextValue;
      }
    });
    return common;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => {
      if (role !== 'all' && (user.role || 'default') !== role) return false;
      if (!needle) return true;
      return [String(user._id), user.uname, user.displayName, user.mail, user.role]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [role, search, users]);

  useEffect(() => { setPage(0); }, [search, role]);

  const visibleUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const effectivePrivilege = privilegeMode === 'default'
    ? defaultPrivilege
    : privilegeMode === 'banned' ? 0 : Number(customPrivilege);

  const openPrivilegeEditor = (user: HydroUser) => {
    const current = numericPrivilege(user.priv) ?? 0;
    setEditing(user);
    setCustomPrivilege(String(current));
    setPrivilegeMode(defaultPrivilege !== null && current === defaultPrivilege
      ? 'default'
      : current === 0 ? 'banned' : 'custom');
  };

  const applyPrivilege = async (user: HydroUser, value: number) => {
    const result = await submitHydroAdminForm('/manage/userpriv', 'POST', {
      uid: String(user._id),
      priv: String(value),
      system: 'false',
    });
    if (result.redirectUrl && /\/user\/sudo(?:[/?#]|$)/.test(result.redirectUrl)) {
      setPendingPrivilege({ user, value });
      setSudoOpen(true);
      setNotice('修改权限前需要重新验证管理员身份。');
      return false;
    }
    setUsers((current) => current.map((item) => item._id === user._id ? { ...item, priv: value } : item));
    setNotice(`已更新 ${user.uname} 的权限。`);
    return true;
  };

  const savePrivilege = async () => {
    if (!editing) return;
    const value = effectivePrivilege;
    if (value === -1) {
      setError('Hydro 不允许通过此接口设置超级管理员权限。');
      return;
    }
    if (value === null || !Number.isSafeInteger(value) || value < 0) {
      setError('权限值必须是大于或等于 0 的整数。');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await applyPrivilege(editing, value);
      if (saved) setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '权限修改失败。');
    } finally {
      setSaving(false);
    }
  };

  const verifySudo = async () => {
    setSudoLoading(true);
    setError('');
    try {
      await confirmSudo(sudoPassword, sudoTfa);
      setSudoOpen(false);
      setSudoPassword('');
      setSudoTfa('');
      if (pendingPrivilege) {
        await applyPrivilege(pendingPrivilege.user, pendingPrivilege.value);
        setPendingPrivilege(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '管理员身份验证失败。');
    } finally {
      setSudoLoading(false);
    }
  };

  const sendResetMail = async (user: HydroUser) => {
    if (!user.mail) {
      setError('该用户没有可用于找回密码的邮箱。');
      return;
    }
    setResetting(true);
    setError('');
    setNotice('');
    try {
      await postHydroForm('/lostpass', { mail: user.mail });
      setNotice(`重置密码邮件已发送至 ${user.mail}。`);
      setResetTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '重置密码邮件发送失败，请检查 Hydro 邮件服务配置。');
    } finally {
      setResetting(false);
    }
  };

  const editingPrivilege = editing ? numericPrivilege(editing.priv) : null;
  const editingIsSuper = editing ? editingPrivilege === -1 || isSuperUser(editing) : false;
  const editingSelf = editing?._id === sessionUser?._id;

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField
            size="small"
            label="搜索 UID、用户名、姓名、邮箱"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }}
          />
          <TextField size="small" select label="角色" value={role} onChange={(event) => setRole(event.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">全部角色</MenuItem>
            <MenuItem value="root">系统管理员</MenuItem>
            <MenuItem value="default">普通用户</MenuItem>
            <MenuItem value="guest">访客</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} disabled={loading} onClick={() => void loadUsers()}>
            刷新
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          已载入 {users.length} 个用户{loading && scanned ? `，正在扫描 UID ${scanned}` : ''}。
        </Typography>
      </Paper>

      {notice ? <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert> : null}

      {loading ? (
        <Paper variant="outlined" sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={28} />
            <Typography color="text.secondary">正在扫描并汇总用户资料…</Typography>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell>UID</TableCell>
                  <TableCell>用户</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>权限</TableCell>
                  <TableCell>注册时间</TableCell>
                  <TableCell>最近登录</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleUsers.map((user) => {
                  const priv = numericPrivilege(user.priv);
                  return (
                    <TableRow key={user._id} hover>
                      <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{user._id}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <HydroAvatar src={hydroAvatarUrl(user.avatarUrl, user._id)} name={user.displayName || user.uname} userId={user._id} size={34} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ fontWeight: 650 }}>{user.uname}</Typography>
                            <Typography noWrap variant="caption" color="text.secondary">{user.displayName || '未设置显示名'}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{user.mail || '—'}</TableCell>
                      <TableCell>{roleLabels[user.role || 'default'] || user.role || '普通用户'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          {statusChip(user)}
                          <Typography variant="caption" color="text.secondary">{priv ?? '未知'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(user.regat)}</TableCell>
                      <TableCell>{formatDate(user.loginat)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => openPrivilegeEditor(user)}>详情 / 权限</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!visibleUsers.length ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>没有匹配的用户</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="每页"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </Paper>
      )}

      <Dialog open={Boolean(editing)} onClose={() => { if (!saving) setEditing(null); }} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6 }}>
          用户详情与权限
          <Button aria-label="关闭" onClick={() => setEditing(null)} disabled={saving} sx={{ position: 'absolute', right: 10, top: 9, minWidth: 40 }}>
            <X size={19} />
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {editing ? (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <HydroAvatar src={hydroAvatarUrl(editing.avatarUrl, editing._id)} name={editing.displayName || editing.uname} userId={editing._id} size={52} />
                <Box>
                  <Typography variant="h6">{editing.uname}</Typography>
                  <Typography variant="body2" color="text.secondary">UID {editing._id}</Typography>
                </Box>
                <Box sx={{ flex: 1 }} />
                {statusChip(editing)}
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <TextField label="用户名" value={editing.uname} InputProps={{ readOnly: true }} />
                <TextField label="显示名" value={editing.displayName || ''} InputProps={{ readOnly: true }} placeholder="未设置" />
                <TextField label="邮箱" value={editing.mail || ''} InputProps={{ readOnly: true }} placeholder="未设置" />
                <TextField label="角色" value={roleLabels[editing.role || 'default'] || editing.role || '普通用户'} InputProps={{ readOnly: true }} />
                <TextField label="注册时间" value={formatDate(editing.regat)} InputProps={{ readOnly: true }} />
                <TextField label="最近登录" value={formatDate(editing.loginat)} InputProps={{ readOnly: true }} />
                <TextField label="权限值" value={editing.priv ?? ''} InputProps={{ readOnly: true }} />
                <TextField label="账号状态" value={editingPrivilege === 0 ? '已封禁' : editingPrivilege === -1 ? '超级管理员' : isSuperUser(editing) ? '管理员' : '正常'} InputProps={{ readOnly: true }} />
              </Box>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <ShieldCheck size={18} />
                  <Typography sx={{ fontWeight: 700 }}>修改系统权限</Typography>
                </Stack>
                {editingIsSuper ? <Alert severity="warning">Hydro 禁止通过此接口修改超级管理员权限。</Alert> : (
                  <>
                    <FormControl disabled={saving || editingSelf}>
                      <FormLabel>权限模式</FormLabel>
                      <RadioGroup row value={privilegeMode} onChange={(event) => setPrivilegeMode(event.target.value as PrivilegeMode)}>
                        <FormControlLabel value="default" disabled={defaultPrivilege === null} control={<Radio />} label={`默认权限${defaultPrivilege === null ? '' : `（${defaultPrivilege}）`}`} />
                        <FormControlLabel value="banned" control={<Radio color="error" />} label="封禁（0）" />
                        <FormControlLabel value="custom" control={<Radio />} label="自定义权限值" />
                      </RadioGroup>
                    </FormControl>
                    {privilegeMode === 'custom' ? (
                      <TextField
                        fullWidth
                        type="number"
                        label="权限位掩码"
                        value={customPrivilege}
                        onChange={(event) => setCustomPrivilege(event.target.value)}
                        sx={{ mt: 1.5 }}
                        inputProps={{ min: 0, step: 1 }}
                        helperText="按 Hydro 权限位相加；0 表示禁止登录。"
                      />
                    ) : null}
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                      {privilegeNames(effectivePrivilege ?? undefined).map((name) => <Chip key={name} size="small" variant="outlined" label={name} />)}
                    </Stack>
                    {editingSelf ? <Alert severity="info" sx={{ mt: 1.5 }}>不能在这里修改自己的权限，避免意外锁定管理账号。</Alert> : null}
                  </>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <KeyRound size={18} />
                  <Typography sx={{ fontWeight: 700 }}>密码</Typography>
                </Stack>
                <Alert severity="info" icon={<Mail size={18} />}>
                  Hydro 4.14.1 不提供管理员直接设置其他用户密码的接口。可发送官方重置邮件，由用户通过邮箱安全设置新密码。
                </Alert>
                <Button
                  variant="outlined"
                  startIcon={<Mail size={16} />}
                  disabled={!editing.mail || resetting}
                  onClick={() => setResetTarget(editing)}
                  sx={{ mt: 1.5 }}
                >
                  发送重置密码邮件
                </Button>
              </Paper>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setEditing(null)} disabled={saving}>关闭</Button>
          {editing && !editingIsSuper && !editingSelf ? (
            <Button variant="contained" startIcon={<Save size={16} />} onClick={() => void savePrivilege()} disabled={saving || effectivePrivilege === null}>
              {saving ? '保存中…' : '保存权限'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={sudoOpen} onClose={() => { if (!sudoLoading) setSudoOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle>验证管理员身份</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField autoFocus type="password" label="管理员密码" value={sudoPassword} onChange={(event) => setSudoPassword(event.target.value)} autoComplete="current-password" />
            <TextField label="两步验证码（可选）" value={sudoTfa} onChange={(event) => setSudoTfa(event.target.value)} inputMode="numeric" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSudoOpen(false)} disabled={sudoLoading}>取消</Button>
          <Button variant="contained" onClick={() => void verifySudo()} disabled={sudoLoading || (!sudoPassword && !sudoTfa)}>
            {sudoLoading ? '验证中…' : '验证并继续'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        title="发送重置密码邮件"
        content={resetTarget ? `将向 ${resetTarget.mail || '用户邮箱'} 发送 Hydro 官方密码重置链接，是否继续？` : ''}
        confirmLabel="发送"
        destructive={false}
        loading={resetting}
        onClose={() => setResetTarget(null)}
        onConfirm={() => { if (resetTarget) void sendResetMail(resetTarget); }}
      />
    </Box>
  );
}
