import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useDispatch, useSelector } from 'react-redux';
import { selectSnackbar, hideSnackbar } from '../../store/slices/bootstrapSlice';
const GlobalSnackbar = () => {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector(selectSnackbar);
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    dispatch(hideSnackbar());
  };
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <MuiAlert onClose={handleClose} severity={severity} sx={{ width: '100%' }} elevation={6} variant="filled">
        {message}
      </MuiAlert>
    </Snackbar>
  );
};
export default GlobalSnackbar;