import { useEffect, useMemo } from 'react';
import { Box } from '@mui/material';

const defaults = ['🎉', '🎊', '✨'];

export default function ConfettiCelebration({ emojis, onDone }: { emojis: string; onDone: () => void }) {
  const pieces = useMemo(() => {
    const choices = Array.from(emojis.trim()).slice(0, 3);
    const symbols = choices.length ? choices : defaults;
    return Array.from({ length: 42 }, (_, index) => ({
      symbol: symbols[index % symbols.length],
      left: `${3 + ((index * 37) % 94)}%`,
      delay: `${(index % 9) * 45}ms`,
      duration: `${1100 + (index % 6) * 130}ms`,
      rotate: `${(index * 47) % 360}deg`,
    }));
  }, [emojis]);

  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <Box
      aria-label="Accepted 庆祝"
      role="status"
      sx={{
        position: 'fixed', inset: 0, zIndex: 1500, pointerEvents: 'none', overflow: 'hidden',
        '@keyframes lhConfettiFall': {
          '0%': { transform: 'translate3d(0, -12vh, 0) rotate(0deg)', opacity: 0 },
          '12%': { opacity: 1 },
          '100%': { transform: 'translate3d(0, 108vh, 0) rotate(540deg)', opacity: 0.1 },
        },
      }}
    >
      {pieces.map((piece, index) => (
        <Box key={index} component="span" sx={{ position: 'absolute', left: piece.left, top: 0, fontSize: { xs: 20, sm: 25 }, transform: `rotate(${piece.rotate})`, animation: `lhConfettiFall ${piece.duration} ease-in ${piece.delay} forwards` }}>
          {piece.symbol}
        </Box>
      ))}
    </Box>
  );
}
