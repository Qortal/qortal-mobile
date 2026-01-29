import React, { useState } from 'react';
import { 
  IconButton,
  Box,
  Tooltip,
  Badge,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { CastConnected, Cast } from '@mui/icons-material';
import { useChromecast } from '../../context/ChromecastContext';

export const ChromecastButton: React.FC = () => {
  const { 
    isConnected, 
    isCasting,
    deviceName, 
    isConnecting,
    showDevicePicker,
    showPlayer,
    disconnect,
  } = useChromecast();

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const handleClick = () => {
    if (isCasting) {
      // If currently casting, show the player
      showPlayer();
    } else if (isConnected) {
      // If connected but not casting, show disconnect dialog
      setShowDisconnectDialog(true);
    } else {
      // Not connected, show device picker
      showDevicePicker();
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectDialog(false);
    await disconnect();
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectDialog(false);
  };

  const getTooltipText = () => {
    if (isConnecting) return 'Connecting...';
    if (isCasting) return 'Show player';
    if (isConnected && deviceName) return `Connected to ${deviceName}`;
    if (isConnected) return 'Connected to Chromecast';
    return 'Cast to TV';
  };

  // Don't show the button if not connected
  if (!isConnected && !isConnecting) {
    return null;
  }

  return (
    <>
      <Tooltip title={getTooltipText()}>
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleClick}
            disabled={isConnecting}
            sx={{
              color: isConnected ? '#3b82f6' : 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {isConnecting ? (
              <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
            ) : (
              <Badge
                variant="dot"
                color="primary"
                invisible={!isCasting}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
                    animation: isCasting ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': {
                        opacity: 1,
                      },
                      '50%': {
                        opacity: 0.5,
                      },
                    },
                  },
                }}
              >
                {isConnected ? <CastConnected /> : <Cast />}
              </Badge>
            )}
          </IconButton>
        </Box>
      </Tooltip>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onClose={handleCancelDisconnect}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 600 }}>
          Disconnect from Chromecast?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {deviceName 
              ? `Are you sure you want to disconnect from ${deviceName}?`
              : 'Are you sure you want to disconnect from this device?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCancelDisconnect}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDisconnect}
            variant="contained"
            sx={{
              backgroundColor: '#ef4444',
              '&:hover': {
                backgroundColor: '#dc2626',
              },
            }}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

