import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Divider, FormControlLabel,
  IconButton, Link, MenuItem, Paper, Radio,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from '@mui/material';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { scrapeAdminPage, submitHydroAdminForm } from '../lib/scrape';
import type {
  HydroAdminAction, HydroAdminField, HydroAdminForm, HydroAdminPage,
  HydroAdminSubmit,
} from '../lib/scrape';
import { ErrorBox, FullPageLoader } from './StateBox';

type Option = { value: string; label: string; selected?: boolean };
type Field = HydroAdminField & {
  id?: string; required?: boolean; placeholder?: string; helpText?: string;
  accept?: string; multiple?: boolean; options?: Option[];
};
type Form = HydroAdminForm & {
  method?: string; enctype?: string; fields: Field[];
  submits?: Array<{ name?: string; value?: string; label: string }>;
};
type Page = Omit<HydroAdminPage, 'forms'> & { forms: Form[] };

function formData(form: Form, values: Record<string, string | boolean | File[]>, submit?: HydroAdminSubmit) {
  const data = new FormData();
  form.fields.forEach((field, index) => {
    const value = values[field.id ?? `${field.name}:${index}`];
    if (field.disabled || !field.name) return;
    if ((field.type === 'checkbox' || field.type === 'radio') && value !== true) return;
    if (field.type === 'file') {
      (Array.isArray(value) ? value : []).forEach((file) => data.append(field.name, file));
    } else data.append(field.name, value === true ? (field.value || 'on') : String(value ?? ''));
  });
  if (submit?.name) data.append(submit.name, submit.value ?? '');
  return data;
}

async function submitForm(form: Form, values: Record<string, string | boolean | File[]>, submit?: HydroAdminSubmit) {
  const data = formData(form, values, submit);
  const action = submit?.action || form.action;
  return submitHydroAdminForm(action, form.method ?? 'POST', data);
}

function fieldKey(form: Form, field: Field, index: number) { return field.id ?? `${form.action}:${index}`; }

