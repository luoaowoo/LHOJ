import {
  Box, Button, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Database, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { usePreferences } from '../prefs';
import type { CodeTheme, UsernameColoring } from '../prefs';
import { accents } from '../lib/accents';
import PageHeader from '../components/PageHeader';
import ColorWheel from '../components/ColorWheel';
import type { EndpointMode } from '../lib/endpoint';
import type { ThemeMode } from '../types';

export default function SettingsPage() {
  const {
    mode, accent, endpoint, codeTheme, usernameColoring, trainingNodesCollapsed,
    setMode, setAccent, setEndpoint, setCodeTheme, setUsernameColoring, setTrainingNodesCollapsed,
    customBgColor, setCustomBgColor, confettiEmojis, setConfettiEmojis,
  } = usePreferences();

  return (
    <Box sx={{ maxWidth: 900 }}>
      <PageHeader icon={<Palette size={20} />} title="UI 设置" subtitle="外观偏好与个性化会保存在当前浏览器中。" />

      <Stack spacing={2.5}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontWeight: 650, mb: 2 }}>风格设置</Typography>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                {mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>颜色主题</Typography>
              </Stack>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={mode}
                aria-label="颜色主题"
                onChange={(_event, next) => { if (next) setMode(next as ThemeMode); }}
              >
                <ToggleButton value="light" aria-label="亮色模式">亮色</ToggleButton>
                <ToggleButton value="dark" aria-label="暗色模式">暗色</ToggleButton>
                <ToggleButton value="system" aria-label="跟随系统">跟随系统</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Palette size={18} />
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>主题色</Typography>
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
                        width: 40, height: 40, p: 0, cursor: 'pointer', borderRadius: '50%',
                        border: '3px solid', borderColor: accent === item.value ? 'text.primary' : 'transparent',
                        background: item.value, outline: 'none',
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <TextField
                fullWidth
                size="small"
                label="AC 庆祝彩纸"
                placeholder="例如：🎉🎊✨"
                value={confettiEmojis}
                inputProps={{ maxLength: 6, 'aria-label': 'AC 庆祝彩纸' }}
                helperText="最多 3 个 emoji，留空使用默认彩纸礼炮"
                onChange={(event) => setConfettiEmojis(event.target.value)}
              />
              <FormControl fullWidth size="small">
                <InputLabel id="code-theme-label">代码主题</InputLabel>
                <Select
                  labelId="code-theme-label"
                  label="代码主题"
                  value={codeTheme}
                  onChange={(event) => setCodeTheme(event.target.value as CodeTheme)}
                >
                  <MenuItem value="auto">跟随外观</MenuItem>
                  <MenuItem value="vs">Light</MenuItem>
                  <MenuItem value="vs-dark">Dark</MenuItem>
                  <MenuItem value="hc-black">High Contrast Black</MenuItem>
                  <MenuItem value="hc-light">High Contrast Light</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="username-color-label">名称颜色系统</InputLabel>
                <Select
                  labelId="username-color-label"
                  label="名称颜色系统"
                  value={usernameColoring}
                  onChange={(event) => setUsernameColoring(event.target.value as UsernameColoring)}
                >
                  <MenuItem value="off">关闭</MenuItem>
                  <MenuItem value="rp">按 RP 取色</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="training-collapse-label">训练页题目章节</InputLabel>
                <Select
                  labelId="training-collapse-label"
                  label="训练页题目章节"
                  value={trainingNodesCollapsed ? 'collapsed' : 'expanded'}
                  onChange={(event) => setTrainingNodesCollapsed(event.target.value === 'collapsed')}
                >
                  <MenuItem value="expanded">默认展开</MenuItem>
                  <MenuItem value="collapsed">默认收缩</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider />

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Database size={18} />
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>数据来源</Typography>
              </Stack>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={endpoint}
                aria-label="数据来源"
                onChange={(_event, next) => { if (next) setEndpoint(next as EndpointMode); }}
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

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Sparkles size={18} />
            <Typography sx={{ fontWeight: 650 }}>背景颜色</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={3} sx={{ flexWrap: 'wrap' }}>
            <ColorWheel value={customBgColor || '#ffffff'} onChange={setCustomBgColor} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{customBgColor || '默认'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                点击或拖动色环上的圆点，替换页面、侧边栏与顶栏的背景颜色
              </Typography>
              <Button variant="outlined" color="inherit" onClick={() => setCustomBgColor('')} disabled={!customBgColor}>
                重置为默认
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
