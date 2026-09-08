import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowLeft, FileUp, ShieldAlert } from 'lucide-react';
import { submitHack } from '../lib/api';

export default function HackPage() {
  const { pid = '', rid = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if ((!input.trim() && !file) || submitting) return;
    if (file && file.size > 2 * 1024 * 1024) {
      setError('Hack 数据文件不能超过 2 MiB。');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await submitHack(pid, rid, input, file ?? undefined, searchParams.get('tid') ?? undefined);
      if (!result.rid) throw new Error('Hydro 未返回评测编号。');
      navigate(`/records/${encodeURIComponent(result.rid)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hack 提交失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto' }}>
      <Button component={RouterLink} to={`/records/${encodeURIComponent(rid)}`} color="inherit" size="small" startIcon={<ArrowLeft size={16} />} sx={{ mb: 2 }}>返回评测</Button>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><ShieldAlert size={21} />Hack 提交</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, mb: 2 }}>目标记录 {rid}。可直接输入反例，或上传不超过 2 MiB 的输入文件。</Typography>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert> : null}
        <TextField fullWidth multiline minRows={10} label="Hack 输入数据" value={input} disabled={Boolean(file)} onChange={(event) => setInput(event.target.value)} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
          <Button component="label" variant="outlined" startIcon={<FileUp size={16} />} disabled={submitting}>选择文件<input hidden type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Button>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{file?.name || '未选择文件'}</Typography>
          {file ? <Button color="inherit" onClick={() => setFile(null)} disabled={submitting}>清除</Button> : null}
          <Button variant="contained" color="error" onClick={() => void submit()} disabled={submitting || (!input.trim() && !file)}>{submitting ? '提交中' : '提交 Hack'}</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
