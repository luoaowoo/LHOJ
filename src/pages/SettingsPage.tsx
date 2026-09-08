import { Box, Divider, Paper, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { Database, Moon, Palette, Sun } from 'lucide-react';
import { usePreferences } from '../prefs';
import type { EndpointMode } from '../lib/endpoint';
import type { ThemeMode } from '../types';

const accents = [
  { name: '蓝', value: '#2563eb' },
  { name: '青', value: '#0e7490' },
  { name: '紫', value: '#6d28d9' },
  { name: '绿', value: '#15803d' },
  { name: '玫红', value: '#be185d' },
  { name: '橙', value: '#c2410c' },
];

export default function SettingsPage() {
  const { mode, accent, endpoint, setMode, setAccent, setEndpoint } = usePreferences();

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography variant="h5" sx={{ fontWeight: 750 }}>
        设置
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        外观偏好会保存在当前浏览器中。
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              {mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <Typography sx={{ fontWeight: 650 }}>外观模式</Typography>
            </Stack>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              aria-label="外观模式"
              onChange={(_event, nextMode) => {
                if (nextMode) setMode(nextMode as ThemeMode);
              }}
            >
              <ToggleButton value="light" aria-label="亮色模式">
                <Sun size={17} />
                <Box component="span" sx={{ ml: 1 }}>亮色</Box>
              </ToggleButton>
              <ToggleButton value="dark" aria-label="暗色模式">
                <Moon size={17} />
                <Box component="span" sx={{ ml: 1 }}>暗色</Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Palette size={18} />
              <Typography sx={{ fontWeight: 650 }}>主题色</Typography>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {accents.map((item) => (
                <Tooltip key={item.value} title={item.name}>
                  <Box
                    component="button"
                    type="button"
                    aria-label={`选择主题色 ${item.name}`}
                    onClick={() => setAccent(item.value)}
                    sx={{
                      width: 44,
                      height: 44,
                      p: 0,
                      cursor: 'pointer',
                      borderRadius: '50%',
                      border: '3px solid',
                      borderColor: accent === item.value ? 'text.primary' : 'transparent',
                      background: item.value,
                      outline: 'none',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>

          <Divider />

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Database size={18} />
              <Typography sx={{ fontWeight: 650 }}>数据来源</Typography>
            </Stack>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={endpoint}
              aria-label="数据来源"
              onChange={(_event, nextEndpoint) => {
                if (nextEndpoint) setEndpoint(nextEndpoint as EndpointMode);
              }}
            >
              <ToggleButton value="auto" aria-label="自动备用">自动备用</ToggleButton>
              <ToggleButton value="primary" aria-label="默认源站">默认源站</ToggleButton>
              <ToggleButton value="fallback" aria-label="IP 源站">IP 源站</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              默认源站不可用时自动切换到 64.90.0.223:801。本地开发会经同源代理保持登录会话。
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
