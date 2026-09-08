import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { postHydroForm, scrapeAccountSettings } from '../lib/scrape';
import type { HydroSetting } from '../types';
import { ErrorBox, FullPageLoader } from '../components/StateBox';

const categories = new Set(['preference', 'account', 'domain']);
export default function AccountSettingsPage() {
  const { category = 'account' } = useParams();
  const validCategory = categories.has(category) ? category as 'preference' | 'account' | 'domain' : 'account';
  const [settings, setSettings] = useState<HydroSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; setSettings(null); setError(''); void scrapeAccountSettings(validCategory).then((items) => { if (!active) return; setSettings(items.filter((item) => !item.hidden)); setValues(Object.fromEntries(items.filter((item) => !item.hidden).map((item) => [item.key, typeof item.currentValue === 'boolean' ? item.currentValue : String(item.currentValue ?? item.value ?? '')]))); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '设置加载失败。'); }); return () => { active = false; }; }, [validCategory]);
  const save = async () => { if (!settings) return; setSaving(true); setSaved(false); setError(''); try { const fields: Record<string, string> = {}; Object.entries(values).forEach(([key, value]) => { if (typeof value === 'boolean') { if (value) fields[key] = 'on'; fields[`booleanKeys.${key}`] = 'on'; } else if (value || !settings.find((item) => item.key === key)?.secret) fields[key] = value; }); fields.category = validCategory; await postHydroForm(`/home/settings/${validCategory}`, fields); setSaved(true); } catch (cause) { setError(cause instanceof Error ? cause.message : '设置保存失败。'); } finally { setSaving(false); } };
  if (!settings && !error) return <FullPageLoader />;
  if (!settings) return <ErrorBox message={error} />;
  return <Box sx={{ maxWidth: 760 }}><Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{validCategory === 'preference' ? '偏好设置' : validCategory === 'domain' ? '域设置' : '账户设置'}</Typography>{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}{saved ? <Alert severity="success" sx={{ mb: 2 }}>设置已保存。</Alert> : null}<Paper component="form" variant="outlined" sx={{ p: { xs: 2, md: 3 } }} onSubmit={(event) => { event.preventDefault(); void save(); }}><Stack spacing={2.2}>{settings.map((item) => { const value = values[item.key]; if (item.type === 'boolean') return <FormControlLabel key={item.key} control={<Checkbox checked={value === true} disabled={item.disabled} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.checked }))} />} label={<Box><Typography>{item.name}</Typography>{item.description ? <Typography variant="caption" color="text.secondary">{item.description}</Typography> : null}</Box>} />; if (item.type === 'select' && item.range) { const entries = Array.isArray(item.range) ? item.range : Object.entries(item.range); return <TextField key={item.key} select label={item.name} value={value ?? ''} disabled={item.disabled} helperText={item.description} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))}>{entries.map(([option, label]) => <MenuItem key={option} value={option}>{label}</MenuItem>)}</TextField>; } const multiline = item.type === 'textarea' || item.type === 'markdown' || item.type === 'yaml'; return <TextField key={item.key} label={item.name} type={item.secret || item.type === 'password' ? 'password' : item.type === 'number' || item.type === 'float' ? 'number' : 'text'} multiline={multiline} minRows={multiline ? 4 : undefined} value={value ?? ''} disabled={item.disabled} helperText={item.description} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))} />; })}</Stack><Button type="submit" variant="contained" startIcon={<Save size={16} />} disabled={saving} sx={{ mt: 3 }}>保存设置</Button></Paper></Box>;
}
