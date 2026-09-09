import { Chip, alpha, useTheme } from '@mui/material';

type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'muted' | 'neutral';

export function statusTone(text: string): StatusTone {
  const value = text.toLowerCase();
  if (/(已取消|cancel|ignore|忽略|跳过|unsubmitted)/.test(value)) return 'muted';
  if (/(pending|queued|judging|waiting|running|等待|评测|排队|运行)/.test(value)) return 'info';
  if (/(wrong|答案错误|\bwa\b|unaccepted|runtime error|system error|unknown error|hacked|hack unsuccessful|运行时错误|系统错误)/.test(value)) return 'error';
  if (/(compile|memory|time|output|format|exceeded|编译|超限|违规)/.test(value)) return 'warning';
  if (/(通过|正确|accepted|hack successful|\bac\b|\bok\b)/.test(value)) return 'success';
  return 'neutral';
}

interface StatusChipProps {
  text: string;
  score?: string;
}

export default function StatusChip({ text, score }: StatusChipProps) {
  const theme = useTheme();
  const tone = statusTone(text);
  const palette = {
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    muted: theme.palette.text.secondary,
    neutral: theme.palette.text.secondary,
  }[tone];
  const label = score?.trim() ? `${text} · ${score}` : text;

  return (
    <Chip
      component="span"
      size="small"
      variant="filled"
      label={label}
      sx={{
        height: 22,
        fontSize: 11.5,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        color: palette,
        bgcolor: alpha(palette, 0.12),
        '& .MuiChip-label': { px: 1, py: 0 },
      }}
    />
  );
}
