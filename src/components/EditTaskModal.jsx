import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Grid,
  Box,
  InputAdornment,
  useTheme,
  FilledInput
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import TimerIcon from '@mui/icons-material/Timer';
import { API_URL } from '../config';

const EditTaskModal = ({ task, open, onClose, onSubmit, isSubmitting }) => {
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    workName: '',
    client: '',
    newEmployeeName: '',
    workType: '',
    priority: 'Normal',
    deadline: '',
    estTime: ''
  });

  const [employeeList, setEmployeeList] = useState([]);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';
  const isDirector = position === 'director';

  // Fetch employees list
  useEffect(() => {
    if (open) {
      fetch(`${API_URL}?action=employees`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.data) {
            let list = [];
            if (isDirector) {
              list = data.data
                .filter(emp => emp.position && emp.position.toLowerCase() !== 'director')
                .map(emp => emp.name);
            } else {
              list = data.data
                .filter(emp => emp.position && emp.position.toLowerCase().includes('associate'))
                .map(emp => emp.name);
            }
            setEmployeeList([...new Set(list)]);
          }
        })
        .catch(err => console.error("Failed to fetch employees for editing:", err));
    }
  }, [open, isDirector]);

  // Load task data
  useEffect(() => {
    if (task) {
      setFormData({
        workName: task.workName || '',
        client: task.client || '',
        newEmployeeName: task.employeeName || '',
        workType: task.workType || '',
        priority: task.priority || 'Normal',
        deadline: task.deadline || '',
        estTime: task.estTime || ''
      });
    }
  }, [task, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      taskId: task.taskId,
      employeeName: task.employeeName, // original employee name
      ...formData
    });
  };

  if (!task) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth 
      PaperProps={{ 
        sx: { 
          borderRadius: 4,
          backgroundImage: theme.palette.mode === 'dark' 
            ? 'linear-gradient(to bottom, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))' 
            : 'linear-gradient(to bottom, #ffffff, #f8fafc)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        } 
      }}
    >
      <DialogTitle sx={{ m: 0, p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 0.5, letterSpacing: 1, textTransform: 'uppercase' }}>
            Edit Assigned Task
          </Typography>
          <Typography variant="h5" component="div" sx={{ fontWeight: 800 }}>
            {task.workName || 'Edit Task'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {task.taskId}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 4, borderColor: theme.palette.divider }}>
          <Grid container spacing={3}>
            {/* Task Title */}
            <Grid item xs={12}>
              <TextField
                required
                name="workName"
                label="Task Title"
                fullWidth
                value={formData.workName}
                onChange={handleChange}
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AssignmentIcon color="primary" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* Client Name */}
            <Grid item xs={12}>
              <TextField
                required
                name="client"
                label="Client Name"
                fullWidth
                value={formData.client}
                onChange={handleChange}
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="primary" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* Assign To (Reassignment) */}
            <Grid item xs={12}>
              <FormControl fullWidth required variant="filled">
                <InputLabel>Assign To</InputLabel>
                <Select
                  name="newEmployeeName"
                  value={formData.newEmployeeName}
                  onChange={handleChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      {selected}
                    </Box>
                  )}
                >
                  {employeeList.map((emp) => (
                    <MenuItem key={emp} value={emp}>
                      <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      {emp}
                    </MenuItem>
                  ))}
                  {/* Keep current employee in list if not loaded */}
                  {task.employeeName && !employeeList.includes(task.employeeName) && (
                    <MenuItem value={task.employeeName}>
                      <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      {task.employeeName}
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Work Category */}
            <Grid item xs={12}>
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
                  {['Accounting', 'Bookkeeping', 'Consultancy', 'Internal Audit', 'Risk Assessment', 'Vat', 'Self Assessment', 'Incorporation', 'Tax Advisory/Returns'].map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Priority Level */}
            <Grid item xs={6}>
              <FormControl fullWidth required variant="filled">
                <InputLabel>Priority</InputLabel>
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
                  {['Low', 'Normal', 'High', 'Urgent'].map((pri) => (
                    <MenuItem key={pri} value={pri}>
                      <PriorityHighIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      {pri}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Est Time */}
            <Grid item xs={6}>
              <TextField
                name="estTime"
                label="Est. Time"
                fullWidth
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
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* Deadline */}
            <Grid item xs={12}>
              <FormControl fullWidth required variant="filled">
                <InputLabel shrink>Deadline</InputLabel>
                <FilledInput
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  disabled={task.recurrenceType && task.recurrenceType !== 'None' && task.recurrenceType !== 'Monthly'}
                  inputProps={{ 
                    readOnly: task.recurrenceType && task.recurrenceType !== 'None' && task.recurrenceType !== 'Monthly' 
                  }}
                />
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 1.5 }}>
          <Button 
            onClick={onClose} 
            color="inherit" 
            sx={{ fontWeight: 600, borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isSubmitting}
            sx={{ 
              px: 4, 
              py: 1.2,
              borderRadius: 2, 
              fontWeight: 800,
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)',
              textTransform: 'none'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTaskModal;
