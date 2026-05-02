import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
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
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  FilledInput
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import SendIcon from '@mui/icons-material/Send';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import TodayIcon from '@mui/icons-material/Today';
import { API_URL } from '../config';

const formatDateUI = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

function LeaveManagement() {
  const theme = useTheme();

  // User State
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const position = user?.position?.toLowerCase() || '';
  const isTeamLead = position.includes('team-lead') || position.includes('team lead');
  const isAdmin = position === 'admin';

  // Form State
  const [formData, setFormData] = useState({
    reason: '',
    date: '',
    dayType: 'Full Day',
    customDate: '',
    priority: 'Normal'
  });
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Data State
  const [leaves, setLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  const fetchLeaves = async () => {
    try {
      // Fetch Team Leads to know who is a lead
      const tlRes = await fetch(`${API_URL}?action=teamlead`);
      const tlData = await tlRes.json();
      const tlEmails = tlData.status === 'success' && tlData.data ? tlData.data.map(lead => lead.email) : [];

      const res = await fetch(`${API_URL}?action=getleaves`);
      const result = await res.json();
      if (result.status === 'success') {
        const data = result.data || [];
        
        // Developer/TL sees their own leaves
        if (!isAdmin) {
          setLeaves(data.filter(l => l.email === user.email));
        }

        // Team Leads / Admins see pending approvals
        if (isAdmin) {
          setAllLeaves(data);
          // Admin sees Team Lead leaves directly, but Developer leaves only after TL approval
          setPendingApprovals(data.filter(l => {
            if (l.adminStatus !== 'Pending') return false;
            if (tlEmails.includes(l.email)) return true; // It's a Team Lead leave
            return l.tlStatus === 'Approved'; // It's a Developer leave
          }));
        } else if (isTeamLead) {
          // Team Lead sees pending requests, but NOT their own!
          setPendingApprovals(data.filter(l => l.tlStatus === 'Pending' && l.email !== user.email));
        }
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reason || !formData.date) {
      setSnackbar({ open: true, message: 'Please fill all required fields.', severity: 'warning' });
      return;
    }

    setLoading(true);
    
    // Call API
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'applyLeave',
        name: user?.name || user?.email,
        email: user?.email,
        reason: formData.reason,
        date: formData.date,
        day: formData.dayType,
        customDate: formData.customDate,
        priority: formData.priority,
        tlStatus: isTeamLead ? "Approved" : "Pending"
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setSnackbar({ open: true, message: 'Leave application submitted successfully!', severity: 'success' });
        setFormData({ reason: '', date: '', dayType: 'Full Day', customDate: '', priority: 'Normal' });
        fetchLeaves(); // Refresh
      } else {
        setSnackbar({ open: true, message: data.message || 'Error submitting leave.', severity: 'error' });
      }
    })
    .catch(err => setSnackbar({ open: true, message: 'Network error.', severity: 'error' }))
    .finally(() => setLoading(false));
  };

  const handleAction = (id, actionStatus) => {
    const actionName = isAdmin ? 'approveByAdmin' : 'approveByLead';
    
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: actionName,
        leaveId: id,
        status: actionStatus
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setSnackbar({ open: true, message: `Leave ${actionStatus} successfully!`, severity: 'success' });
        fetchLeaves(); // Refresh
      } else {
        setSnackbar({ open: true, message: data.message || 'Error updating status.', severity: 'error' });
      }
    })
    .catch(err => setSnackbar({ open: true, message: 'Network error.', severity: 'error' }));
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Approved': return <Chip size="small" icon={<CheckCircleIcon />} label="Approved" color="success" sx={{ fontWeight: 'bold' }} />;
      case 'Rejected': return <Chip size="small" icon={<CancelIcon />} label="Rejected" color="error" sx={{ fontWeight: 'bold' }} />;
      default: return <Chip size="small" icon={<PendingIcon />} label="Pending" color="warning" sx={{ fontWeight: 'bold' }} />;
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 4 } }}>
      <Box sx={{ mb: { xs: 3, md: 4 }, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, wordBreak: 'break-word' }}>
          Leave Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {isAdmin 
            ? "Review and manage employee leave applications across the organization" 
            : "Apply for leave and track your application status"}
        </Typography>
      </Box>

      <Grid container rowSpacing={{ xs: 4, md: 4 }} columnSpacing={{ xs: 0, md: 4 }} justifyContent="center">
        {/* Apply Leave Form */}
        <Grid item xs={12} md={isAdmin ? 12 : 4} sx={{ minWidth: 0, width: '100%' }}>
          {!isAdmin && (
            <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
              <Typography variant="h5" sx={{ mb: { xs: 2, md: 3 }, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                <EventIcon color="primary" /> Apply for Leave
              </Typography>
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    required
                    fullWidth
                    label="Reason for Leave"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    variant="filled"
                    multiline
                    rows={2}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><NoteAltIcon color="primary" /></InputAdornment>,
                    }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                    <FormControl fullWidth required variant="filled">
                      <InputLabel shrink>Date</InputLabel>
                      <FilledInput
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </FormControl>
                    <FormControl fullWidth variant="filled">
                      <InputLabel>Day Type</InputLabel>
                      <Select name="dayType" value={formData.dayType} onChange={handleChange}>
                        <MenuItem value="Full Day">Full Day</MenuItem>
                        <MenuItem value="Half Day">Half Day</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                    <TextField
                      fullWidth
                      label="Custom Date (Optional)"
                      name="customDate"
                      value={formData.customDate}
                      onChange={handleChange}
                      variant="filled"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><TodayIcon color="primary" /></InputAdornment>,
                      }}
                    />
                    <FormControl fullWidth variant="filled">
                      <InputLabel>Priority</InputLabel>
                      <Select name="priority" value={formData.priority} onChange={handleChange}>
                        <MenuItem value="Low">Low</MenuItem>
                        <MenuItem value="Normal">Normal</MenuItem>
                        <MenuItem value="High">High</MenuItem>
                        <MenuItem value="Urgent">Urgent</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    endIcon={<SendIcon />}
                    sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
                  >
                    {loading ? 'Submitting...' : 'Submit Leave'}
                  </Button>
                </Box>
              </form>
            </Paper>
          )}
        </Grid>

        {/* Right Column: History & Approvals */}
        <Grid item xs={12} md={isAdmin ? 12 : 8} sx={{ minWidth: 0, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 4 }, minWidth: 0 }}>
            
            {/* Team Lead Approvals Section */}
            {(isTeamLead || isAdmin) && (
              <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', overflow: 'hidden' }}>
                <Typography variant="h5" sx={{ mb: { xs: 2, md: 3 }, fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>Pending Approvals</Typography>
                <TableContainer sx={{ maxHeight: 440, overflowX: 'auto', width: '100%' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover', '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                      {pendingApprovals.length > 0 ? pendingApprovals.map((leave) => (
                        <TableRow key={leave.id} hover>
                          <TableCell>{leave.employeeName}</TableCell>
                          <TableCell>{leave.reason}</TableCell>
                          <TableCell>
                            {formatDateUI(leave.date)}
                            {leave.customDate && (
                              <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                                ({leave.customDate})
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{leave.priority}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
                              <Button size="small" variant="contained" color="success" onClick={() => handleAction(leave.id, 'Approved')}>Approve</Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => handleAction(leave.id, 'Rejected')}>Reject</Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} align="center">No pending approvals.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* All Leave History Section for Admin */}
            {isAdmin && (
              <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', overflow: 'hidden' }}>
                <Typography variant="h5" sx={{ mb: { xs: 2, md: 3 }, fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>Organization Leave History</Typography>
                <TableContainer sx={{ maxHeight: 440, overflowX: 'auto', width: '100%' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover', '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>TL Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Admin Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                      {allLeaves.length > 0 ? allLeaves.map((leave) => (
                        <TableRow key={leave.id} hover>
                          <TableCell sx={{ fontWeight: 'medium' }}>{leave.employeeName}</TableCell>
                          <TableCell>
                            {formatDateUI(leave.date)}
                            {leave.customDate && (
                              <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                                ({leave.customDate})
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{leave.reason}</TableCell>
                          <TableCell>{leave.dayType}</TableCell>
                          <TableCell>{getStatusChip(leave.tlStatus)}</TableCell>
                          <TableCell>{getStatusChip(leave.adminStatus)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={6} align="center">No leave history found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Leave History Section */}
            {!isAdmin && (
              <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', overflow: 'hidden' }}>
                <Typography variant="h5" sx={{ mb: { xs: 2, md: 3 }, fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>My Leave History</Typography>
                <TableContainer sx={{ maxHeight: 440, overflowX: 'auto', width: '100%' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover', '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Leave ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>TL Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Admin Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                      {leaves.length > 0 ? leaves.map((leave) => (
                        <TableRow key={leave.id} hover>
                          <TableCell sx={{ fontWeight: 'medium' }}>{leave.id}</TableCell>
                          <TableCell>
                            {formatDateUI(leave.date)}
                            {leave.customDate && (
                              <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                                ({leave.customDate})
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{leave.reason}</TableCell>
                          <TableCell>{leave.dayType}</TableCell>
                          <TableCell>{getStatusChip(leave.tlStatus)}</TableCell>
                          <TableCell>{getStatusChip(leave.adminStatus)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={6} align="center">No leave history found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

          </Box>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(prev => ({...prev, open: false}))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default LeaveManagement;
