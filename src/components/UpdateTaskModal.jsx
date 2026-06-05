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
  Checkbox,
  FormControlLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TimerIcon from '@mui/icons-material/Timer';
import CommentIcon from '@mui/icons-material/Comment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

const UpdateTaskModal = ({ task, open, onClose, onSubmit, isSubmitting }) => {
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    status: 'Pending',
    actualTime: '0',
    comment: ''
  });

  const [invoiceSent, setInvoiceSent] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        status: task.status || 'Pending',
        actualTime: task.actualTime !== undefined && task.actualTime !== null ? String(task.actualTime) : '0',
        comment: task.comment || ''
      });
      setInvoiceSent(task.comment ? task.comment.includes("Invoice Sent to Customer") : false);
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
    let finalComment = formData.comment;
    if (formData.status === 'Completed') {
      if (invoiceSent) {
        if (!finalComment.includes("Invoice Sent to Customer")) {
          finalComment = finalComment 
            ? `Invoice Sent to Customer. ${finalComment}` 
            : "Invoice Sent to Customer";
        }
      } else {
        // Remove "Invoice Sent to Customer" prefix if unchecked
        finalComment = finalComment
          .replace("Invoice Sent to Customer. ", "")
          .replace("Invoice Sent to Customer.", "")
          .replace("Invoice Sent to Customer", "")
          .trim();
      }
    }
    onSubmit({
      taskId: task.taskId,
      employeeName: task.employeeName,
      status: formData.status,
      actualTime: formData.actualTime,
      comment: finalComment
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
            Task Progress Update
          </Typography>
          <Typography variant="h5" component="div" sx={{ fontWeight: 800 }}>
            {task.workName || 'Update Task'}
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
            {/* Status Dropdown */}
            <Grid item xs={12}>
              <FormControl fullWidth variant="filled" required>
                <InputLabel id="update-status-label">Current Status</InputLabel>
                <Select
                  labelId="update-status-label"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  sx={{ borderRadius: 2 }}
                  startAdornment={
                    <InputAdornment position="start">
                      <PlaylistAddCheckIcon color="primary" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="In_Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Actual Time Input */}
            <Grid item xs={12}>
              <TextField
                name="actualTime"
                label="Actual Time (Hours Spent)"
                type="number"
                fullWidth
                required
                value={formData.actualTime}
                onChange={handleChange}
                variant="filled"
                placeholder="e.g. 5"
                inputProps={{ min: "0", step: "0.5" }}
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

            {/* Invoice Sent Checkbox */}
            {formData.status === 'Completed' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={invoiceSent}
                      onChange={(e) => setInvoiceSent(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Invoice Sent to Customer"
                  sx={{ 
                    color: theme.palette.text.primary,
                    '& .MuiFormControlLabel-label': {
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }
                  }}
                />
              </Grid>
            )}

            {/* Comments Field */}
            <Grid item xs={12}>
              <TextField
                name="comment"
                label="Progress Comments / Completion Note"
                fullWidth
                multiline
                rows={4}
                value={formData.comment}
                onChange={handleChange}
                variant="filled"
                placeholder="Describe your progress or completion details..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                      <CommentIcon color="primary" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
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
            {isSubmitting ? 'Updating...' : 'Save Progress'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UpdateTaskModal;
