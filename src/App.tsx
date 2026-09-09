import { lazy, Suspense, useEffect, useMemo } from 'react';
import {
  BrowserRouter, Navigate, Outlet, Route, Routes, useLocation,
} from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider, useAuth } from './auth';
import AppLayout from './components/AppLayout';
import { ErrorBox, FullPageLoader } from './components/StateBox';
import { usePreferences } from './prefs';
import { buildTheme } from './theme';

const ContestDetailPage = lazy(() => import('./pages/ContestDetailPage'));
const ContestsPage = lazy(() => import('./pages/ContestsPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProblemListPage = lazy(() => import('./pages/ProblemListPage'));
const ProblemPage = lazy(() => import('./pages/ProblemPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));
const RecordDetailPage = lazy(() => import('./pages/RecordDetailPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SubmitPage = lazy(() => import('./pages/SubmitPage'));
const UserPage = lazy(() => import('./pages/UserPage'));
const TrainingListPage = lazy(() => import('./pages/TrainingListPage'));
const TrainingDetailPage = lazy(() => import('./pages/TrainingDetailPage'));
const HomeworkListPage = lazy(() => import('./pages/HomeworkListPage'));
const HomeworkDetailPage = lazy(() => import('./pages/HomeworkDetailPage'));
const DiscussionListPage = lazy(() => import('./pages/DiscussionListPage'));
const DiscussionDetailPage = lazy(() => import('./pages/DiscussionDetailPage'));
const ProblemSolutionsPage = lazy(() => import('./pages/ProblemSolutionsPage'));
const ProblemStatsPage = lazy(() => import('./pages/ProblemStatsPage'));
const ProblemFilesPage = lazy(() => import('./pages/ProblemFilesPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const HackPage = lazy(() => import('./pages/HackPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function Protected() {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (error) return <ErrorBox message={error} onRetry={() => void refresh()} />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <Outlet />;
}

function RoutesRoot() {
  const location = useLocation();

  useEffect(() => {
    const labels: Array<[string, string]> = [
      ['/login', '登录'], ['/problems', '题库'], ['/problem/', '题库'],
      ['/records', '评测记录'], ['/contests', '比赛'], ['/training', '训练'],
      ['/homework', '作业'], ['/discuss', '讨论'], ['/ranking', '排行榜'],
      ['/user', '个人中心'], ['/settings', 'UI 设置'], ['/management', '管理中心'],
      ['/status', '系统状态'],
      ['/messages', '站内消息'],
      ['/security', '安全设置'],
      ['/account-settings', '账户设置'],
      ['/about', '风格简介'],
    ];
    const known = labels.find(([path]) => location.pathname.startsWith(path))?.[1];
    const label = known ?? (location.pathname === '/' ? '主页' : '页面不存在');
    document.title = `${label} · LH-oj`;
  }, [location.pathname]);

  return (
    <Suspense fallback={<FullPageLoader />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/problems" element={<ProblemListPage />} />
          <Route path="/problem/:id" element={<ProblemPage />} />
          <Route path="/problem/:id/solutions" element={<ProblemSolutionsPage />} />
          <Route path="/problem/:id/stats" element={<ProblemStatsPage />} />
          <Route path="/problem/:id/files" element={<ProblemFilesPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:rid" element={<RecordDetailPage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/contests/:id" element={<ContestDetailPage />} />
          <Route path="/training" element={<TrainingListPage />} />
          <Route path="/training/:id" element={<TrainingDetailPage />} />
          <Route path="/homework" element={<HomeworkListPage />} />
          <Route path="/homework/:id" element={<HomeworkDetailPage />} />
          <Route path="/discuss" element={<DiscussionListPage />} />
          <Route path="/discuss/:id" element={<DiscussionDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/user/:uname" element={<UserPage />} />
          <Route element={<Protected />}>
            <Route path="/problem/:id/submit" element={<SubmitPage />} />
            <Route path="/problem/:pid/hack/:rid" element={<HackPage />} />
            <Route path="/user" element={<UserPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/management" element={<ManagementPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/account-settings/:category" element={<AccountSettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

export default function App() {
  const { mode, accent, resolvedMode, customBgColor } = usePreferences();
  const theme = useMemo(() => buildTheme(mode, accent, {
    bgColor: customBgColor || undefined,
  }), [mode, accent, resolvedMode, customBgColor]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <RoutesRoot />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
