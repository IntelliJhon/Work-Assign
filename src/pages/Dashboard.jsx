import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { API_URL, GlobalCache } from '../config';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
  InputAdornment,
  IconButton,
  Paper,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CommentIcon from '@mui/icons-material/Comment';
import RefreshIcon from '@mui/icons-material/Refresh';
import BusinessIcon from '@mui/icons-material/Business';
import TimerIcon from '@mui/icons-material/Timer';
import EditIcon from '@mui/icons-material/Edit';

import { taskService } from '../services/taskService';
import UpdateTaskModal from '../components/UpdateTaskModal';

function Dashboard() {
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';
  const isTaskAssigner = position === 'director' || position === 'team-lead' || position === 'team lead';

  const [employee, setEmployee] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [employeeList, setEmployeeList] = useState(user?.name ? [user.name] : []);

  // Task Update States
  const [selectedTask, setSelectedTask] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Fetch employees dynamically for the dropdown
  useEffect(() => {
    if (isTaskAssigner) {
      fetch(`${API_URL}?action=employees`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.data) {
            let filtered = [];
            if (position === 'director') {
              // Director sees all non-Director employees (Team Leads, HR, Associates)
              filtered = data.data
                .filter(emp => emp.position && emp.position.toLowerCase() !== 'director')
                .map(emp => emp.name);
            } else {
              // Team Lead sees Associates and themselves
              filtered = data.data
                .filter(emp => 
                  (emp.position && emp.position.toLowerCase().includes('associate')) || 
                  emp.name === user?.name
                )
                .map(emp => emp.name);
            }
            const uniqueList = [...new Set(filtered)];
            setEmployeeList(uniqueList);
            
            // Set initial selected employee
            if (uniqueList.length > 0) {
              if (user?.name && uniqueList.includes(user.name)) {
                setEmployee(user.name);
              } else {
                setEmployee(uniqueList[0]);
              }
            }
          }
        })
        .catch(err => console.error("Failed to fetch employees:", err));
    }
  }, [isTaskAssigner, position, user?.name]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");



  useEffect(() => {
    fetchTasks(employee);
  }, [employee]);

  const fetchTasks = async (name) => {
    if (GlobalCache[name]) {
      const localUpdates = taskService.getLocalUpdates();
      const mergedCached = GlobalCache[name].map(t => {
        const up = localUpdates[t.taskId];
        return up ? { ...t, ...up } : t;
      });
      setTasks(mergedCached);
    } else {
      setLoading(true);
    }
    
    try {
      const mergedTasks = await taskService.getMergedTasks(name);
      GlobalCache[name] = mergedTasks;
      setTasks(mergedTasks);
    } catch (err) {
      console.error("Fetch error:", err);
      if (!GlobalCache[name]) setTasks([]);
    }
    setLoading(false);
  };

  const handleUpdateSubmit = async (updateData) => {
    setIsSubmittingUpdate(true);
    try {
      const result = await taskService.updateTask(
        updateData.taskId,
        updateData.employeeName,
        updateData.status,
        updateData.actualTime,
        updateData.comment
      );
      
      if (result.status === 'success') {
        setToast({
          open: true,
          message: result.message,
          severity: result.apiSuccess ? 'success' : 'info'
        });
        setIsUpdateModalOpen(false);
        fetchTasks(employee);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        message: err.message || 'Failed to update task progress',
        severity: 'error'
      });
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Filter and Sort tasks based on search and status
  const filteredTasks = useMemo(() => {
    const statusPriority = {
      'Pending': 1,
      'In_Progress': 2,
      'Completed': 3
    };

    return [...tasks]
      .filter(task => {
        const matchesSearch = task.workName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.taskId?.toString().includes(searchQuery);
        const matchesStatus = filterStatus === "All" || task.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const pA = statusPriority[a.status] || 99;
        const pB = statusPriority[b.status] || 99;
        
        // First sort by status
        if (pA !== pB) return pA - pB;
        
        // Then sort by date (earliest first, putting today/overdue at the top)
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        
        return dateA - dateB;
      });
  }, [tasks, searchQuery, filterStatus]);

  // Derived KPIs
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "In_Progress").length;
  const pendingTasks = totalTasks - completedTasks - inProgressTasks;

  const KPICard = ({ title, value, color }) => (
    <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="h3" component="div" sx={{ color: color, fontWeight: 'bold' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Dashboard Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={() => fetchTasks(employee)} color="primary" sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
            <RefreshIcon />
          </IconButton>
          {isTaskAssigner && (
            <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
              <InputLabel>Employee</InputLabel>
              <Select
                value={employee}
                label="Employee"
                onChange={(e) => setEmployee(e.target.value)}
                sx={{ bgcolor: 'background.paper' }}
              >
                {employeeList.map(emp => (
                  <MenuItem key={emp} value={emp}>{emp}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 2, sm: 3 }, mb: 4 }}>
        {[
          { title: 'Total Assigned', value: totalTasks, color: theme.palette.primary.main, gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
          { title: 'Completed', value: completedTasks, color: theme.palette.success.main, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
          { title: 'In Progress', value: inProgressTasks, color: theme.palette.secondary.main, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
          { title: 'Pending', value: pendingTasks, color: theme.palette.warning.main, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }
        ].map((kpi, idx) => (
          <Card key={idx} sx={{ 
            width: '100%',
            height: '100%', 
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 30px rgba(0,0,0,0.15)' },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0, right: 0, width: '30%', height: '100%',
              background: kpi.gradient,
              opacity: 0.1,
              clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)'
            }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                {kpi.title}
              </Typography>
              <Typography variant="h3" sx={{ color: kpi.color, fontWeight: 800, fontSize: { xs: '2rem', sm: '3rem' } }}>
                {kpi.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters Box */}
      <Paper sx={{ p: 2, mb: 4, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search tasks by name or ID..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '300px' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="In_Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Task Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {filteredTasks.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Card sx={{ p: 5, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: 'divider', bgcolor: 'transparent', boxShadow: 'none' }}>
                <Typography variant="h6" color="textPrimary" gutterBottom>
                  No tasks found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  There are no tasks matching your current filters.
                </Typography>
              </Card>
            </Box>
          ) : (
            filteredTasks.map((t, i) => {
              const priorityLower = t.priority?.toLowerCase() || 'normal';
              let priorityColor = 'primary';
              if (priorityLower === 'high' || priorityLower === 'urgent') priorityColor = 'error';
              if (priorityLower === 'medium') priorityColor = 'warning';

              const isOverdue = t.status !== 'Completed' && t.deadline && dayjs(t.deadline).isBefore(dayjs(), 'day');
              const isToday = t.status !== 'Completed' && t.deadline && dayjs(t.deadline).isSame(dayjs(), 'day');

              return (
                <Box key={i} sx={{ display: 'flex' }}>
                  <Card className={(isOverdue || isToday) ? 'blink-overdue' : ''} sx={{ 
                    width: '100%',
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                      borderColor: theme.palette[priorityColor].main
                    },
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <Box sx={{ height: 6, bgcolor: theme.palette[priorityColor].main }} />
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: theme.palette[priorityColor].main, fontWeight: 800, letterSpacing: 0.5 }}>
                            #{t.taskId}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                            {t.workName}
                          </Typography>
                        </Box>
                        {isOverdue && (
                          <Chip label="OVERDUE" size="small" color="error" sx={{ fontWeight: 'bold', animation: 'pulse 1.5s infinite' }} />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: isOverdue || isToday ? 'error.main' : 'text.secondary' }}>
                          <CalendarMonthIcon fontSize="small" />
                          <Typography variant="body2" sx={{ fontWeight: isOverdue || isToday ? 600 : 400 }}>
                            {t.deadline ? dayjs(t.deadline).format('DD/MM/YYYY') : 'No deadline'}
                            {isToday && " (Today)"}
                          </Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                              <AccessTimeIcon fontSize="small" />
                              <Typography variant="body2">Est: {t.estTime || 'N/A'}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                              <TimerIcon fontSize="small" />
                              <Typography variant="body2">Act: {t.actualTime || t['Actual Time'] || 'N/A'}</Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', mt: 1 }}>
                          <BusinessIcon fontSize="small" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Client: {t.client || 'N/A'}</Typography>
                        </Box>
                        {t.comment && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 1.5, 
                            mt: 1, 
                            p: 2, 
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', 
                            borderRadius: 2,
                            borderLeft: `3px solid ${theme.palette.divider}`
                          }}>
                            <CommentIcon fontSize="small" sx={{ color: 'text.disabled', mt: 0.3 }} />
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                              {t.comment}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label={t.workType} size="small" variant="filled" sx={{ bgcolor: 'action.selected', fontWeight: 600 }} />
                          {t.recurrenceType && t.recurrenceType !== 'None' && (
                            <Chip 
                              label={`${t.recurrenceType} Recurring`} 
                              size="small" 
                              color="primary"
                              variant="outlined" 
                              sx={{ fontWeight: 800 }} 
                            />
                          )}
                        </Box>
                        
                        <Chip 
                          icon={
                            t.status === 'Completed' ? <CheckCircleIcon style={{ color: 'inherit' }} /> : 
                            t.status === 'In_Progress' ? <AutorenewIcon style={{ color: 'inherit' }} /> : 
                            <PendingIcon style={{ color: 'inherit' }} />
                          }
                          label={t.status === 'In_Progress' ? 'In Progress' : t.status} 
                          size="small"
                          color={
                            t.status === 'Completed' ? 'success' : 
                            t.status === 'In_Progress' ? 'secondary' : 'default'
                          }
                          sx={{ fontWeight: 800, borderRadius: 1 }}
                        />
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          fullWidth 
                          variant="outlined" 
                          color="primary" 
                          startIcon={<EditIcon />}
                          onClick={() => {
                            setSelectedTask({ ...t, employeeName: employee });
                            setIsUpdateModalOpen(true);
                          }}
                          sx={{ borderRadius: 2 }}
                        >
                          Update Progress
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            })
          )}
        </Box>
      )}

      {/* Update Progress Modal */}
      <UpdateTaskModal
        task={selectedTask}
        open={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onSubmit={handleUpdateSubmit}
        isSubmitting={isSubmittingUpdate}
      />

      {/* Toast notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
          severity={toast.severity} 
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
