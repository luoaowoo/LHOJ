import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { ImagePlus, Save, Settings2, Upload, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { postHydroForm, scrapeAccountSettings } from '../lib/scrape';
import type { HydroSetting } from '../types';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { useAuth } from '../auth';
import HydroAvatar from '../components/HydroAvatar';
import { hydroAvatarUrl, invalidateAvatarCache } from '../lib/endpoint';

const categories = new Set(['preference', 'account', 'domain']);
const avatarSources = [
  { value: 'url', label: '网络头像' },
  { value: 'gravatar', label: 'Gravatar' },
  { value: 'qq', label: 'QQ 头像' },
  { value: 'github', label: 'GitHub 头像' },
  { value: 'upload', label: '本地上传' },
] as const;

function booleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function settingMatches(item: HydroSetting, value: string | boolean): boolean {
  if (item.type === 'boolean') return booleanValue(item.currentValue);
  return String(item.currentValue ?? '') === String(value);
}

export default function AccountSettingsPage() {
  const { user, refresh } = useAuth();
  const { category = 'account' } = useParams();
  const validCategory = categories.has(category)
    ? category as 'preference' | 'account' | 'domain'
    : 'account';
  const [settings, setSettings] = useState<HydroSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarSource, setAvatarSource] = useState<(typeof avatarSources)[number]['value']>('url');
  const [avatarInput, setAvatarInput] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setSettings(null);
    setError('');
    try {
      const items = await scrapeAccountSettings(validCategory);
      const visible = items.filter((item) => !item.hidden);
      setSettings(visible);
      setValues(Object.fromEntries(visible.map((item) => [
        item.key,
        item.type === 'boolean'
          ? booleanValue(item.currentValue ?? item.value)
          : String(item.currentValue ?? item.value ?? ''),
      ])));
      return visible;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '设置加载失败。');
      return null;
    }
  }, [validCategory]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map<string, HydroSetting[]>();
    settings?.forEach((item) => {
      if (validCategory === 'account' && item.key === 'avatar') return;
      grouped.set(item.family, [...(grouped.get(item.family) ?? []), item]);
    });
    return [...grouped.entries()];
  }, [settings, validCategory]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const fields = new FormData();
      fields.append('category', validCategory);
      Object.entries(values).forEach(([key, value]) => {
        const item = settings.find((candidate) => candidate.key === key);
        if (!item || item.disabled) return;
        if (typeof value === 'boolean') {
          if (value) fields.append(key, 'on');
          fields.append(`booleanKeys.${key}`, 'on');
        } else if (value || !settings.find((item) => item.key === key)?.secret) {
          fields.append(key, value);
        }
      });
      await postHydroForm(`/home/settings/${validCategory}`, fields);
      const refreshed = await load(false);
      const failed = refreshed?.find((item) => {
        const value = values[item.key];
        return !item.disabled && !item.secret && value !== undefined && !settingMatches(item, value);
      });
      if (failed) throw new Error(`“${failed.name}”没有成功保存，请稍后重试。`);
      setSaved(Boolean(refreshed));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '设置保存失败。');
    } finally {
      setSaving(false);
    }
  };

  const openAvatar = () => {
    const current = String(settings?.find((item) => item.key === 'avatar')?.currentValue ?? user?.avatarUrl ?? '');
    const match = current.match(/^(?:url:)?(https?:\/\/|\/)/i) ? 'url' : current.startsWith('gravatar:') ? 'gravatar' : current.startsWith('qq:') ? 'qq' : current.startsWith('github:') ? 'github' : 'url';
    setAvatarSource(match);
    setAvatarInput(current.replace(/^(?:gravatar:|qq:|github:|url:)/i, ''));
    setAvatarFile(null);
    setAvatarOpen(true);
  };

  const saveAvatar = async () => {
    if (avatarSource === 'upload' && !avatarFile) return;
    if (avatarSource !== 'upload' && !avatarInput.trim()) return;
    setSaving(true);
    setError('');
    try {
      const fields = new FormData();
      if (avatarSource === 'upload') {
        if (!avatarFile || !['image/jpeg', 'image/png'].includes(avatarFile.type) || avatarFile.size > 8 * 1024 * 1024) throw new Error('请选择不超过 8MB 的 JPG 或 PNG 图片。');
        fields.append('file', avatarFile, avatarFile.name);
      } else {
        if (avatarSource === 'url' && !/^https?:\/\//i.test(avatarInput.trim())) throw new Error('请输入完整的 HTTP(S) 图片地址。');
        fields.append('avatar', `${avatarSource}:${avatarInput.trim()}`);
      }
      await postHydroForm('/home/avatar', fields, { enctype: 'multipart/form-data' });
      invalidateAvatarCache();
      await refresh();
      await load(false);
      setAvatarOpen(false);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '头像保存失败。');
    } finally {
      setSaving(false);
    }
  };

  if (!settings && !error) return <FullPageLoader />;
  if (!settings) return <ErrorBox message={error} />;
  const title = validCategory === 'preference' ? '偏好设置' : validCategory === 'domain' ? '域设置' : '账户设置';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        icon={<Settings2 size={20} />}
        title={title}
        subtitle="修改账号资料和 Hydro 提供的扩展设置。保存后会立即同步到源站。"
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {saved ? <Alert severity="success" sx={{ mb: 2 }}>设置已保存。</Alert> : null}
      {validCategory === 'account' && user ? (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <HydroAvatar src={hydroAvatarUrl(user.avatarUrl, user._id)} name={user.uname} userId={user._id} size={64} />
              <Box><Typography sx={{ fontWeight: 650 }}>头像</Typography><Typography variant="body2" color="text.secondary">支持网络图片、Gravatar、QQ、GitHub 或本地图片。</Typography></Box>
            </Stack>
            <Button variant="outlined" startIcon={<ImagePlus size={17} />} onClick={openAvatar}>修改头像</Button>
          </Stack>
        </Paper>
      ) : null}
      {!groups.length ? <Paper variant="outlined"><EmptyBox message="当前分类没有可编辑的设置" /></Paper> : (
        <Box component="form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <Stack spacing={2}>
            {groups.map(([family, items]) => (
              <Paper key={family} variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Typography sx={{ fontWeight: 650, mb: 2 }}>{family}</Typography>
                <Stack spacing={2.3}>
                  {items.map((item) => {
                    const value = values[item.key];
                    if (item.type === 'boolean') {
                      return <FormControlLabel key={item.key} control={<Checkbox checked={value === true} disabled={item.disabled} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.checked }))} />} label={<Box><Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>{item.description ? <Typography variant="body2" color="text.secondary">{item.description}</Typography> : null}</Box>} />;
                    }
                    const common = { label: item.name, value: value ?? '', disabled: item.disabled, helperText: item.description, fullWidth: true };
                    if (item.type === 'select' && item.range) {
                      const entries = Array.isArray(item.range) ? item.range : Object.entries(item.range);
                      return <TextField key={item.key} {...common} select onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))}>{entries.map(([option, label]) => <MenuItem key={option} value={option}>{label}</MenuItem>)}</TextField>;
                    }
                    const multiline = ['textarea', 'markdown', 'yaml'].includes(item.type);
                    return <TextField key={item.key} {...common} type={item.secret || item.type === 'password' ? 'password' : item.type === 'number' || item.type === 'float' ? 'number' : 'text'} multiline={multiline} minRows={multiline ? 4 : undefined} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))} />;
                  })}
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Button type="submit" variant="contained" startIcon={<Save size={17} />} disabled={saving} sx={{ mt: 2.5 }}>
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </Box>
      )}
      <Dialog open={avatarOpen} onClose={() => !saving && setAvatarOpen(false)} fullWidth maxWidth="sm" aria-labelledby="avatar-dialog-title">
        <DialogTitle id="avatar-dialog-title" sx={{ pr: 6 }}>修改头像<IconButton aria-label="关闭" onClick={() => setAvatarOpen(false)} disabled={saving} sx={{ position: 'absolute', right: 12, top: 10 }}><X size={19} /></IconButton></DialogTitle>
        <DialogContent dividers><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select label="头像来源" value={avatarSource} onChange={(event) => { setAvatarSource(event.target.value as typeof avatarSource); setAvatarFile(null); }}>
            {avatarSources.map((source) => <MenuItem key={source.value} value={source.value}>{source.label}</MenuItem>)}
          </TextField>
          {avatarSource === 'upload' ? (
            <Button component="label" variant="outlined" startIcon={<Upload size={17} />}>选择图片<input hidden type="file" accept="image/jpeg,image/png" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} /></Button>
          ) : <TextField label={avatarSource === 'url' ? '图片地址' : avatarSource === 'gravatar' ? '邮箱地址' : `${avatarSource === 'qq' ? 'QQ' : 'GitHub'} 用户名`} value={avatarInput} onChange={(event) => setAvatarInput(event.target.value)} placeholder={avatarSource === 'url' ? 'https://...' : '请输入'} fullWidth autoFocus />}
          {avatarFile ? <Typography variant="body2" color="text.secondary">已选择：{avatarFile.name}</Typography> : null}
          <Typography variant="caption" color="text.secondary">本地图片支持 JPG、PNG，大小不超过 8MB。</Typography>
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setAvatarOpen(false)} disabled={saving}>取消</Button><Button variant="contained" onClick={() => void saveAvatar()} disabled={saving || (avatarSource === 'upload' ? !avatarFile : !avatarInput.trim())}>{saving ? '保存中...' : '确认'}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
