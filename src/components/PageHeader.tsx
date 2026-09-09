import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', pb: 1.5, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon}
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 }}>{title}</Typography>
        </Stack>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {actions}
        </Stack>
      ) : null}
    </Box>
  );
}
