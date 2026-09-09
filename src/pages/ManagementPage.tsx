import { useState } from 'react';
import { Box, Button, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, Typography } from '@mui/material';
import {
  BookOpen, Check, ChevronRight, ClipboardList, FileCode2, Gauge, Globe2, GraduationCap,
  Settings2, ShieldCheck, TerminalSquare, Trophy, UserCog, Users, Wrench,
} from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { ErrorBox } from '../components/StateBox';
import { useNavigate } from 'react-router-dom';

const groups = [
  {
    title: '系统',
    items: [
      { label: '管理首页', path: '/manage', icon: Gauge },
      { label: '系统仪表盘', path: '/manage/dashboard', icon: Gauge },
      { label: '系统设置', path: '/manage/setting', icon: Settings2 },
      { label: '系统配置', path: '/manage/config', icon: Settings2 },
      { label: '脚本管理', path: '/manage/script', icon: TerminalSquare },
      { label: '用户导入', path: '/manage/userimport', icon: Users },
      { label: '用户权限', path: '/manage/userpriv', icon: UserCog },
    ],
  },
  {
    title: '域与内容',
    items: [
      { label: '域管理', path: '/domain/dashboard', icon: Globe2 },
      { label: '域资料', path: '/domain/edit', icon: Settings2 },
      { label: '域成员', path: '/domain/user', icon: Users },
      { label: '域权限', path: '/domain/permission', icon: ShieldCheck },
      { label: '角色与权限', path: '/domain/role', icon: ShieldCheck },
      { label: '用户组', path: '/domain/group', icon: Users },
      { label: '入域申请', path: '/domain/join_applications', icon: UserCog },
      { label: '搜索域', path: '/domain/search', icon: Globe2 },
      { label: '加入域', path: '/domain/join', icon: Globe2 },
      { label: '创建题目', path: '/problem/create', icon: BookOpen },
      { label: '题目管理', path: '/p', icon: FileCode2 },
    ],
  },
  {
    title: '活动',
    items: [
      { label: '比赛管理', path: '/contest', icon: Trophy },
      { label: '作业管理', path: '/homework', icon: ClipboardList },
      { label: '训练管理', path: '/training', icon: GraduationCap },
    ],
  },
];

export default function ManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(groups[0].items[0].label);
  if (user?.role !== 'root') return <ErrorBox message="当前账号没有系统管理权限。" />;

  const selectedItem = groups.flatMap((group) => group.items).find((item) => item.label === selected);
  const internalPaths: Record<string, string> = {
    '管理首页': '/management',
    '比赛管理': '/contests',
    '作业管理': '/homework',
    '训练管理': '/training',
    '题目管理': '/problems',
    '系统设置': '/settings',
  };

  return (
    <Box>
      <PageHeader icon={<Wrench size={20} />} title="管理中心" subtitle="所有管理入口均在 LH-oj 内打开。" />
      <Paper variant="outlined" sx={{ mb: 2, p: { xs: 2, sm: 2.5 }, bgcolor: 'action.hover' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{selectedItem?.label ?? '管理工作区'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {internalPaths[selected] ? '已接入 LH-oj 站内功能，可以直接使用。' : '该管理模块已保留在站内，具体操作正在接入中。'}
            </Typography>
          </Box>
          {internalPaths[selected] && internalPaths[selected] !== '/management' ? (
            <Button variant="contained" size="small" startIcon={<ChevronRight size={16} />} onClick={() => navigate(internalPaths[selected])}>
              打开站内工作区
            </Button>
          ) : <Check size={20} aria-label="当前页面" />}
        </Stack>
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {groups.map((group) => (
          <Paper key={group.title} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 650, px: 2, py: 1.5 }}>{group.title}</Typography>
            <Divider />
            <List disablePadding aria-label={`${group.title}管理`}>
              {group.items.map((item, index) => (
                <ListItem key={item.path} disablePadding divider={index < group.items.length - 1}>
                  <ListItemButton selected={selected === item.label} onClick={() => setSelected(item.label)} sx={{ minHeight: 52 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}><item.icon size={18} /></ListItemIcon>
                    <ListItemText primary={item.label} />
                    <ChevronRight size={15} aria-hidden="true" />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
