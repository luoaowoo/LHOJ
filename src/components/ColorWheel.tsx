import { useRef } from 'react';
import { Box } from '@mui/material';

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHue(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

const WHEEL_SIZE = 176;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const RING_INSET = 26;
const SATURATION = 75;
const LIGHTNESS = 55;

export default function ColorWheel({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const hue = hexToHue(value) ?? 0;

  const setFromPointer = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    onChange(hslToHex(angle, SATURATION, LIGHTNESS));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event.clientX, event.clientY);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    setFromPointer(event.clientX, event.clientY);
  };

  const knobRadius = WHEEL_RADIUS - RING_INSET / 2;
  const angleRad = (hue * Math.PI) / 180;
  const knobX = WHEEL_RADIUS + knobRadius * Math.sin(angleRad);
  const knobY = WHEEL_RADIUS - knobRadius * Math.cos(angleRad);

  return (
    <Box
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      role="slider"
      aria-label="选择背景颜色"
      aria-valuenow={Math.round(hue)}
      aria-valuemin={0}
      aria-valuemax={360}
      sx={{
        position: 'relative',
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
        borderRadius: '50%',
        background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
        cursor: 'pointer',
        touchAction: 'none',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: RING_INSET,
          borderRadius: '50%',
          bgcolor: 'background.paper',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: knobX - 11,
          top: knobY - 11,
          width: 22,
          height: 22,
          borderRadius: '50%',
          bgcolor: value || '#ffffff',
          border: '3px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
