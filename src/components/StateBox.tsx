import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { RefreshCw } from 'lucide-react';

export function FullPageLoader() {
  return (
    <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress size={30} />
    </Box>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Box
      sx={{
        minHeight: 220,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        gap: 1.5,
      }}
    >
      <Box role="alert" aria-live="assertive">
        <Typography color="error" sx={{ mb: 1 }}>{message}</Typography>
        {onRetry && (
          <Button color="inherit" startIcon={<RefreshCw size={16} />} onClick={onRetry}>重试</Button>
        )}
      </Box>
    </Box>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return (
    <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', opacity: 0.65 }}>
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}
