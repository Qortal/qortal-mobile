import React from 'react';
import { 
  IconButton,
  Box,
  Tooltip,
  Badge,
  CircularProgress,
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
  } = useChromecast();

  const handleClick = () => {
    if (isCasting) {
      // If currently casting, show the player
      showPlayer();
    } else {
      // Otherwise show device picker
      showDevicePicker();
    }
  };

  const getTooltipText = () => {
    if (isConnecting) return 'Connecting...';
    if (isCasting) return 'Show player';
    if (isConnected && deviceName) return `Connected to ${deviceName}`;
    if (isConnected) return 'Connected to Chromecast';
    return 'Cast to TV';
  };

  return (
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
  );
};

