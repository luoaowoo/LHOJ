import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, BottomNavigation, BottomNavigationAction, Box, Divider, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Toolbar,
  Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Activity, BarChart3, BookOpen, ChevronDown, CircleUserRound, ClipboardList, GraduationCap,
  Home, ListChecks, LogOut, MessageSquare, MoreHorizontal, Palette, PanelLeftClose,
  PanelLeftOpen, Settings2, ShieldCheck, Trophy, Wrench,
} from 'lucide-react';
import { useAuth } from '../auth';
import { usePreferences } from '../prefs';
import { hydroAvatarUrl } from '../lib/endpoint';
import { parseRp, ratingColor } from '../lib/rating';
import { resolveChromeBg } from '../theme';
import HydroAvatar from './HydroAvatar';

const drawerWidth = 260;
const railWidth = 72;
const sidebarStorageKey = 'lh-oj.sidebar-collapsed';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/problems', label: '题单', icon: BookOpen },
  { to: '/training', label: '训练', icon: GraduationCap },
  { to: '/contests', label: '比赛', icon: Trophy },
  { to: '/homework', label: '作业', icon: ClipboardList },
  { to: '/discuss', label: '讨论', icon: MessageSquare },
  { to: '/records', label: '评测记录', icon: ListChecks },
  { to: '/ranking', label: '排名', icon: BarChart3 },
];
const mobileNavItems = [navItems[0], navItems[1], navItems[3], navItems[6]];

