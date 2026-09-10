import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel, IconButton, InputAdornment,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material';
import { ExternalLink, Eye, EyeOff, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth';
import { LoginShell } from '../components/AppLayout';
import { hydroPublicUrl } from '../lib/endpoint';

export default function LoginPage() {
  const { user, loading, error: connectionError, login, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const requestedDestination = (location.state as { from?: unknown } | null)?.from;
  const destination = typeof requestedDestination === 'string' && requestedDestination.startsWith('/') && !requestedDestination.startsWith('//')
    ? requestedDestination
    : '/problems';

  if (loading) {
    return (
      <LoginShell>
        <CircularProgress size={30} aria-label="正在检查登录状态" />
      </LoginShell>
    );
  }

  if (user) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const uname = String(form.get('uname') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const tfa = String(form.get('tfa') ?? '').trim();
    const remember = form.get('remember') === 'on';

    if (!uname || !password) {
      setError('请输入用户名和密码。');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(uname, password, remember, tfa);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试。');
      setSubmitting(false);
    }
  }

  return (
    <LoginShell>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        noValidate
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25 }}>
          <Box component="img" src="/校徽.png" alt="LH-oj" sx={{ width: 42, height: 42, borderRadius: 2, objectFit: 'cover' }} />
          <Box>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
              LH-oj
            </Typography>
            <Typography variant="caption" color="text.secondary">
              成就龙中学子信竞梦
            </Typography>
          </Box>
        </Box>

        {connectionError ? (
          <Alert
            severity="warning"
            variant="outlined"
            action={(
              <Button color="inherit" size="small" startIcon={<RefreshCw size={15} />} onClick={() => void refresh()}>
                重试
              </Button>
            )}
          >
            {connectionError}
          </Alert>
        ) : null}

        {error && (
          <Typography color="error" variant="body2" role="alert">
            {error}
          </Typography>
        )}

        <TextField
          name="uname"
          label="用户名"
          autoComplete="username"
          autoFocus
          fullWidth
          required
        />
        <TextField name="tfa" label="两步验证码（如已启用）" inputMode="numeric" autoComplete="one-time-code" fullWidth />
        <TextField
          name="password"
          label="密码"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          fullWidth
          required
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPassword ? '隐藏密码' : '显示密码'}>
                    <IconButton edge="end" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel control={<Checkbox name="remember" />} label="记住我" />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          aria-busy={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LogIn size={18} />}
        >
          {submitting ? '登录中...' : '登录'}
        </Button>
        <Divider sx={{ color: 'text.secondary', fontSize: 13 }}>账户帮助</Divider>
        <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          <Button component="a" href={hydroPublicUrl('/register')} target="_blank" rel="noreferrer" size="small" endIcon={<ExternalLink size={14} />}>注册账号</Button>
          <Button
            component="a"
            href={hydroPublicUrl('/lostpass')}
            target="_blank"
            rel="noreferrer"
            size="small"
            endIcon={<ExternalLink size={14} />}
          >
            找回密码
          </Button>
          <Button component="a" href={hydroPublicUrl('/login')} target="_blank" rel="noreferrer" size="small" endIcon={<ExternalLink size={14} />}>其他登录方式</Button>
        </Box>
      </Paper>
    </LoginShell>
  );
}