export default function HydroAdminWorkspace({ path, title }: { path: string; title: string }) {
  const [currentPath, setCurrentPath] = useState(path);
  const [page, setPage] = useState<Page | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean | File[]>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async (target = currentPath) => {
    setLoading(true); setError(''); setNotice('');
    try {
      const next = await scrapeAdminPage(target);
      setPage(next as Page);
      const initial: Record<string, string | boolean | File[]> = {};
      next.forms.forEach((form) => form.fields.forEach((field, index) => {
        initial[fieldKey(form, field, index)] = field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value;
      }));
      setValues(initial);
    } catch (cause) { setPage(null); setError(cause instanceof Error ? cause.message : '管理页面加载失败。'); }
    finally { setLoading(false); }
  }, [currentPath]);

  useEffect(() => { setCurrentPath(path); setHistory([]); }, [path]);
  useEffect(() => { void load(); }, [load]);

  const navigate = (href?: string) => {
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      setHistory((old) => [...old, currentPath]);
      setCurrentPath(`${url.pathname}${url.search}`);
    }
    catch { /* Ignore malformed links from upstream HTML. */ }
  };
  const update = (key: string, value: string | boolean | File[]) => setValues((old) => ({ ...old, [key]: value }));
  const goBack = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((old) => old.slice(0, -1));
    setCurrentPath(previous);
  };
  const save = async (form: Form, submit?: HydroAdminSubmit) => {
    setSaving(true); setError(''); setNotice('');
    try {
      if ((form.method ?? 'POST').toUpperCase() === 'GET') {
        const params = new URLSearchParams();
        formData(form, values, submit).forEach((value, key) => params.append(key, typeof value === 'string' ? value : value.name));
        const action = submit?.action || form.action;
        navigate(`${action}${action.includes('?') ? '&' : '?'}${params}`);
      } else {
        await submitForm(form, values, submit);
        await load();
        setNotice('操作已完成。');
      }
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败。'); }
    finally { setSaving(false); }
  };

  if (loading && !page) return <FullPageLoader />;
  if (!page) return <ErrorBox message={error} onRetry={() => void load()} />;
  return <Box component="section" aria-label={page.title || title}>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
        {history.length > 0 && <Tooltip title="返回"><IconButton size="small" onClick={goBack}><ArrowLeft size={18} /></IconButton></Tooltip>}
        <Box minWidth={0}><Typography variant="h6" fontWeight={700} noWrap>{page.title || title}</Typography><Typography variant="caption" color="text.secondary" noWrap>{currentPath}</Typography></Box>
      </Stack>
      <Tooltip title="刷新"><IconButton onClick={() => void load()} disabled={loading}><RefreshCw size={18} /></IconButton></Tooltip>
    </Stack>
    {loading && <Alert severity="info" sx={{ mb: 2 }}>正在刷新...</Alert>}
    {page.actions.length ? <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>{page.actions.map((action: HydroAdminAction) => <Button key={action.label} size="small" variant="outlined" disabled={saving} onClick={() => void (async () => {
      setSaving(true); setError(''); setNotice('');
      try {
        const data = new FormData();
        action.fields.forEach((field) => data.append(field.name, field.value));
        await submitHydroAdminForm(action.action || currentPath, 'POST', data);
        await load();
        setNotice('操作已完成。');
      } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败。'); }
      finally { setSaving(false); }
    })()}>{action.label}</Button>)}</Stack> : null}
    {page.tables?.map((table, tableIndex) => <Paper key={`table-${tableIndex}`} variant="outlined" sx={{ mb: 2, overflow: 'auto' }}><Typography fontWeight={650} sx={{ p: 2 }}>{table.title || '数据列表'}</Typography><Divider /><Table size="small"><TableHead><TableRow>{table.headers.map((header) => <TableCell key={header}>{header}</TableCell>)}</TableRow></TableHead><TableBody>{table.rows.map((row, rowIndex) => <TableRow key={rowIndex}>{row.cells.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell.href ? <Link component="button" onClick={() => navigate(cell.href)} underline="hover">{cell.text || '打开'}</Link> : cell.text}</TableCell>)}</TableRow>)}</TableBody></Table></Paper>)}
    {!page.forms.length && !page.tables?.length ? <Paper variant="outlined" sx={{ p: 3 }}><Typography color="text.secondary">该管理页暂无可操作内容。</Typography></Paper> : null}
    <Stack spacing={2}>{page.forms.map((form, formIndex) => <Paper key={`${form.action}-${formIndex}`} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography fontWeight={650} sx={{ mb: 1.5 }}>{form.title || '设置表单'}</Typography><Divider sx={{ mb: 2 }} />
      <Stack spacing={2}>{form.fields.map((field, index) => {
        const key = fieldKey(form, field, index); const value = values[key];
        if (field.type === 'hidden') return null;
        if (field.type === 'file') {
          const files = Array.isArray(value) ? value : [];
          return <Stack key={key} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1}>
            <Button component="label" variant="outlined">选择文件<input hidden type="file" accept={(field as Field).accept} multiple={(field as Field).multiple} required={field.required} disabled={field.disabled} onChange={(event) => update(key, Array.from(event.target.files ?? []))} /></Button>
            <Typography variant="body2" color="text.secondary">{files.length ? files.map((file) => file.name).join('、') : field.helpText || '未选择文件'}</Typography>
          </Stack>;
        }
        if (field.type === 'checkbox') return <FormControlLabel key={key} control={<Checkbox checked={value === true} disabled={field.disabled} onChange={(event) => update(key, event.target.checked)} />} label={field.label} />;
        if (field.type === 'radio') return <FormControlLabel key={key} control={<Radio checked={value === true} required={field.required} disabled={field.disabled} onChange={() => form.fields.forEach((candidate, candidateIndex) => { if (candidate.name === field.name) update(fieldKey(form, candidate, candidateIndex), candidate === field); })} />} label={field.label} />;
        if (field.type === 'select') return <TextField key={key} select fullWidth required={field.required} disabled={field.disabled} label={field.label} helperText={field.helpText} value={value ?? ''} onChange={(event) => update(key, event.target.value)}>{field.options?.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>;
        const inputType = ['password', 'number', 'date', 'time', 'datetime-local', 'email', 'url', 'tel', 'search', 'month', 'week', 'color', 'range'].includes(field.type) ? field.type : 'text';
        return <TextField key={key} fullWidth required={field.required} disabled={field.disabled} label={field.label} placeholder={field.placeholder} helperText={field.helpText} value={value ?? ''} type={inputType} multiline={field.type === 'textarea'} minRows={field.type === 'textarea' ? 4 : undefined} onChange={(event) => update(key, event.target.value)} />;
      })}</Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
        {(form.submits?.length ? form.submits : [{ label: '保存' }]).map((submit, index) => <Button key={`${submit.label}-${index}`} variant={index === 0 ? 'contained' : 'outlined'} size="small" startIcon={index === 0 ? <Save size={16} /> : undefined} disabled={saving} onClick={() => void save(form, submit)}>{saving ? '处理中...' : submit.label}</Button>)}
      </Stack>
    </Paper>)}</Stack>
  </Box>;
}
