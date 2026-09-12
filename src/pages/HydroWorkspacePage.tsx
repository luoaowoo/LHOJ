import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HydroAdminWorkspace from '../components/HydroAdminWorkspace';
import { ErrorBox } from '../components/StateBox';
import { parseHydroWorkspaceTarget } from '../lib/hydro-workspace';

export default function HydroWorkspacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const target = parseHydroWorkspaceTarget(searchParams.toString());

  if (!target) return <ErrorBox message="Hydro 功能地址无效。" onRetry={() => navigate('/')} />;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button color="inherit" size="small" startIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {target.path}
        </Typography>
      </Stack>
      <HydroAdminWorkspace path={target.path} title={target.title ?? 'Hydro 功能'} />
    </Box>
  );
}