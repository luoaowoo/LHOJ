import { useEffect, useMemo } from 'react';
import { Box } from '@mui/material';

const defaults = ['🎉', '🎊', '✨'];

export default function ConfettiCelebration({ emojis, onDone }: { emojis: string; onDone: () => void }) {
  const pieces = useMemo(() => {
    const choices = Array.from(emojis.trim()).slice(0, 3);
    const symbols = choices.length ? choices : defaults;
    return Array.from({ length: 84 }, (_, index) => ({
      symbol: symbols[index % symbols.length],
      side: index % 2 === 0 ? 'left' : 'right',
      x: `${(index % 2 === 0 ? 1 : -1) * (18 + ((index * 29) % 48))}vw`,
      y: `${20 + ((index * 17) % 28)}vh`,
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
        '@keyframes lhConfettiBurstLeft': {
          '0%': { transform: 'translate3d(0, 0, 0) scale(.65) rotate(0deg)', opacity: 0 },
          '12%': { opacity: 1 },
          '32%': { transform: 'translate3d(var(--x), calc(var(--y) * -1), 0) scale(1) rotate(180deg)', opacity: 1 },
          '100%': { transform: 'translate3d(var(--x), 105vh, 0) rotate(760deg)', opacity: 0 },
        },
        '@keyframes lhConfettiBurstRight': {
          '0%': { transform: 'translate3d(0, 0, 0) scale(.65) rotate(0deg)', opacity: 0 },
          '12%': { opacity: 1 },
          '32%': { transform: 'translate3d(var(--x), calc(var(--y) * -1), 0) scale(1) rotate(-180deg)', opacity: 1 },
          '100%': { transform: 'translate3d(var(--x), 105vh, 0) rotate(-760deg)', opacity: 0 },
        },
      }}
    >
      {pieces.map((piece, index) => (
        <Box key={index} component="span" sx={{ position: 'absolute', [piece.side]: { xs: '-8vw', sm: '-3vw' }, bottom: { xs: '7vh', sm: '9vh' }, fontSize: { xs: 20, sm: 25 }, lineHeight: 1, willChange: 'transform, opacity', '--x': piece.x, '--y': piece.y, animation: `${piece.side === 'left' ? 'lhConfettiBurstLeft' : 'lhConfettiBurstRight'} ${piece.duration} cubic-bezier(.18,.72,.25,1) ${piece.delay} forwards` }}>
          {piece.symbol}
        </Box>
      ))}
    </Box>
  );
}
