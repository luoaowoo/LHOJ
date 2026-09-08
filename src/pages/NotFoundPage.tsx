import { Box, Button, Typography } from '@mui/material';
import { BookOpen } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box>
        <Typography variant="h1" sx={{ fontSize: '5rem', lineHeight: 1, fontWeight: 750 }}>
          404
        </Typography>
        <Typography sx={{ mt: 1, mb: 2.5, opacity: 0.7 }}>
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
      </Box>
    </Box>
  );
}
