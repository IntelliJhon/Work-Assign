import { useState, useContext, useEffect } from 'react';
import logo from '../assets/logo.png';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { ColorModeContext } from '../ColorModeContext';

const drawerWidth = 240;

function Layout(props) {
  const { window } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // 1. Read user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';

  // 2. Filter menu items based on role
  let menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Leave Management', icon: <EventNoteIcon />, path: '/leave' },
  ];

  if (position === 'admin') {
    menuItems.push({ text: 'Assign Work', icon: <AssignmentIcon />, path: '/assign' });
    menuItems.push({ text: 'Analytics', icon: <BarChartIcon />, path: '/analytics' });
  } else if (position === 'team-lead' || position === 'team lead') {
    menuItems.push({ text: 'Assign Work', icon: <AssignmentIcon />, path: '/assign' });
  }

  // 3. Route protection
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const path = location.pathname;
    const isDeveloper = position === 'developer';
    const isTeamLead = position === 'team-lead' || position === 'team lead';

    if (isDeveloper && (path === '/assign' || path === '/analytics')) {
      navigate('/dashboard');
    } else if (isTeamLead && path === '/analytics') {
      navigate('/dashboard');
    }
  }, [location.pathname, position, navigate, user]);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1 }}>
        <Box
          component="img"
          src={logo}
          sx={{ width: 32, height: 32, borderRadius: '20%' }}
          alt="Logo"
        />
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          IntelliJohn
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '20', // 20% opacity
                  borderRight: `4px solid ${theme.palette.primary.main}`,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: theme.palette.primary.main + '30',
                }
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? theme.palette.primary.main : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                  color: location.pathname === item.path ? theme.palette.primary.main : 'inherit'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ color: 'error.main', '&:hover': { backgroundColor: 'error.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } } }}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 'bold' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Logo in AppBar (visible on mobile only) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src={logo}
              sx={{ width: 28, height: 28, borderRadius: '20%' }}
              alt="Logo"
            />
            <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
              IntelliJohn
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />
          <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Tooltip title="Logout">
            <IconButton sx={{ ml: 1 }} onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: `1px solid ${theme.palette.divider}` },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 3 }, 
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, 
          maxWidth: { xs: '100vw', md: 'none' },
          overflowX: 'hidden',
          minHeight: '100vh', 
          bgcolor: 'background.default' 
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
