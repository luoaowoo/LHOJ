import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, MenuItem,
  Paper, Stack, TextField, Typography,
} from '@mui/material';
import { Save, Settings2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { postHydroForm, scrapeAccountSettings } from '../lib/scrape';
import type { HydroSetting } from '../types';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';

const categories = new Set(['preference', 'account', 'domain']);

function booleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function settingMatches(item: HydroSetting, value: string | boolean): boolean {
  if (item.type === 'boolean') return booleanValue(item.currentValue);
  return String(item.currentValue ?? '') === String(value);
}

export default function AccountSettingsPage() {
  const { category = 'account' } = useParams();
  const validCategory = categories.has(category)
    ? category as 'preference' | 'account' | 'domain'
    : 'account';
  const [settings, setSettings] = useState<HydroSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
    settings?.forEach((item) => grouped.set(item.family, [...(grouped.get(item.family) ?? []), item]));
    return [...grouped.entries()];
  }, [settings]);

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
    </Box>
  );
}
