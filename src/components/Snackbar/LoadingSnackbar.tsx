import * as React from 'react';
import Button from '@mui/material/Button';
import Snackbar, { SnackbarCloseReason } from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export const  LoadingSnackbar = ({open,  info, close, setInfo}) => {

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    if(close){
      close();
     
    }
    if(setInfo){
      setInfo(null)
    }
    
  };
  return (
    <div>
      <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} onClose={handleClose} open={open}>
        <Alert
          onClose={handleClose}
          severity="info"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {info?.message}
        </Alert>
      </Snackbar>
    </div>
  );
}