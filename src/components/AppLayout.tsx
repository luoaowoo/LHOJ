import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Avatar, BottomNavigation, BottomNavigationAction, Box, Divider, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Toolbar,
  Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Activity, BarChart3, BookOpen, CircleUserRound, ClipboardList, ExternalLink, GraduationCap,
  ListChecks, LogOut, MessageSquare, Moon, MoreHorizontal, Palette, PanelLeftClose,
  PanelLeftOpen, Sun, Trophy, Wrench,
} from 'lucide-react';
import { useAuth } from '../auth';
import { usePreferences } from '../prefs';
import { hydroPublicUrl } from '../lib/endpoint';

const drawerWidth = 232;
const railWidth = 72;
const sidebarStorageKey = 'lh-oj.sidebar-collapsed';
const accents = [
  { name: '蓝', value: '#2563eb' },
  { name: '青', value: '#0e7490' },
  { name: '紫', value: '#6d28d9' },
  { name: '绿', value: '#15803d' },
  { name: '玫红', value: '#be185d' },
  { name: '橙', value: '#c2410c' },
];

const navItems = [
  { to: '/problems', label: '题库', icon: BookOpen },
  { to: '/records', label: '评测记录', icon: ListChecks },
  { to: '/contests', label: '比赛', icon: Trophy },
  { to: '/training', label: '训练', icon: GraduationCap },
  { to: '/homework', label: '作业', icon: ClipboardList },
  { to: '/discuss', label: '讨论', icon: MessageSquare },
  { to: '/ranking', label: '排行榜', icon: BarChart3 },
];
const mobileNavItems = [navItems[0], navItems[1], navItems[2], navItems[5]];

