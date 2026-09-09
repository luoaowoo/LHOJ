import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { RefreshCw, Save } from 'lucide-react';
import { postHydroForm, scrapeAdminForms } from '../lib/scrape';
import type { HydroAdminField, HydroAdminForm } from '../lib/scrape';
import { ErrorBox, FullPageLoader } from './StateBox';

function fieldValue(field: HydroAdminField): string | boolean { return field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value; }

export default function HydroAdminWorkspace({ path, title }: { path: string; title: string }) {
  const [forms, setForms] = useState<HydroAdminForm[] | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setForms(null); setError(''); setSaved(false);
    void scrapeAdminForms(path).then((items) => {
      setForms(items);
      setValues(Object.fromEntries(items.flatMap((form) => form.fields.map((field) => [`${form.action}:${field.name}`, fieldValue(field)]))));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : '管理页面加载失败。'));
  };
  useEffect(load, [path]);

  const save = async (form: HydroAdminForm) => {
    setSaving(true); setSaved(false); setError('');
    try {
      const fields: Record<string, string> = {};
      form.fields.forEach((field) => {
        const value = values[`${form.action}:${field.name}`];
        if (field.type === 'checkbox' || field.type === 'radio') { if (value === true) fields[field.name] = field.value || 'on'; }
        else fields[field.name] = String(value ?? '');
      });
      await postHydroForm(form.action, fields); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '设置保存失败。'); }
    finally { setSaving(false); }
  };

  if (!forms && !error) return <FullPageLoader />;
  if (!forms) return <ErrorBox message={error} onRetry={load} />;
  return <Box>
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    {saved ? <Alert severity="success" sx={{ mb: 2 }}>设置已保存。</Alert> : null}
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Button size="small" startIcon={<RefreshCw size={16} />} onClick={load}>刷新</Button>
    </Stack>
    {!forms.length ? <Paper variant="outlined" sx={{ p: 3 }}><Typography color="text.secondary">该管理页没有可编辑表单。</Typography></Paper> : <Stack spacing={2}>
      {forms.map((form) => <Paper key={form.action + form.title} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography sx={{ fontWeight: 650, mb: 1.5 }}>{form.title}</Typography><Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          {form.fields.map((field) => {
            const key = `${form.action}:${field.name}`; const value = values[key];
            if (field.type === 'checkbox' || field.type === 'radio') return <FormControlLabel key={key} control={<Checkbox checked={value === true} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))} />} label={field.label} />;
            if (field.type === 'select') return <TextField key={key} select fullWidth label={field.label} value={value ?? ''} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}>{field.options?.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>;
            return <TextField key={key} fullWidth label={field.label} value={value ?? ''} type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'} multiline={field.type === 'textarea'} minRows={field.type === 'textarea' ? 4 : undefined} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />;
          })}
        </Stack>
        <Button variant="contained" size="small" startIcon={<Save size={16} />} disabled={saving} onClick={() => void save(form)} sx={{ mt: 2 }}>{saving ? '保存中...' : '保存'}</Button>
      </Paper>)}
    </Stack>}
  </Box>;
}
