import { useState } from 'react';
import { Avatar } from '@mui/material';

export default function HydroAvatar({ src, name, userId, size = 32 }: { src?: string; name: string; userId?: number; size?: number }) {
  const [failed, setFailed] = useState(false);
  const fallback = name.trim().slice(0, 2) || (userId ? String(userId).slice(0, 2) : '?');

  return (
    <Avatar
      src={src && !failed ? src : undefined}
      imgProps={{ onError: () => setFailed(true), referrerPolicy: 'no-referrer' }}
      sx={{ width: size, height: size, bgcolor: 'primary.main', flex: '0 0 auto' }}
      alt={name}
    >
      {fallback}
    </Avatar>
  );
}
