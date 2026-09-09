import { useEffect, useState } from 'react';
import { Avatar } from '@mui/material';

export default function HydroAvatar({ src, name, userId, size = 32 }: { src?: string; name: string; userId?: number; size?: number }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallback = name.trim().slice(0, 2) || (userId ? String(userId).slice(0, 2) : '?');

  useEffect(() => {
    setReady(false); setFailed(false);
    if (!src) return;
    const image = new Image();
    image.onload = () => setReady(true);
    image.onerror = () => setFailed(true);
    image.src = src;
  }, [src]);

  return (
    <Avatar
      src={src && !failed && ready ? src : undefined}
      imgProps={{ onError: () => setFailed(true) }}
      sx={{ width: size, height: size, bgcolor: 'primary.main', flex: '0 0 auto' }}
      alt={name}
    >
      {fallback}
    </Avatar>
  );
}
