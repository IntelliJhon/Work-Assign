import { useState, useContext, useEffect, useRef } from 'react';
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
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge, Popover, ListItemAvatar, Avatar, Button } from '@mui/material';
import { ColorModeContext } from '../ColorModeContext';
import { API_URL } from '../config';
import { taskService } from '../services/taskService';
import dayjs from 'dayjs';

const drawerWidth = 240;

function Layout(props) {
  const { window } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const prevUnreadCountRef = useRef(0);

  // 1. Read user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // Premium Web Audio API notification synth sound (soft harmonious chime)
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // Tone 1: Soft Bell (G5 Note)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, now); // G5 note
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // Ramp to C6
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: Harmonious Ring (E6 Note)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.08); // E6 note
      osc2.frequency.exponentialRampToValueAtTime(1568, now + 0.22); // Ramp to G6
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn("Failed to play chime: ", e);
    }
  };

  // Unified Notification Fetching function
  const fetchNotifications = async () => {
    if (!user?.name) return;
    try {
      const res = await fetch(`${API_URL}?action=getnotifications&name=${user.name}`);
      const data = await res.json();
      
      if (data.status === 'success' && Array.isArray(data.data)) {
        setNotifications(data.data);
        const unread = data.data.filter(n => n.status === 'Unread').length;
        setUnreadCount(unread);
        
        // Play soft chime sound if unread count increases (excluding first loading baseline)
        if (unread > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
          playNotificationSound();
        }
        prevUnreadCountRef.current = unread;
        return; // Success! Skip local diff fallback
      }
    } catch (e) {
      console.warn("Spreadsheet notifications not available or not configured yet. Falling back to local offline task diffing...");
    }

    // ==========================================
    // 💡 OFFLINE FALLBACK ENGINE
    // ==========================================
    try {
      const mergedTasks = await taskService.getMergedTasks(user.name);
      
      const seenStr = localStorage.getItem(`seen_tasks_${user.name}`);
      let seenIds = [];
      try {
        seenIds = seenStr ? JSON.parse(seenStr) : [];
      } catch (e) {}

      const localNotifs = [];
      mergedTasks.forEach(task => {
        if (!seenIds.includes(task.taskId)) {
          const timestamp = task.createdAt || new Date().toISOString();
          localNotifs.push({
            id: task.taskId,
            employeeName: user.name,
            title: "New Task Assigned",
            message: `Task "${task.workName || 'Unnamed Task'}" has been assigned to you. Deadline: ${task.deadline || 'No Deadline'}`,
            status: "Unread",
            timestamp: timestamp
          });
        }
      });

      localNotifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setNotifications(localNotifs);
      setUnreadCount(localNotifs.length);

      // Play soft chime sound if local unread count increases (excluding first loading baseline)
      if (localNotifs.length > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
        playNotificationSound();
      }
      prevUnreadCountRef.current = localNotifs.length;
    } catch (err) {
      console.error("Local notification diff failed: ", err);
    }
  };

  const handleMarkAsRead = async (notif) => {
    // 1. Try to send update to server
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'readnotification',
          notificationId: notif.id,
          employeeName: user.name
        })
      });
    } catch (e) {
      console.warn("Server marking read failed, applying client fallback");
    }

    // 2. Local fallback update
    const seenStr = localStorage.getItem(`seen_tasks_${user.name}`);
    let seenIds = [];
    try {
      seenIds = seenStr ? JSON.parse(seenStr) : [];
    } catch (e) {}
    
    if (!seenIds.includes(notif.id)) {
      seenIds.push(notif.id);
      localStorage.setItem(`seen_tasks_${user.name}`, JSON.stringify(seenIds));
    }

    fetchNotifications();
    navigate('/dashboard');
  };

  const handleMarkAllAsRead = async () => {
    // 1. Try to send mark all to server
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'readnotification',
          all: true,
          employeeName: user.name
        })
      });
    } catch (e) {
      console.warn("Server marking all read failed, applying client fallback");
    }

    // 2. Local fallback update
    const seenStr = localStorage.getItem(`seen_tasks_${user.name}`);
    let seenIds = [];
    try {
      seenIds = seenStr ? JSON.parse(seenStr) : [];
    } catch (e) {}

    notifications.forEach(notif => {
      if (!seenIds.includes(notif.id)) {
        seenIds.push(notif.id);
      }
    });

    localStorage.setItem(`seen_tasks_${user.name}`, JSON.stringify(seenIds));
    fetchNotifications();
  };

  // Poll for notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.name]);

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
          src="/logo.png"
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
              src="/logo.png"
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

          {/* Notification Bell Popover UI */}
          <IconButton
            sx={{ ml: 1 }}
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Popover
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                width: 360,
                maxHeight: 480,
                borderRadius: 4,
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                mt: 1.5,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
              },
            }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Button 
                  size="small" 
                  onClick={handleMarkAllAsRead} 
                  sx={{ fontWeight: 'bold', textTransform: 'none' }}
                >
                  Mark all as read
                </Button>
              )}
            </Box>
            
            <List sx={{ p: 0, overflowY: 'auto', maxHeight: 380 }}>
              {notifications.length === 0 ? (
                <Box sx={{ py: 6, px: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    All caught up! No new notifications.
                  </Typography>
                </Box>
              ) : (
                notifications.map((notif) => (
                  <Box key={notif.id}>
                    <ListItemButton
                      onClick={() => {
                        handleMarkAsRead(notif);
                        setAnchorEl(null);
                      }}
                      sx={{
                        py: 1.5,
                        px: 2.5,
                        alignItems: 'flex-start',
                        bgcolor: notif.status === 'Unread' ? theme.palette.primary.main + '05' : 'transparent',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: notif.status === 'Unread' ? theme.palette.primary.main + '0a' : theme.palette.action.hover,
                        }
                      }}
                    >
                      <ListItemAvatar sx={{ mt: 0.5, minWidth: 44 }}>
                        <Avatar sx={{ bgcolor: notif.status === 'Unread' ? 'primary.main' : 'action.disabledBackground', width: 34, height: 34 }}>
                          <AssignmentIcon sx={{ fontSize: 18, color: notif.status === 'Unread' ? 'white' : 'text.secondary' }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={notif.title}
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', fontWeight: notif.status === 'Unread' ? 600 : 400 }}>
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                              {dayjs(notif.timestamp).format('MMM D, h:mm A')}
                            </Typography>
                          </Box>
                        }
                        primaryTypographyProps={{
                          variant: 'subtitle2',
                          fontWeight: notif.status === 'Unread' ? 800 : 600,
                          color: notif.status === 'Unread' ? 'primary.main' : 'text.primary',
                        }}
                      />
                      {notif.status === 'Unread' && (
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          mt: 1.5, 
                          ml: 1 
                        }} />
                      )}
                    </ListItemButton>
                    <Divider sx={{ opacity: 0.6 }} />
                  </Box>
                ))
              )}
            </List>
          </Popover>

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