function NavRow({
  to, label, icon: Icon, activeItem, compact, onClick,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  activeItem: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <ListItemButton
        component={RouterLink}
        to={to}
        selected={activeItem}
        onClick={onClick}
        aria-label={label}
        title={compact ? label : undefined}
        sx={{
          minHeight: 38,
          gap: 0,
          px: 1.5,
          justifyContent: compact ? 'center' : 'flex-start',
          color: activeItem ? 'text.primary' : 'text.secondary',
        }}
      >
        <ListItemIcon sx={{ minWidth: compact ? 0 : 34, justifyContent: 'center', color: 'inherit' }}>
          <Icon size={18} strokeWidth={activeItem ? 2 : 1.75} />
        </ListItemIcon>
        {!compact && (
          <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: activeItem ? 600 : 400 }}>
            {label}
          </ListItemText>
        )}
      </ListItemButton>
    </ListItem>
  );
}

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
  const { usernameColoring, customBgColor } = usePreferences();
  const sidebarBg = resolveChromeBg(theme.palette.mode, customBgColor);
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const userRating = usernameColoring === 'rp' ? parseRp(user?.rpInfo) : null;
  const userColor = ratingColor(userRating);

  useEffect(() => {
    try {
      localStorage.setItem(sidebarStorageKey, String(sidebarCollapsed));
    } catch {
      // Sidebar preference is best effort.
    }
  }, [sidebarCollapsed]);

  const active = (to: string) => {
    if (to === '/') return location.pathname === '/';
    if (to === '/problems') return location.pathname.startsWith('/problems') || location.pathname.startsWith('/problem/');
    return location.pathname.startsWith(to);
  };
  const pageTitle = navItems.find((item) => active(item.to))?.label
    ?? (location.pathname.startsWith('/problem/')
      ? '题单'
      : location.pathname.startsWith('/user')
        ? '个人中心'
        : location.pathname.startsWith('/settings')
          ? 'UI 设置'
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
      <Box sx={{ px: compactRail ? 1 : 2.5, pt: 3.5, pb: 3, minHeight: 56, display: 'flex', justifyContent: compactRail ? 'center' : 'flex-start', alignItems: 'center' }}>
        {!compactRail
          ? <Typography sx={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>LH-oj</Typography>
          : <Typography sx={{ fontWeight: 600, fontSize: 15 }}>OJ</Typography>}
      </Box>
      <List dense sx={{ px: 1.5, py: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleNavItems.map((item) => (
          <NavRow
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            activeItem={active(item.to)}
            compact={compactRail}
            onClick={() => setDrawerOpen(false)}
          />
        ))}
      </List>
      <Divider sx={{ mx: 1.5 }} />
      <List dense sx={{ px: 1.5, py: 1 }}>
        <NavRow to="/status" label="系统状态" icon={Activity} activeItem={active('/status')} compact={compactRail} onClick={() => setDrawerOpen(false)} />
        <NavRow to="/user" label="个人中心" icon={CircleUserRound} activeItem={active('/user')} compact={compactRail} onClick={() => setDrawerOpen(false)} />
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
          bgcolor: 'background.default',
          width: phone ? '100%' : `calc(100% - ${navigationWidth}px)`,
          ml: phone ? 0 : `${navigationWidth}px`,
          transition: theme.transitions.create(['width', 'margin-left']),
        }}
      >
        <Toolbar sx={{ gap: 0.5, minHeight: { xs: 56, md: 64 }, px: { xs: 1.5, md: 2.5 } }}>
          {wide && (
            <Tooltip title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
              <IconButton
                edge="start"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
              </IconButton>
            </Tooltip>
          )}
          <Typography noWrap sx={{ fontWeight: 600, flex: 1, fontSize: { xs: 15, md: 16 } }}>{pageTitle}</Typography>
          {user && (
            <>
              <Box
                component="button"
                type="button"
                onClick={(event) => setUserAnchor(event.currentTarget)}
                aria-label="账户菜单"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.9, cursor: 'pointer',
                  border: 0, borderRadius: 99, pl: 0.5, pr: 1.3, py: 0.5,
                  bgcolor: 'transparent', font: 'inherit', color: 'inherit',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <HydroAvatar src={hydroAvatarUrl(user.avatarUrl, user._id)} name={user.uname} userId={user._id} size={28} />
                <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600, color: userColor ?? 'text.primary', maxWidth: 140 }}>
                  {user.uname}
                </Typography>
                <ChevronDown size={15} style={{ opacity: 0.6 }} />
              </Box>
              <Menu
                open={Boolean(userAnchor)}
                anchorEl={userAnchor}
                onClose={() => setUserAnchor(null)}
                slotProps={{ paper: { sx: { width: 220, mt: 0.8 } } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14, color: userColor ?? 'text.primary' }}>{user.uname}</Typography>
                  <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>{user.mail || user.role || 'Hydro User'}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => setUserAnchor(null)} component={RouterLink} to="/user">
                  <ListItemIcon><CircleUserRound size={17} /></ListItemIcon>
                  我的资料
                </MenuItem>
                <MenuItem onClick={() => setUserAnchor(null)} component={RouterLink} to="/messages">
                  <ListItemIcon><MessageSquare size={17} /></ListItemIcon>
                  站内消息
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => setUserAnchor(null)} component={RouterLink} to="/account-settings/account">
                  <ListItemIcon><Settings2 size={17} /></ListItemIcon>
                  账户设置
                </MenuItem>
                <MenuItem onClick={() => setUserAnchor(null)} component={RouterLink} to="/security">
                  <ListItemIcon><ShieldCheck size={17} /></ListItemIcon>
                  安全设置
                </MenuItem>
                <MenuItem onClick={() => setUserAnchor(null)} component={RouterLink} to="/settings">
                  <ListItemIcon><Palette size={17} /></ListItemIcon>
                  UI 设置
                </MenuItem>
                <Divider />
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
            bgcolor: sidebarBg,
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
          pb: { xs: 'calc(76px + env(safe-area-inset-bottom))', sm: 0 },
          transition: theme.transitions.create('width'),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, md: 64 } }} />
        <Box
          sx={{
            px: { xs: 1.6, sm: 2.6, xl: 4 },
            py: { xs: 2, md: 3.2 },
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
          sx={{ border: 0, px: 2.5, py: 1.5, bgcolor: 'transparent' }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            LH-oj · 成就龙中学子信竞梦 · 数据与权限由 Hydro 提供
          </Typography>
        </Paper>
      </Box>

      <Box
        component="nav"
        aria-label="主要导航"
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          left: 16,
          right: 16,
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          zIndex: (currentTheme) => currentTheme.zIndex.appBar,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: sidebarBg,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        <BottomNavigation
          showLabels
          value={mobileNavValue}
          sx={{
            height: 64,
            bgcolor: 'transparent',
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
      </Box>
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
