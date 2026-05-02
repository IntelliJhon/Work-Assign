import { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
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
