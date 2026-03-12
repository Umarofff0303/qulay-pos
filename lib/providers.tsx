'use client';

import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useAppSettingsStore } from './store';

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

const createAppTheme = (mode: 'light' | 'dark', compactMode: boolean) => {
  const isDark = mode === 'dark';
  const primaryMain = isDark ? '#6cb4ff' : '#1570ef';
  const secondaryMain = isDark ? '#f7b267' : '#f97316';
  const successMain = isDark ? '#5dd39e' : '#16a34a';
  const warningMain = isDark ? '#ffd166' : '#f59e0b';
  const errorMain = isDark ? '#ff7a7a' : '#ef4444';
  const backgroundDefault = isDark ? '#09111f' : '#eef4fb';
  const backgroundPaper = isDark ? '#101a2c' : '#ffffff';
  const borderColor = isDark ? alpha('#9eb6d8', 0.12) : alpha('#0f172a', 0.08);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
      },
      secondary: {
        main: secondaryMain,
      },
      success: {
        main: successMain,
      },
      warning: {
        main: warningMain,
      },
      error: {
        main: errorMain,
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      divider: borderColor,
      text: {
        primary: isDark ? '#edf3ff' : '#10233f',
        secondary: isDark ? '#9fb0cc' : '#5f708c',
      },
    },
    typography: {
      fontFamily: plusJakartaSans.style.fontFamily,
      h1: {
        fontSize: '2.9rem',
        fontWeight: 800,
        letterSpacing: '-0.04em',
      },
      h2: {
        fontSize: '2.2rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
      },
      h3: {
        fontSize: '1.8rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontSize: '1.45rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontSize: '1.15rem',
        fontWeight: 700,
      },
      h6: {
        fontSize: '0.98rem',
        fontWeight: 700,
      },
      body1: {
        fontSize: '0.98rem',
        lineHeight: 1.65,
      },
      body2: {
        fontSize: '0.88rem',
        lineHeight: 1.6,
      },
      button: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
    },
    shape: {
      borderRadius: compactMode ? 14 : 18,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(circle at top, rgba(108, 180, 255, 0.18), transparent 26%), linear-gradient(180deg, #09111f 0%, #0d1525 100%)'
              : 'radial-gradient(circle at top, rgba(21, 112, 239, 0.10), transparent 24%), linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%)',
            minHeight: '100vh',
          },
          '::selection': {
            backgroundColor: alpha(primaryMain, 0.35),
          },
          '*::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(isDark ? '#dce9ff' : '#1d4ed8', 0.26),
            borderRadius: 999,
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: alpha(isDark ? '#08101c' : '#dbe6f4', 0.45),
          },
        },
      },
      MuiButton: {
        defaultProps: {
          size: compactMode ? 'small' : 'medium',
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 14,
            padding: compactMode ? '8px 14px' : '10px 16px',
          },
          contained: {
            background: `linear-gradient(135deg, ${primaryMain} 0%, ${alpha(primaryMain, 0.76)} 100%)`,
            boxShadow: isDark
              ? '0 14px 30px rgba(0, 0, 0, 0.34)'
              : '0 14px 28px rgba(21, 112, 239, 0.18)',
          },
          outlined: {
            borderColor: alpha(primaryMain, 0.24),
            backgroundColor: alpha(isDark ? '#101a2c' : '#ffffff', 0.8),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
              ? '0 24px 50px rgba(2, 8, 23, 0.42)'
              : '0 24px 48px rgba(15, 23, 42, 0.08)',
            backgroundImage: isDark
              ? 'linear-gradient(180deg, rgba(16, 26, 44, 0.95) 0%, rgba(12, 20, 35, 0.94) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 0.98) 100%)',
            backdropFilter: 'blur(14px)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? 'linear-gradient(90deg, rgba(9, 17, 31, 0.92) 0%, rgba(16, 26, 44, 0.88) 100%)'
              : 'linear-gradient(90deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 250, 255, 0.88) 100%)',
            backdropFilter: 'blur(18px)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: isDark
              ? 'linear-gradient(180deg, rgba(8, 15, 27, 0.98) 0%, rgba(10, 18, 32, 0.98) 100%)'
              : 'linear-gradient(180deg, rgba(252, 254, 255, 0.98) 0%, rgba(243, 248, 255, 0.98) 100%)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: compactMode ? 'small' : 'medium',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 14,
              backgroundColor: alpha(isDark ? '#0b1322' : '#ffffff', 0.72),
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            padding: 10,
          },
          thumb: {
            boxShadow: 'none',
          },
          track: {
            borderRadius: 999,
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${borderColor}`,
            borderRadius: 18,
            backgroundColor: alpha(backgroundPaper, isDark ? 0.86 : 0.92),
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: alpha(primaryMain, isDark ? 0.16 : 0.08),
              borderBottom: `1px solid ${borderColor}`,
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${alpha(borderColor, 0.9)}`,
            },
          },
        },
      },
    },
  });
};

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const compactMode = useAppSettingsStore((state) => state.compactMode);
  const theme = createAppTheme(themeMode, compactMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
