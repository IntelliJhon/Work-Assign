import { useState, useEffect } from 'react';
import { API_URL, EMPLOYEES } from '../config';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Paper,
  Divider,
  useTheme,
  InputAdornment,
  FilledInput,
  Stack
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import EventIcon from '@mui/icons-material/Event';
import TimerIcon from '@mui/icons-material/Timer';
import BusinessIcon from '@mui/icons-material/Business';

function AssignWork() {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    workName: '',
    employee: '',
    deadline: '',
    estTime: '',
    priority: 'Normal',
    workType: 'Chat Bot',
    comment: '',
    clientName: ''
  });

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';
  const isAdmin = position === 'admin';

  const [employeeList, setEmployeeList] = useState(isAdmin ? [] : EMPLOYEES);

  useEffect(() => {
    if (isAdmin) {
      // Admin assigns work ONLY to Team Leads
      fetch(`${API_URL}?action=teamlead`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.data) {
            const leadNames = data.data.map(lead => lead.name);
            setEmployeeList([...new Set(leadNames)]);
            if (leadNames.length > 0) {
              setFormData(prev => ({ ...prev, employee: leadNames[0] }));
            }
          }
        })
        .catch(err => console.error("Failed to fetch team leads:", err));
    } else {
      // Team Leads assign work ONLY to Developers (EMPLOYEES), handled by initial state
      if (EMPLOYEES.length > 0) {
        setFormData(prev => ({ ...prev, employee: EMPLOYEES[0] }));
      }
    }
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee) {
      setSnackbar({ open: true, message: 'Please select an employee.', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'assign',
        name: formData.employee,
        workName: formData.workName,
        workType: formData.workType,
        priority: formData.priority,
        deadline: formData.deadline,
        estTime: formData.estTime,
        comment: formData.comment,
        client: formData.clientName
      });

      await fetch(`${API_URL}?${params.toString()}`, { mode: 'no-cors' });

      setLoading(false);
      setSnackbar({ open: true, message: 'Work assignment sent successfully!', severity: 'success' });

      setFormData({
        workName: '',
        employee: '',
        deadline: '',
        estTime: '',
        priority: 'Normal',
        workType: 'Chat Bot',
        comment: '',
        clientName: ''
      });
    } catch (error) {
      setLoading(false);
      setSnackbar({ open: true, message: 'Failed to assign work.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, fontSize: { xs: '2rem', md: '3rem' } }}>
          Create New Task
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Assign a professional task to your team members with full details.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{
        maxWidth: 900,
        margin: '0 auto',
        borderRadius: 4,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
      }}>
        <form onSubmit={handleSubmit}>
          {/* Header Section */}
          <Box sx={{ p: 4, bgcolor: 'primary.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssignmentIcon fontSize="large" />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Assignment Details</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Define the scope and priority of the work.</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: 'auto' }}>
            <Stack spacing={4}>
              {/* Basic Info */}
              <Box>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                  Basic Information
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    required
                    fullWidth
                    label="Task Title"
                    name="workName"
                    value={formData.workName}
                    onChange={handleChange}
                    placeholder="Enter a descriptive title for the task"
                    variant="filled"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AssignmentIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    required
                    fullWidth
                    label="Client Name"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corp, John Doe"
                    variant="filled"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl fullWidth required variant="filled">
                    <InputLabel>Assign To</InputLabel>
                    <Select
                      name="employee"
                      value={formData.employee}
                      onChange={handleChange}
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) {
                          return <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                   <PersonIcon sx={{ mr: 1, color: 'transparent' }} />
                                 </Box>;
                        }
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                            {selected}
                          </Box>
                        );
                      }}
                    >
                      {employeeList.map(emp => (
                        <MenuItem key={emp} value={emp}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          {emp}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth required variant="filled">
                    <InputLabel>Work Category</InputLabel>
                    <Select
                      name="workType"
                      value={formData.workType}
                      onChange={handleChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {selected}
                        </Box>
                      )}
                    >
                      <MenuItem value="Chat Bot">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Chat Bot
                      </MenuItem>
                      <MenuItem value="Website">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Website
                      </MenuItem>
                      <MenuItem value="Payment Gateway">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Payment Gateway
                      </MenuItem>
                      <MenuItem value="Verification">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Verification
                      </MenuItem>
                      <MenuItem value="PDD">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        PDD
                      </MenuItem>
                      <MenuItem value="SDD">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        SDD
                      </MenuItem>
                      <MenuItem value="Client Meeting">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Client Meeting
                      </MenuItem>
                      <MenuItem value="Proposal">
                        <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Proposal
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>

              <Divider />

              {/* Schedule & Priority */}
              <Box>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                  Schedule & Priority
                </Typography>
                <Stack spacing={3}>
                  <FormControl fullWidth required variant="filled">
                    <InputLabel>Priority Level</InputLabel>
                    <Select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PriorityHighIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {selected}
                        </Box>
                      )}
                    >
                      <MenuItem value="Low">
                        <PriorityHighIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Low
                      </MenuItem>
                      <MenuItem value="Normal">
                        <PriorityHighIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Normal
                      </MenuItem>
                      <MenuItem value="High">
                        <PriorityHighIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        High
                      </MenuItem>
                      <MenuItem value="Urgent">
                        <PriorityHighIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        Urgent
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth required variant="filled">
                    <InputLabel shrink>Deadline</InputLabel>
                    <FilledInput
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                    />
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Est. Time"
                    name="estTime"
                    value={formData.estTime}
                    onChange={handleChange}
                    placeholder="e.g. 8h"
                    variant="filled"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TimerIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Box>

              {/* Submit */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  endIcon={<SendIcon />}
                  sx={{
                    py: 2,
                    px: 8,
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  {loading ? 'Processing...' : 'Confirm Assignment'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </form>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AssignWork;
