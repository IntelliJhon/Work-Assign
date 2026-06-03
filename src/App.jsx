import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, LinearProgress } from '@mui/material';
import { getDesignTokens } from './theme';
import { ColorModeContext } from './ColorModeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AssignWork from './pages/AssignWork';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import LeaveManagement from './pages/LeaveManagement';
import { createTheme } from '@mui/material/styles';

function App() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'light';
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // 1.5 seconds premium loading experience
    return () => clearTimeout(timer);
  }, []);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
    }),
    [],
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  if (loading) {
    return (
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc',
              zIndex: 9999,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3.5,
              }}
            >
              {/* Pulsing Logo */}
              <Box
                component="img"
                src="/logo.jpeg"
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '24%',
                  boxShadow: mode === 'dark' 
                    ? '0 0 35px rgba(59, 130, 246, 0.15)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.08)',
                  animation: 'pulse 1.8s infinite ease-in-out',
                }}
              />
              
              {/* Brand Label */}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 2,
                  color: mode === 'dark' ? 'primary.main' : 'text.primary',
                  fontFamily: '"Inter", sans-serif',
                }}
              >
                FINBOOK GLOBAL
              </Typography>
              
              {/* Premium Progress */}
              <Box sx={{ width: 160, borderRadius: 4, overflow: 'hidden' }}>
                <LinearProgress sx={{ height: 3, borderRadius: 1.5 }} />
              </Box>
            </Box>
            
            <style>{`
              @keyframes pulse {
                0% { transform: scale(0.96); opacity: 0.85; }
                50% { transform: scale(1.04); opacity: 1; }
                100% { transform: scale(0.96); opacity: 0.85; }
              }
            `}</style>
          </Box>
        </ThemeProvider>
      </ColorModeContext.Provider>
    );
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assign" element={<AssignWork />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/leave" element={<LeaveManagement />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
