import { Box, Button, Paper, Typography } from '@mui/material';
import { BookOpen } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4.5 }, maxWidth: 420, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '4rem', lineHeight: 1, fontWeight: 700, color: 'text.secondary' }}>
          404
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, mb: 2.5 }}>
          页面不存在或已被移动。
        </Typography>
        <Button
          component={RouterLink}
          to="/problems"
          variant="contained"
          startIcon={<BookOpen size={17} />}
        >
          回到题库
        </Button>
      </Paper>
    </Box>
  );
}