export default function AppLayout() {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(sidebarStorageKey) === 'true';
    } catch {
      return false;
    }
  });
  const compactRail = !phone && (!wide || sidebarCollapsed);
  const navigationWidth = compactRail ? railWidth : drawerWidth;
  const { user, logout } = useAuth();
  const { mode, accent, setMode, setAccent } = usePreferences();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(sidebarStorageKey, String(sidebarCollapsed));
    } catch {
      // Sidebar preference is best effort.
    }
  }, [sidebarCollapsed]);

  const active = (to: string) => to === '/problems'
    ? location.pathname.startsWith('/problems') || location.pathname.startsWith('/problem/')
    : location.pathname.startsWith(to);
  const pageTitle = navItems.find((item) => active(item.to))?.label
    ?? (location.pathname.startsWith('/problem/')
      ? '题库'
      : location.pathname.startsWith('/user')
        ? '个人中心'
        : location.pathname.startsWith('/settings')
          ? '设置'
          : location.pathname.startsWith('/management')
            ? '管理中心'
          : location.pathname.startsWith('/status')
            ? '系统状态'
          : location.pathname.startsWith('/messages')
            ? '站内消息'
          : '主页');
  const mobileNavValue = mobileNavItems.find((item) => active(item.to))?.to ?? 'more';
  const visibleNavItems = user?.role === 'root'
    ? [...navItems, { to: '/management', label: '管理中心', icon: Wrench }]
    : navItems;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: compactRail ? 1 : 2, py: 1.55, minHeight: 64, display: 'flex', justifyContent: compactRail ? 'center' : 'flex-start', alignItems: 'center', gap: 1.1 }}>
        <Box component="img" src="/校徽.png" alt="LH-oj" sx={{ width: 34, height: 34, borderRadius: '8px', objectFit: 'cover', boxShadow: '0 0 0 1px rgba(255,255,255,.12)' }} />
        {!compactRail && <Box>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.15 }}>LH-oj</Typography>
          <Typography variant="caption" sx={{ color: 'primary.main', fontFamily: 'monospace' }}>Longzhong / OJ</Typography>
        </Box>}
      </Box>
      <Divider />
      <List dense sx={{ px: 1, pt: 1.2, '& .MuiListItemButton-root': { borderRadius: 1 } }}>
        {visibleNavItems.map((item) => (
          <ListItem key={item.to} disablePadding sx={{ mb: 0.35 }}>
            <ListItemButton
              component={RouterLink}
              to={item.to}
              selected={active(item.to)}
              onClick={() => setDrawerOpen(false)}
              aria-label={item.label}
              title={compactRail ? item.label : undefined}
              sx={{ minHeight: 44, justifyContent: compactRail ? 'center' : 'flex-start', '&.Mui-selected': { color: 'primary.main', boxShadow: 'inset 2px 0 0 currentColor' } }}
            >
              <ListItemIcon sx={{ minWidth: compactRail ? 0 : 40, justifyContent: 'center' }}>
                <item.icon size={19} />
              </ListItemIcon>
              {!compactRail && <ListItemText primaryTypographyProps={{ fontSize: 14.5 }}>{item.label}</ListItemText>}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flex: 1 }} />
      <Divider />
      <List dense sx={{ px: 1.2, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/status" selected={active('/status')} onClick={() => setDrawerOpen(false)} aria-label="系统状态" title={compactRail ? '系统状态' : undefined} sx={{ minHeight: 44, borderRadius: 2, justifyContent: compactRail ? 'center' : 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: compactRail ? 0 : 40, justifyContent: 'center' }}><Activity size={19} /></ListItemIcon>
            {!compactRail && <ListItemText primaryTypographyProps={{ fontSize: 14.5 }}>系统状态</ListItemText>}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/user"
            selected={active('/user')}
            onClick={() => setDrawerOpen(false)}
            aria-label="个人中心"
            title={compactRail ? '个人中心' : undefined}
            sx={{ minHeight: 44, borderRadius: 2, justifyContent: compactRail ? 'center' : 'flex-start' }}
          >
            <ListItemIcon sx={{ minWidth: compactRail ? 0 : 40, justifyContent: 'center' }}><CircleUserRound size={19} /></ListItemIcon>
            {!compactRail && <ListItemText primaryTypographyProps={{ fontSize: 14.5 }}>个人中心</ListItemText>}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component="a"
            href={hydroPublicUrl('/domain/dashboard')}
            target="_blank"
            rel="noreferrer"
            onClick={() => setDrawerOpen(false)}
            aria-label="Hydro 管理"
            title={compactRail ? 'Hydro 管理' : undefined}
            sx={{ minHeight: 44, borderRadius: 2, justifyContent: compactRail ? 'center' : 'flex-start' }}
          >
            <ListItemIcon sx={{ minWidth: compactRail ? 0 : 40, justifyContent: 'center' }}><ExternalLink size={19} /></ListItemIcon>
            {!compactRail && <ListItemText primaryTypographyProps={{ fontSize: 14.5 }}>Hydro 管理</ListItemText>}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed', left: 12, top: 12, zIndex: 2000, px: 1.5, py: 0.8, minHeight: 44, alignItems: 'center',
          bgcolor: 'background.paper', color: 'primary.main', borderRadius: 1,
          transform: 'translateY(-160%)', '&:focus': { transform: 'translateY(0)' },
        }}
      >
        跳到主内容
      </Box>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(11,15,18,.88)',
          backdropFilter: 'blur(14px)',
          width: phone ? '100%' : `calc(100% - ${navigationWidth}px)`,
          ml: phone ? 0 : `${navigationWidth}px`,
          transition: theme.transitions.create(['width', 'margin-left']),
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 58, md: 64 } }}>
          {wide && (
            <Tooltip title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
              <IconButton
                edge="start"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </IconButton>
            </Tooltip>
          )}
          <Typography
            noWrap
            sx={{ fontWeight: 650, flex: 1, fontSize: { xs: 16, md: 18 } }}
          >
            {pageTitle}
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: .7, px: 1.2, py: .55, border: '1px solid', borderColor: 'divider', borderRadius: 1, color: 'text.secondary' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'success.light', boxShadow: '0 0 9px rgba(102,187,106,.7)' }} />
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>Hydro online</Typography>
          </Box>
          <Tooltip title={mode === 'dark' ? '切换到亮色' : '切换到暗色'}>
            <IconButton onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label="切换主题">
              {mode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="主题色">
            <IconButton onClick={(event) => setPaletteAnchor(event.currentTarget)} aria-label="选择主题色">
              <Palette size={19} />
            </IconButton>
          </Tooltip>
          <Menu
            open={Boolean(paletteAnchor)}
            anchorEl={paletteAnchor}
            onClose={() => setPaletteAnchor(null)}
            slotProps={{ paper: { sx: { px: 1.5, py: 1.2, display: 'flex', gap: 0.8 } } }}
          >
            {accents.map((item) => (
              <Tooltip key={item.value} title={item.name}>
                <Box
                  component="button"
                  type="button"
                  aria-label={`主题色 ${item.name}`}
                  onClick={() => { setAccent(item.value); setPaletteAnchor(null); }}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: 3,
                    borderColor: accent === item.value ? 'text.primary' : 'transparent',
                    background: item.value,
                    outline: 'none',
                  }}
                />
              </Tooltip>
            ))}
          </Menu>
          {user && (
            <>
              <IconButton onClick={(event) => setUserAnchor(event.currentTarget)} aria-label="账户菜单">
                {user.avatarUrl
                  ? <Avatar src={user.avatarUrl} sx={{ width: 34, height: 34 }} alt="" />
                  : <Avatar sx={{ width: 34, height: 34, bgcolor: accent, fontSize: 15 }}>{user.uname.slice(0, 2)}</Avatar>}
              </IconButton>
              <Menu
                open={Boolean(userAnchor)}
                anchorEl={userAnchor}
                onClose={() => setUserAnchor(null)}
                slotProps={{ paper: { sx: { width: 220, mt: 0.8 } } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 650 }}>{user.uname}</Typography>
                  <Typography variant="body2" noWrap sx={{ opacity: 0.65 }}>{user.mail || user.role || 'Hydro User'}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => setUserAnchor(null)} component={RouterLink} to="/user">
                  <ListItemIcon><CircleUserRound size={17} /></ListItemIcon>
                  个人中心
                </MenuItem>
                <MenuItem onClick={() => { setUserAnchor(null); void logout(); }}>
                  <ListItemIcon><LogOut size={17} /></ListItemIcon>
                  退出登录
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant={phone ? 'temporary' : 'permanent'}
        open={!phone || drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: navigationWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: navigationWidth,
            boxSizing: 'border-box',
            border: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#0f1418',
            overflowX: 'hidden',
            transition: theme.transitions.create('width'),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        id="main-content"
        component="main"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: phone ? '100%' : `calc(100% - ${navigationWidth}px)`,
          pb: { xs: 'calc(64px + env(safe-area-inset-bottom))', sm: 0 },
          transition: theme.transitions.create('width'),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, md: 64 } }} />
        <Box
          sx={{
            px: { xs: 1.4, sm: 2.2, xl: 3 },
            py: { xs: 1.6, md: 2.4 },
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Box sx={{ maxWidth: 1480, mx: 'auto' }}>
            <Outlet />
          </Box>
        </Box>
        <Paper
          square
          variant="outlined"
          sx={{ borderLeft: 0, borderRight: 0, borderBottom: 0, px: 2.5, py: 1.5 }}
        >
          <Typography variant="caption" sx={{ opacity: 0.62 }}>
            LH-oj · 成就龙中学子信竞梦 · 数据与权限由 Hydro 提供
          </Typography>
        </Paper>
      </Box>

      <Paper
        component="nav"
        aria-label="主要导航"
        square
        elevation={3}
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          inset: 'auto 0 0',
          zIndex: (currentTheme) => currentTheme.zIndex.appBar,
          pb: 'env(safe-area-inset-bottom)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BottomNavigation
          showLabels
          value={mobileNavValue}
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5 },
            '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem' },
          }}
        >
          {mobileNavItems.map((item) => (
            <BottomNavigationAction
              key={item.to}
              component={RouterLink}
              to={item.to}
              value={item.to}
              label={item.label}
              icon={<item.icon size={20} />}
            />
          ))}
          <BottomNavigationAction
            value="more"
            label="更多"
            icon={<MoreHorizontal size={20} />}
            onClick={() => setDrawerOpen(true)}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'background.default',
        p: 2,
      }}
    >
      {children}
    </Box>
  );
}
