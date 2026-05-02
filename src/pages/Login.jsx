import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Container,
  Snackbar,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { keyframes } from '@emotion/react';

const gradientBg = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
  100% { transform: translateY(0px); }
`;

const API_URL = 'https://script.google.com/macros/s/AKfycby5GPq5gVEvU0wtUPrUP5na6th57DEhSDF1jFdLN0grXej9E4vEGYfI7FAhNjezJzPI/exec';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const navigate = useNavigate();

  // Bonus: Auto-redirect if already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const validateEmail = (email) => {
    // Basic email validation regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = validateEmail(email) && password.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) return;

    setLoading(true);
    setError('');

    try {
      // Sometimes Google Apps Script has CORS preflight issues with application/json.
      // However, sticking strictly to the requested headers.
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'login',
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify({ email, ...data.user }));
        // Redirect to "/dashboard"
        navigate('/dashboard');
      } else {
        // If response.status === "error", show error message below input
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setError('An error occurred while connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (e) => e.preventDefault();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(-45deg, #1976d2, #9c27b0, #009688, #3f51b5)',
        backgroundSize: '400% 400%',
        animation: `${gradientBg} 15s ease infinite`,
        p: 2,
      }}
    >
      <Container maxWidth="md">
        <Card
          elevation={12}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            borderRadius: 4,
            overflow: 'hidden',
            animation: `${fadeIn} 0.8s ease-out forwards`,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Left Side: Branding / Welcome message */}
          <Box
            sx={{
              width: { xs: '100%', md: '45%' },
              p: { xs: 3, sm: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: { xs: 'center', md: 'flex-start' },
              textAlign: { xs: 'center', md: 'left' },
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.9), rgba(156, 39, 176, 0.9))',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                p: { xs: 1.5, md: 2 },
                mb: { xs: 1.5, md: 3 },
                animation: `${float} 4s ease-in-out infinite`,
                backdropFilter: 'blur(10px)',
                display: { xs: 'none', sm: 'flex' } // Hide icon on extra small screens to save vertical space
              }}
            >
              <LoginIcon fontSize="large" sx={{ color: 'white' }} />
            </Box>
            <Typography variant="h3" fontWeight="900" gutterBottom sx={{ fontSize: { xs: '2rem', md: '3rem' }, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              Welcome to IntelliJohn
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, lineHeight: 1.5, fontWeight: 300, fontSize: { xs: '1rem', md: '1.25rem' } }}>
              Your complete solution for managing tasks efficiently.
            </Typography>
            
            {/* Decorative background circle */}
            <Box
              sx={{
                position: 'absolute',
                top: '-20%',
                right: '-20%',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                filter: 'blur(40px)',
              }}
            />
          </Box>

          {/* Right Side: Login Form */}
          <Box
            sx={{
              width: { xs: '100%', md: '55%' },
              p: { xs: 4, sm: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box mb={4}>
              <Typography component="h2" variant="h4" fontWeight="bold" color="text.primary">
                Sign In
              </Typography>
              <Typography variant="body1" color="text.secondary" mt={1}>
                Enter your credentials to access your account
              </Typography>
            </Box>

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email.length > 0 && !validateEmail(email)}
                helperText={email.length > 0 && !validateEmail(email) ? 'Please enter a valid email' : ''}
                disabled={loading}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&.Mui-focused fieldset': {
                      borderWidth: '2px',
                    },
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="text"
                id="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                variant="outlined"
                sx={{
                  mt: 2,
                  mb: 1,
                  '& input': {
                    WebkitTextSecurity: showPassword ? 'none' : 'disc',
                  },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&.Mui-focused fieldset': {
                      borderWidth: '2px',
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={!isFormValid || loading}
                sx={{
                  mt: 4,
                  mb: 2,
                  py: 1.8,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)',
                  boxShadow: '0 4px 10px rgba(156, 39, 176, 0.3)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 15px rgba(156, 39, 176, 0.4)',
                  },
                  '&.Mui-disabled': {
                    background: 'rgba(0, 0, 0, 0.12)',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Button 
                    variant="text" 
                    onClick={() => setSnackbarOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 'bold', px: 1, color: '#9c27b0' }}
                  >
                    Sign Up
                  </Button>
                </Typography>
              </Box>
            </form>
          </Box>
        </Card>
      </Container>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}>
          Please contact the administrator to create an account.
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError('')} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%', borderRadius: 2, boxShadow: 4, fontWeight: 'bold' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
