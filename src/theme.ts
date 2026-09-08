import { createTheme } from '@mui/material/styles';
import type { ThemeMode } from './types';

const fontStack = [
  'Inter',
  'PingFang SC',
  'Microsoft YaHei',
  'Segoe UI',
  'sans-serif',
].join(',');

export function buildTheme(mode: ThemeMode, accent: string) {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: accent },
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
      background: dark
        ? { default: '#0d1115', paper: '#181e24' }
        : { default: '#f4f6fa', paper: '#ffffff' },
      text: dark
        ? { primary: '#f4f7fa', secondary: '#b5c0ca' }
        : { primary: '#172033', secondary: '#4b5563' },
      divider: dark ? 'rgba(226, 232, 240, 0.18)' : 'rgba(15, 23, 42, 0.14)',
      action: {
        hover: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(25, 55, 120, 0.06)',
        selected: dark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.10)',
        selectedOpacity: dark ? 0.18 : 0.10,
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
      h5: { fontSize: '1.18rem', fontWeight: 700, lineHeight: 1.4 },
      h6: { fontSize: '1rem', fontWeight: 700, lineHeight: 1.4 },
      subtitle1: { fontSize: '1rem', fontWeight: 550, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: '0.98rem', lineHeight: 1.65 },
      body2: { fontSize: '0.9rem', lineHeight: 1.6 },
      caption: { fontSize: '0.8rem', lineHeight: 1.5 },
      overline: { fontSize: '0.72rem', fontWeight: 600, letterSpacing: 0 },
      button: {
        fontSize: '0.86rem',
        fontWeight: 600,
        lineHeight: 1.2,
        textTransform: 'none',
      },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 8,
            paddingInline: 16,
            fontWeight: 600,
            transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { width: 44, height: 44 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { minHeight: 44 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            ...(dark && { borderColor: 'rgba(226,232,240,0.16)' }),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: '1px solid',
            borderColor: dark ? 'rgba(226, 232, 240, 0.10)' : 'rgba(15, 23, 42, 0.12)',
            borderRadius: 8,
            boxShadow: 'none',
            backgroundImage: 'none',
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
            '&:hover': {
              backgroundColor: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 55, 120, 0.05)',
            },
            '&.Mui-selected': {
              backgroundColor: dark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.09)',
              '&:hover': {
                backgroundColor: dark ? 'rgba(59, 130, 246, 0.20)' : 'rgba(37, 99, 235, 0.13)',
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: dark ? 'rgba(255,255,255,0.065)' : 'rgba(15,23,42,0.1)' },
          head: { color: dark ? '#89949f' : '#536071', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontSize: '0.78rem',
            fontWeight: 500,
            height: 28,
          },
          label: {
            paddingLeft: 10,
            paddingRight: 10,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 8,
            '&:hover': {
              backgroundColor: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(25, 55, 120, 0.06)',
            },
            '&.Mui-selected': {
              backgroundColor: dark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.10)',
              '&:hover': {
                backgroundColor: dark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(37, 99, 235, 0.14)',
              },
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            fontSize: '0.9rem',
            '& .MuiInputLabel-root': { color: dark ? '#d2dae1' : '#4b5563' },
            '& .MuiOutlinedInput-root': {
              backgroundColor: dark ? '#11161b' : '#ffffff',
              '& fieldset': { borderColor: dark ? 'rgba(226,232,240,.36)' : 'rgba(15,23,42,.22)' },
              '&:hover fieldset': { borderColor: dark ? 'rgba(226,232,240,.48)' : 'rgba(15,23,42,.38)' },
              '&.Mui-focused fieldset': { borderWidth: 2 },
            },
            '& .MuiFormHelperText-root': { color: dark ? '#aeb9c3' : '#596579' },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: '0.9rem',
          },
          icon: {
            color: dark ? '#a8b3c2' : '#4b5563',
          },
        },
      },
    },
  });
}
