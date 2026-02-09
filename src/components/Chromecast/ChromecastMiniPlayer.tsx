import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Slider,
  Slide,
  Chip,
  Tooltip,
  Popover,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Close as CloseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon,
  VolumeMute as VolumeMuteIcon,
  Replay10 as Replay10Icon,
  Forward10 as Forward10Icon,
} from '@mui/icons-material';
import { useChromecast } from '../../context/ChromecastContext';
import { isMobile } from '../../App';

const formatTime = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ChromecastMiniPlayer: React.FC = () => {
  const { 
    isCasting, 
    currentVideo, 
    playbackState,
    deviceName,
    play,
    pause,
    stop,
    seek,
    setVolume,
    isPlayerMinimized,
    hidePlayer,
  } = useChromecast();

  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [volume, setVolumeState] = useState(1); // 0 to 1
  const [isMuted, setIsMuted] = useState(false);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(1);
  const [volumeAnchorEl, setVolumeAnchorEl] = useState<HTMLButtonElement | null>(null);



  // Only show when casting
  if (!isCasting || !currentVideo) {
    return null;
  }


  const isPlaying = playbackState.state === 'PLAYING';
  const isBuffering = playbackState.state === 'BUFFERING';
  const currentPosition = playbackState.position || 0;
  const duration = playbackState.duration || 0;
  const progress = duration ? (currentPosition / duration) * 100 : 0;



  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleSkipBackward = () => {
    const newPosition = Math.max(0, currentPosition - 10);
    seek(newPosition);
  };

  const handleSkipForward = () => {
    const newPosition = Math.min(duration, currentPosition + 10);
    seek(newPosition);
  };

  const handleProgressChange = (_event: Event, value: number | number[]) => {
    // Only update temp progress when user is actively dragging
    if (isDraggingProgress) {
      const newValue = Array.isArray(value) ? value[0] : value;
      setTempProgress(newValue);
    }
    // When not dragging, the slider will update automatically from the value prop
  };

  const handleProgressCommit = (_event: Event | React.SyntheticEvent, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    const newPosition = (newValue / 100) * duration;
    seek(newPosition);
    setIsDraggingProgress(false);
  };

  const handleProgressStart = () => {
    setIsDraggingProgress(true);
    setTempProgress(progress);
  };

  const handleClose = () => {
    // Minimize the player (keeps casting in background)
    hidePlayer();
  };

  const handleStopCasting = async () => {
    // Stop casting but keep connection
    await stop();
  };

  const handleVolumeChange = (_event: Event, value: number | number[]) => {
    const newVolume = (Array.isArray(value) ? value[0] : value) / 100;
    setVolumeState(newVolume);
    // Don't call setVolume here, wait for commit
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleVolumeCommit = (_event: Event | React.SyntheticEvent, value: number | number[]) => {
    const newVolume = (Array.isArray(value) ? value[0] : value) / 100;
    setVolume(newVolume); // Actually set the Chromecast volume on commit
  };

  const handleVolumeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setVolumeAnchorEl(event.currentTarget);
  };

  const handleVolumeClose = () => {
    setVolumeAnchorEl(null);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      // Unmute - restore previous volume (capped at safe maximum)
      const safeVolume = Math.min(volumeBeforeMute, 0.5); // Cap at 50% max
      setIsMuted(false);
      setVolumeState(safeVolume);
      setVolume(safeVolume);
    } else {
      // Mute - save current volume (if volume is 0, save a reasonable default)
      // Also cap the saved volume to prevent loud unmutes
      let volumeToSave = volume > 0 ? volume : 0.25;
      volumeToSave = Math.min(volumeToSave, 0.5); // Never save more than 50%
      setVolumeBeforeMute(volumeToSave);
      setIsMuted(true);
      setVolumeState(0);
      setVolume(0);
    }
  };

  const volumePopoverOpen = Boolean(volumeAnchorEl);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeOffIcon />;
    if (volume < 0.5) return <VolumeMuteIcon />;
    return <VolumeIcon />;
  };

  const displayProgress = isDraggingProgress ? tempProgress : progress;
  const displayPosition = isDraggingProgress ? (tempProgress / 100) * duration : currentPosition;

  // Force the slider to be treated as controlled component
  const sliderValue = isNaN(displayProgress) ? 0 : Math.max(0, Math.min(100, displayProgress));

  return (
    <Slide direction="up" in={isCasting && !isPlayerMinimized} mountOnEnter unmountOnExit>
      <Paper 
        elevation={12}
        sx={{
          position: 'fixed',
          left: '50%',
          
          transform: 'translateX(-50%) !important',
          bottom: isMobile ? '85px' : '20px',
          width: '95%',
          maxWidth: '520px',
          zIndex: 99999,
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          p: isMobile ? 1.5 : 2, 
          gap: isMobile ? 1.5 : 2,
        }}>
          {/* Header with thumbnail, info, and close button */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: isMobile ? 1.5 : 2,
          }}>
            {/* Thumbnail - COMMENTED OUT
            {currentVideo.imageUrl ? (
              <Box
                sx={{
                  width: isMobile ? 56 : 64,
                  height: isMobile ? 56 : 64,
                  borderRadius: 2,
                  overflow: 'hidden',
                  flexShrink: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                <img 
                  src={currentVideo.imageUrl} 
                  alt={currentVideo.title || 'Video'}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  width: isMobile ? 56 : 64,
                  height: isMobile ? 56 : 64,
                  borderRadius: 2,
                  flexShrink: 0,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                }}
              >
                <VolumeIcon sx={{ fontSize: isMobile ? 28 : 32, color: '#3b82f6' }} />
              </Box>
            )}
            */}

            {/* Video info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant={isMobile ? 'body2' : 'body1'}
                sx={{ 
                  fontWeight: 600,
                  color: 'white',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.3,
                }}
              >
                {currentVideo.title || 'Untitled Video'}
              </Typography>
              
              {currentVideo.subtitle && !isMobile && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'block',
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentVideo.subtitle}
                </Typography>
              )}

              <Chip
                label={deviceName || 'Chromecast'}
                size="small"
                icon={<VolumeIcon sx={{ fontSize: '0.9rem !important' }} />}
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                  '& .MuiChip-icon': {
                    color: '#60a5fa',
                  },
                }}
              />
            </Box>

            {/* Close button */}
            <Tooltip title="Minimize player">
              <IconButton 
                onClick={handleClose}
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Progress slider */}
          <Box sx={{ px: isMobile ? 0.5 : 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {formatTime(displayPosition)}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.75rem',
                }}
              >
                {formatTime(duration)}
              </Typography>
            </Box>
            
            <Slider
              value={sliderValue}
              onChange={handleProgressChange}
              onChangeCommitted={handleProgressCommit}
              onMouseDown={handleProgressStart}
              onTouchStart={handleProgressStart}
              disabled={isBuffering || !duration}
              sx={{
                color: '#3b82f6',
                height: 6,
                padding: '8px 0',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                  border: '2px solid #3b82f6',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.5)',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.16)',
                  },
                  '&:active': {
                    width: 20,
                    height: 20,
                  },
                },
                '& .MuiSlider-track': {
                  height: 6,
                  border: 'none',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                },
                '& .MuiSlider-rail': {
                  height: 6,
                  opacity: 0.3,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(59, 130, 246, 0.5)',
                },
              }}
            />
          </Box>

          {/* Controls */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}>
            {/* Left side - Playback controls */}
            <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, alignItems: 'center' }}>
              <Tooltip title="Rewind 10 seconds">
                <IconButton 
                  onClick={handleSkipBackward}
                  disabled={isBuffering || currentPosition < 1}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <Replay10Icon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
              </Tooltip>

              <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                <IconButton 
                  onClick={handlePlayPause}
                  disabled={isBuffering}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    border: '2px solid rgba(59, 130, 246, 0.5)',
                    width: isMobile ? 42 : 48,
                    height: isMobile ? 42 : 48,
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.4)',
                      transform: 'scale(1.05)',
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isPlaying ? (
                    <PauseIcon fontSize={isMobile ? 'medium' : 'large'} />
                  ) : (
                    <PlayIcon fontSize={isMobile ? 'medium' : 'large'} />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title="Forward 10 seconds">
                <IconButton 
                  onClick={handleSkipForward}
                  disabled={isBuffering || currentPosition >= duration - 1}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <Forward10Icon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
              </Tooltip>

              {isBuffering && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.7rem',
                    ml: 1,
                  }}
                >
                  Buffering...
                </Typography>
              )}
            </Box>

            {/* Right side - Volume and Stop casting button */}
            <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, alignItems: 'center' }}>
              {/* Volume control - Desktop gets slider, mobile gets quick mute */}
              {/* COMMENTED OUT - Mute button temporarily disabled
              {!isMobile ? (
                <Tooltip title="Volume">
                  <IconButton 
                    onClick={handleVolumeClick}
                    sx={{
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                    size="medium"
                  >
                    {getVolumeIcon()}
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                  <IconButton 
                    onClick={handleMuteToggle}
                    sx={{
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                    size="small"
                  >
                    {getVolumeIcon()}
                  </IconButton>
                </Tooltip>
              )}
              */}

              <Tooltip title="Stop video (keeps connection)">
                <IconButton 
                  onClick={handleStopCasting}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.3)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <StopIcon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Volume Popover */}
        <Popover
          open={volumePopoverOpen}
          anchorEl={volumeAnchorEl}
          onClose={handleVolumeClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          sx={{
            '& .MuiPopover-paper': {
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            },
          }}
        >
          <Box sx={{ 
            p: 2, 
            width: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                fontWeight: 600,
                mb: 1,
              }}
            >
              {Math.round(volume * 100)}%
            </Typography>
            <Slider
              orientation="vertical"
              value={volume * 100}
              onChange={handleVolumeChange}
              onChangeCommitted={handleVolumeCommit}
              sx={{
                height: 120,
                color: '#3b82f6',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                  border: '2px solid #3b82f6',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.5)',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.16)',
                  },
                },
                '& .MuiSlider-track': {
                  width: 6,
                  border: 'none',
                  background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)',
                },
                '& .MuiSlider-rail': {
                  width: 6,
                  opacity: 0.3,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            />
            {/* COMMENTED OUT - Mute button temporarily disabled
            <IconButton
              onClick={handleMuteToggle}
              size="small"
              sx={{
                color: 'white',
                mt: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {getVolumeIcon()}
            </IconButton>
            */}
          </Box>
        </Popover>
      </Paper>
    </Slide>
  );
};

