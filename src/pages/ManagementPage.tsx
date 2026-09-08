import { Box, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import {
  BookOpen, ClipboardList, ExternalLink, FileCode2, Gauge, Globe2, GraduationCap,
  Settings2, ShieldCheck, TerminalSquare, Trophy, UserCog, Users,
} from 'lucide-react';
import { useAuth } from '../auth';
import { ErrorBox } from '../components/StateBox';
import { hydroPublicUrl } from '../lib/endpoint';

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
  if (user?.role !== 'root') return <ErrorBox message="当前账号没有系统管理权限。" />;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>管理中心</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
        管理操作将在 Hydro 正式站点中打开。
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {groups.map((group) => (
          <Paper key={group.title} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ px: 2, py: 1.5 }}>{group.title}</Typography>
            <Divider />
            <List disablePadding aria-label={`${group.title}管理`}>
              {group.items.map((item, index) => (
                <ListItem key={item.path} disablePadding divider={index < group.items.length - 1}>
                  <ListItemButton component="a" href={hydroPublicUrl(item.path)} target="_blank" rel="noreferrer" sx={{ minHeight: 52 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}><item.icon size={18} /></ListItemIcon>
                    <ListItemText primary={item.label} />
                    <ExternalLink size={15} aria-hidden="true" />
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
