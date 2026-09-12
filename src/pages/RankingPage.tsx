import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, alpha, useTheme,
} from '@mui/material';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { hydroAvatarUrl } from '../lib/endpoint';
import HydroAvatar from '../components/HydroAvatar';
import { ratingColor } from '../lib/rating';
import { scrapeRankingRows } from '../lib/scrape';
import { usePreferences } from '../prefs';
import type { RankingRow } from '../types';

const medalStyles: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#ffd54a', fg: '#5c4400' },
  2: { bg: '#c9ccd1', fg: '#3a3a3a' },
  3: { bg: '#e3a877', fg: '#4a2c12' },
};

function extractUid(href?: string): number | null {
  if (!href) return null;
  const match = /\/user\/(\d+)/.exec(href);
  return match ? Number(match[1]) : null;
}

export default function RankingPage() {
  const theme = useTheme();
  const { user: sessionUser } = useAuth();
  const { usernameColoring } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await scrapeRankingRows(page));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '排行榜加载失败。');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || error || !rows || rows.length > 0 || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [error, loading, page, rows, searchParams, setSearchParams]);

  const retry = () => void load();

  return (
    <Box>
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="排行榜"
        subtitle="按 Hydro RP 排序的用户榜单。"
        actions={(
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={retry}>
            刷新
          </Button>
        )}
      />

      {error ? (
        <ErrorBox message={error} onRetry={retry} />
      ) : loading && !rows ? (
        <FullPageLoader />
      ) : !rows || rows.length === 0 ? (
        <EmptyBox message="暂无排行数据" />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', overflowY: 'hidden', borderRadius: 3 }}>
            <Table
            size="small"
            aria-label="排行榜"
            sx={{ '& .MuiTableCell-root': { py: 1, px: 1.5 } }}
          >
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'action.hover' } }}>
                <TableCell sx={{ width: 72 }}>排名</TableCell>
                <TableCell sx={{ minWidth: 200 }}>用户</TableCell>
                <TableCell align="right">RP</TableCell>
                <TableCell align="right">AC</TableCell>
                <TableCell sx={{ minWidth: 220 }}>简介</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const rankNum = Number.parseInt(row.rank, 10);
                const medal = Number.isFinite(rankNum) ? medalStyles[rankNum] : undefined;
                const uid = extractUid(row.userHref);
                const isSelf = uid !== null && sessionUser?._id === uid;
                const rpNum = Number.parseFloat(row.rp);
                const nameColor = usernameColoring === 'rp' && Number.isFinite(rpNum) ? ratingColor(rpNum) : undefined;
                const userTo = row.userHref?.match(/\/user\/([^/?#]+)/)?.[1]
                  ? `/user/${row.userHref.match(/\/user\/([^/?#]+)/)?.[1]}`
                  : `/user/${encodeURIComponent(row.user)}`;
                return (
                  <TableRow
                    key={`${row.user || 'row'}-${index}`}
                    hover
                    sx={{
                      bgcolor: isSelf ? alpha(theme.palette.primary.main, 0.1) : index % 2 ? 'action.hover' : 'transparent',
                    }}
                  >
                    <TableCell>
                      {medal ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            fontWeight: 700,
                            fontSize: 13,
                            bgcolor: medal.bg,
                            color: medal.fg,
                          }}
                        >
                          {row.rank}
                        </Box>
                      ) : (row.rank || '-')}
                    </TableCell>
                    <TableCell>
                      {row.user ? (
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <HydroAvatar src={uid !== null ? hydroAvatarUrl(undefined, uid) : undefined} name={row.user} userId={uid ?? undefined} size={30} />
                          <Typography
                            component={RouterLink}
                            to={userTo}
                            noWrap
                            sx={{
                              fontWeight: 600,
                              fontSize: 13.5,
                              color: nameColor ?? 'primary.main',
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            {row.user}
                          </Typography>
                          {isSelf && (
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: 'primary.main', flexShrink: 0 }}
                            >
                              我
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">{row.rp || '-'}</TableCell>
                    <TableCell align="right">{row.accept || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>{row.bio || '-'}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              page={page}
              count={page + (rows.length >= 100 ? 1 : 0)}
              onChange={(_, nextPage) => {
                const next = new URLSearchParams(searchParams);
                if (nextPage === 1) next.delete('page');
                else next.set('page', String(nextPage));
                setSearchParams(next);
              }}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}
    </Box>
  );
}
