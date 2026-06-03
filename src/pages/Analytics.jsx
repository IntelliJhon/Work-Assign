import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  useTheme,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Stack,
  IconButton,
  Tooltip as MuiTooltip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';

import { API_URL, EMPLOYEES } from '../config';
import { taskService } from '../services/taskService';

dayjs.extend(isBetween);

function Analytics() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState([]);
  const [allEmployees, setAllEmployees] = useState(EMPLOYEES);
  
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';
  const currentUserName = user?.name || '';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all employees dynamically from database
      const empRes = await fetch(`${API_URL}?action=employees`);
      const empData = await empRes.json();
      
      let fullEmployeeList = [];
      if (empData.status === 'success' && empData.data) {
        if (position === 'director') {
          // Director sees all non-Director employees (Team Leads, HR, Associates)
          fullEmployeeList = empData.data
            .filter(emp => emp.position && emp.position.toLowerCase() !== 'director')
            .map(emp => emp.name);
        } else if (position === 'team-lead' || position === 'team lead') {
          // Team Lead sees Associates and themselves
          fullEmployeeList = empData.data
            .filter(emp => 
              (emp.position && emp.position.toLowerCase().includes('associate')) || 
              emp.name === currentUserName
            )
            .map(emp => emp.name);
        } else if (position === 'associate') {
          // Associate sees only themselves
          fullEmployeeList = [currentUserName];
        } else {
          // Fallback: all non-director employees
          fullEmployeeList = empData.data
            .filter(emp => emp.position && emp.position.toLowerCase() !== 'director')
            .map(emp => emp.name);
        }
      }
      
      fullEmployeeList = [...new Set(fullEmployeeList)].filter(Boolean);
      
      if (fullEmployeeList.length === 0) {
        fullEmployeeList = [...EMPLOYEES];
      }
      setAllEmployees(fullEmployeeList);

      // Fetch tasks for everyone using taskService to leverage local caching and merges
      const promises = fullEmployeeList.map(async (name) => {
        try {
          const mergedTasks = await taskService.getMergedTasks(name);
          return mergedTasks.map(task => ({
            ...task,
            employeeName: name
          }));
        } catch (e) {
          console.error(`Error fetching tasks for ${name}:`, e);
          return [];
        }
      });
      
      const results = await Promise.all(promises);
      let combinedTasks = [];
      results.forEach(tasks => {
        combinedTasks = [...combinedTasks, ...tasks];
      });
      
      setAllTasks(combinedTasks);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    }
    setLoading(false);
  };

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (dateFilter === 'all') return true;
      const taskDate = dayjs(task.deadline || task.timestamp); 
      if (!taskDate.isValid()) return true;

      if (dateFilter === 'today') return taskDate.isSame(dayjs(), 'day');
      if (dateFilter === 'week') return taskDate.isAfter(dayjs().subtract(7, 'day'));
      if (dateFilter === 'month') return taskDate.isAfter(dayjs().subtract(1, 'month'));
      if (dateFilter === 'custom') {
        return taskDate.isBetween(dayjs(startDate), dayjs(endDate), 'day', '[]');
      }
      return true;
    });
  }, [allTasks, dateFilter, startDate, endDate]);

  const employeePerformance = useMemo(() => {
    return allEmployees.map(name => {
      const empTasks = filteredTasks.filter(t => t.employeeName === name);
      const completed = empTasks.filter(t => t.status === 'Completed').length;
      const pending = empTasks.filter(t => t.status === 'Pending').length;
      const inProgress = empTasks.filter(t => t.status === 'In_Progress' || t.status === 'In Progress').length;
      const totalHours = empTasks.reduce((sum, t) => sum + (parseFloat(t.estTime) || 0), 0);
      return { name, completed, pending, inProgress, totalTasks: empTasks.length, totalHours };
    });
  }, [filteredTasks]);

  const taskTypeData = useMemo(() => {
    const types = {};
    filteredTasks.forEach(t => { types[t.workType] = (types[t.workType] || 0) + 1; });
    return Object.keys(types).map(name => ({ name, value: types[name] }));
  }, [filteredTasks]);

  const VIBRANT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  const CustomKPICard = ({ title, value, icon, color, gradient }) => (
    <Paper sx={{ 
      p: 3, 
      borderRadius: 4, 
      background: gradient, 
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 10px 30px ${color}44`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, opacity: 0.9 }}>{title}</Typography>
        {icon}
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 800 }}>{value}</Typography>
      <Box sx={{ 
        position: 'absolute', 
        right: -20, 
        bottom: -20, 
        opacity: 0.1, 
        transform: 'scale(4)' 
      }}>
        {icon}
      </Box>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="textSecondary">Generating Insights...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ mb: 4, textAlign: 'center', px: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, fontSize: { xs: '2rem', md: '3rem' } }}>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Real-time performance metrics and workload distribution.
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(200px, 1fr))' }, gap: 3, alignItems: 'center' }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Date Context</InputLabel>
            <Select
              value={dateFilter}
              label="Date Context"
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Records</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>
          {dateFilter === 'custom' && (
            <>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
        </Box>
      </Paper>

      {/* KPI Section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 2, sm: 3 }, mb: 6 }}>
        <CustomKPICard 
          title="Active Tasks" 
          value={filteredTasks.length} 
          icon={<TrendingUpIcon fontSize="large" />}
          color="#3b82f6"
          gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
        />
        <CustomKPICard 
          title="Completed" 
          value={filteredTasks.filter(t => t.status === 'Completed').length} 
          icon={<CheckCircleIcon fontSize="large" />}
          color="#10b981"
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
        />
        <CustomKPICard 
          title="Billable Hours" 
          value={`${filteredTasks.reduce((sum, t) => sum + (parseFloat(t.estTime) || 0), 0)}h`} 
          icon={<ScheduleIcon fontSize="large" />}
          color="#8b5cf6"
          gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
        />
        <CustomKPICard 
          title="Success Rate" 
          value={`${filteredTasks.length ? Math.round((filteredTasks.filter(t => t.status === 'Completed').length / filteredTasks.length) * 100) : 0}%`} 
          icon={<HourglassEmptyIcon fontSize="large" />}
          color="#ec4899"
          gradient="linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
        />
      </Box>

      {/* Main Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 4 }}>
        <Box>
          <Paper sx={{ p: 4, borderRadius: 5, border: `1px solid ${theme.palette.divider}`, minHeight: 450 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Workload & Completion by Employee</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={employeePerformance} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: 12, 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    background: theme.palette.background.paper 
                  }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', bottom: 0 }} />
                <Bar dataKey="completed" name="Completed Tasks" fill="#10b981" radius={[10, 10, 0, 0]} maxBarSize={40} />
                <Bar dataKey="inProgress" name="In Progress" fill="#3b82f6" radius={[10, 10, 0, 0]} maxBarSize={40} />
                <Bar dataKey="pending" name="Pending Tasks" fill="#f59e0b" radius={[10, 10, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 4, borderRadius: 5, border: `1px solid ${theme.palette.divider}`, minHeight: 450 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Category Distribution</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={taskTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {taskTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box sx={{ gridColumn: '1 / -1' }}>
          <Paper sx={{ p: 4, borderRadius: 5, border: `1px solid ${theme.palette.divider}`, minHeight: 400 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Total Effort (Man-Hours) per Employee</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={employeePerformance} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <Tooltip />
                <Area type="monotone" dataKey="totalHours" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default Analytics;
