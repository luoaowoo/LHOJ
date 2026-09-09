import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { usePreferences } from '../prefs';
import { accents } from '../lib/accents';
import PageHeader from '../components/PageHeader';

const principles = [
  {
    title: '极简与留白',
    body: '页面不再用大面积描边卡片和玻璃拟态堆叠，标题与内容直接呈现，靠间距而不是边框分隔层级。',
  },
  {
    title: '扁平的导航状态',
    body: '侧边栏与内容区共用同一背景色，当前页面仅用一块浅色圆角矩形标出，不使用高对比左边框指示条。',
  },
  {
    title: '克制的强调色',
    body: '主题色只用在关键交互与少量数据点上（按钮、选中态、图表色阶），大部分文字保持中性灰度，避免视觉噪音。',
  },
  {
    title: '一致的组件语言',
    body: '页头、确认弹窗、榜单表格、难度与状态标签等在全站复用同一套组件，减少重复实现带来的细微不一致。',
  },
];

export default function AboutPage() {
  const { mode, accent, setMode, setAccent } = usePreferences();

  return (
    <Box sx={{ maxWidth: 860 }}>
      <PageHeader
        icon={<Sparkles size={20} />}
        title="风格简介"
        subtitle="LH-oj 的视觉设计原则与可调节的外观偏好"
      />

      <Stack spacing={2}>
        {principles.map((item) => (
          <Paper key={item.title} variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 650, mb: 0.6 }}>{item.title}</Typography>
            <Typography variant="body2" color="text.secondary">{item.body}</Typography>
          </Paper>
        ))}

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            {mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <Typography sx={{ fontWeight: 650 }}>试试看：外观模式</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Box
              component="button"
              type="button"
              onClick={() => setMode('light')}
              sx={{
                flex: 1, cursor: 'pointer', borderRadius: 2.5, p: 1.4, textAlign: 'left',
                border: '1px solid', borderColor: mode === 'light' ? 'primary.main' : 'divider',
                bgcolor: mode === 'light' ? 'action.selected' : 'transparent', color: 'text.primary', font: 'inherit',
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>亮色</Typography>
              <Typography variant="caption" color="text.secondary">明亮、高对比的日间配色</Typography>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setMode('dark')}
              sx={{
                flex: 1, cursor: 'pointer', borderRadius: 2.5, p: 1.4, textAlign: 'left',
                border: '1px solid', borderColor: mode === 'dark' ? 'primary.main' : 'divider',
                bgcolor: mode === 'dark' ? 'action.selected' : 'transparent', color: 'text.primary', font: 'inherit',
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>暗色</Typography>
              <Typography variant="caption" color="text.secondary">低亮度、适合长时间刷题</Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Palette size={18} />
            <Typography sx={{ fontWeight: 650 }}>试试看：主题色</Typography>
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
        </Paper>
      </Stack>
    </Box>
  );
}
