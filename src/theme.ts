import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export interface ThemeCustomization {
  cardRadius?: number;
  paperAlpha?: number;
  cardBorder?: { width: number; color: string; opacity: number };
}

const fontStack = [
  'ui-sans-serif',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'PingFang SC',
  'Microsoft YaHei',
  'Helvetica',
  'Arial',
  'sans-serif',
].join(',');

// Tokens ported from the reference design system (M3-flavoured, warm-neutral surfaces).
const tone = {
  light: {
    surface: '#ffffff',
    surfaceDim: '#ffffff',
    surfaceBright: '#ffffff',
    containerLow: '#f7f6f3',
    container: '#ededea',
    containerHigh: '#e5e4e0',
    onSurface: '#1a1916',
    onSurfaceVariant: '#6b6860',
    outlineVariant: '#e3e1dc',
    hover: 'rgba(26, 25, 22, 0.04)',
    selected: 'rgba(26, 25, 22, 0.07)',
    selectedHover: 'rgba(26, 25, 22, 0.10)',
  },
  dark: {
    surface: '#1c1b18',
    surfaceDim: '#141311',
    surfaceBright: '#2a2925',
    containerLow: '#1c1b18',
    container: '#272521',
    containerHigh: '#3a3835',
    onSurface: '#e8e6e1',
    onSurfaceVariant: '#a8a59e',
    outlineVariant: '#3a3835',
    hover: 'rgba(232, 230, 225, 0.04)',
    selected: 'rgba(232, 230, 225, 0.07)',
    selectedHover: 'rgba(232, 230, 225, 0.10)',
  },
};

export const sidebarSurface = { light: tone.light.surfaceDim, dark: tone.dark.surfaceDim };

export function buildTheme(mode: 'light' | 'dark' | 'system', accent: string, custom?: ThemeCustomization) {
  const resolvedMode = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  const dark = resolvedMode === 'dark';
  const t = dark ? tone.dark : tone.light;
  const menuShadow = dark ? '0 1px 3px rgba(0,0,0,0.32)' : '0 1px 3px rgba(0,0,0,0.06)';
  const cardRadius = custom?.cardRadius ?? 12;
  const paperBg = custom?.paperAlpha != null ? alpha(t.surfaceBright, custom.paperAlpha) : t.surfaceBright;
  const cardBorderColor = custom?.cardBorder
    ? alpha(custom.cardBorder.color, custom.cardBorder.opacity)
    : t.outlineVariant;
  const cardBorderWidth = custom?.cardBorder?.width ?? 1;

  return createTheme({
    palette: {
      mode: resolvedMode,
      primary: { main: accent, contrastText: '#ffffff' },
      secondary: {
        light: '#4db6ac',
        main: '#00897b',
        dark: '#00695c',
        contrastText: '#ffffff',
      },
      success: {
        light: '#66bb6a',
        main: '#2e7d32',
        dark: '#1b5e20',
        contrastText: '#ffffff',
      },
      warning: {
        light: '#ffcc80',
        main: '#f59e0b',
        dark: '#b45309',
        contrastText: '#1f2937',
      },
      error: {
        light: '#f87171',
        main: '#dc2626',
        dark: '#b91c1c',
        contrastText: '#ffffff',
      },
      info: {
        light: '#7dd3fc',
        main: '#0ea5e9',
        dark: '#0369a1',
        contrastText: '#ffffff',
      },
      background: { default: t.surface, paper: paperBg },
      text: { primary: t.onSurface, secondary: t.onSurfaceVariant },
      divider: t.outlineVariant,
      action: {
        hover: t.hover,
        selected: t.selected,
        selectedOpacity: 0.07,
      },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: fontStack,
      allVariants: { letterSpacing: 0 },
      h1: { fontSize: '1.75rem', fontWeight: 650, lineHeight: 1.2 },
      h2: { fontSize: '1.45rem', fontWeight: 650, lineHeight: 1.25 },
      h3: { fontSize: '1.2rem', fontWeight: 650, lineHeight: 1.3 },
      h4: { fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.35 },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
      subtitle1: { fontSize: '1rem', fontWeight: 550, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: '0.95rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.8rem', lineHeight: 1.5 },
      overline: { fontSize: '0.72rem', fontWeight: 600, letterSpacing: 0 },
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.2,
        textTransform: 'none',
      },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 38,
            borderRadius: 8,
            paddingInline: 16,
            fontWeight: 500,
            transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease, transform 150ms ease',
            '&:active': { transform: 'scale(0.98)' },
          },
          outlined: {
            borderColor: t.outlineVariant,
            '&:hover': { backgroundColor: t.hover, borderColor: t.outlineVariant },
          },
          text: {
            '&:hover': { backgroundColor: t.hover },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 38,
            height: 38,
            borderRadius: 8,
            '&:hover': { backgroundColor: t.hover },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { minHeight: 38, borderRadius: 8, borderColor: t.outlineVariant },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderColor: cardBorderColor,
            borderWidth: cardBorderWidth,
            borderRadius: cardRadius,
            boxShadow: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: '1px solid',
            borderColor: cardBorderColor,
            borderWidth: cardBorderWidth,
            borderRadius: cardRadius,
            boxShadow: 'none',
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: cardRadius,
            border: '1px solid',
            borderColor: t.outlineVariant,
            boxShadow: menuShadow,
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: cardRadius,
            border: '1px solid',
            borderColor: t.outlineVariant,
            boxShadow: menuShadow,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: cardRadius,
            border: '1px solid',
            borderColor: t.outlineVariant,
            boxShadow: menuShadow,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 56,
            paddingLeft: 20,
            paddingRight: 20,
          },
          gutters: {
            paddingLeft: 20,
            paddingRight: 20,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: t.hover },
            '&.Mui-selected': {
              backgroundColor: t.selected,
              '&:hover': { backgroundColor: t.selectedHover },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.outlineVariant },
          head: { color: t.onSurfaceVariant, fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 500,
            height: 24,
          },
          label: {
            paddingLeft: 8,
            paddingRight: 8,
          },
          outlined: {
            borderColor: t.outlineVariant,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 38,
            borderRadius: 8,
            '&:hover': { backgroundColor: t.hover },
            '&.Mui-selected': {
              backgroundColor: 'transparent',
              '&:hover': { backgroundColor: t.hover },
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            '& .MuiInputLabel-root': { color: t.onSurfaceVariant },
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: t.surface,
              '& fieldset': { borderColor: t.outlineVariant },
              '&:hover fieldset': { borderColor: t.onSurfaceVariant },
              '&.Mui-focused fieldset': { borderWidth: 1, borderColor: accent },
            },
            '& .MuiFormHelperText-root': { color: t.onSurfaceVariant },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: '0.875rem',
          },
          icon: {
            color: t.onSurfaceVariant,
          },
        },
      },
    },
  });
}
