import { createTheme } from '@mui/material/styles';

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // palette values for light mode
          primary: {
            main: '#3b82f6',
          },
          secondary: {
            main: '#a855f7',
          },
          background: {
            default: '#f8fafc',
            paper: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#64748b',
          },
          success: {
            main: '#10b981',
          },
          warning: {
            main: '#f59e0b',
          },
          error: {
            main: '#ef4444',
          },
          divider: '#e2e8f0',
        }
      : {
          // palette values for dark mode
          primary: {
            main: '#60a5fa',
          },
          secondary: {
            main: '#c084fc',
          },
          background: {
            default: '#0f172a',
            paper: '#1e293b',
          },
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
          },
          success: {
            main: '#34d399',
          },
          warning: {
            main: '#fbbf24',
          },
          error: {
            main: '#f87171',
          },
          divider: '#334155',
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'light' 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          border: `1px solid ${mode === 'light' ? '#e2e8f0' : '#334155'}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});
