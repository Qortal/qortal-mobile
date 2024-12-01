import React, { useState, useRef, useMemo } from 'react';
import { ListItemIcon, Menu, MenuItem, Typography, styled } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { executeEvent } from '../utils/events';

const CustomStyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: '#f9f9f9',
    borderRadius: '12px',
    padding: theme.spacing(1),
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
  },
  '& .MuiMenuItem-root': {
    fontSize: '14px',
    color: '#444',
    transition: '0.3s background-color',
    '&:hover': {
      backgroundColor: '#f0f0f0',
    },
  },
}));

export const ContextMenu = ({ children, groupId, getUserSettings, mutedGroups }) => {
  const [menuPosition, setMenuPosition] = useState(null);
  const longPressTimeout = useRef(null);
  const preventClick = useRef(false); // Flag to prevent click after long-press or right-click
  const touchStartPosition = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);

  const isMuted = useMemo(() => mutedGroups.includes(groupId), [mutedGroups, groupId]);

  // Handle right-click (context menu) for desktop
  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    preventClick.current = true;

    setMenuPosition({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  };

  // Handle long-press for mobile
  const handleTouchStart = (event) => {
    touchMoved.current = false; // Reset moved state
    touchStartPosition.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };

    longPressTimeout.current = setTimeout(() => {
      if (!touchMoved.current) {
        preventClick.current = true;
        event.stopPropagation();
        setMenuPosition({
          mouseX: event.touches[0].clientX,
          mouseY: event.touches[0].clientY,
        });
      }
    }, 500); // Long press duration
  };

  const handleTouchMove = (event) => {
    const currentPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };

    const distanceMoved = Math.sqrt(
      Math.pow(currentPosition.x - touchStartPosition.current.x, 2) +
        Math.pow(currentPosition.y - touchStartPosition.current.y, 2)
    );

    if (distanceMoved > 10) {
      touchMoved.current = true; // Mark as moved
      clearTimeout(longPressTimeout.current); // Cancel the long press
    }
  };

  const handleTouchEnd = (event) => {
    clearTimeout(longPressTimeout.current);

    if (preventClick.current) {
      event.preventDefault();
      event.stopPropagation();
      preventClick.current = false;
    }
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition(null);
  };

  const handleSetGroupMute = () => {
    const value = isMuted
      ? mutedGroups.filter((group) => group !== groupId)
      : [...mutedGroups, groupId];

    window
      .sendMessage("addUserSettings", {
        keyValue: { key: 'mutedGroups', value },
      })
      .then((response) => {
        if (response?.error) console.error("Error adding user settings:", response.error);
        else console.log("User settings added successfully");
      })
      .catch((error) => console.error("Failed to add user settings:", error.message));

    setTimeout(() => getUserSettings(), 400);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ width: '100%', height: '100%' }}
    >
      {children}

      <CustomStyledMenu
        disableAutoFocusItem
        open={!!menuPosition}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          menuPosition
            ? { top: menuPosition.mouseY, left: menuPosition.mouseX }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={(e) => {
            handleClose(e);
            executeEvent("markAsRead", { groupId });
          }}
        >
          <ListItemIcon sx={{ minWidth: '32px' }}>
            <MailOutlineIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit" sx={{ fontSize: '14px' }}>
            Mark As Read
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            handleClose(e);
            handleSetGroupMute();
          }}
        >
          <ListItemIcon sx={{ minWidth: '32px' }}>
            <NotificationsOffIcon
              fontSize="small"
              sx={{ color: isMuted && 'red' }}
            />
          </ListItemIcon>
          <Typography
            variant="inherit"
            sx={{ fontSize: '14px', color: isMuted && 'red' }}
          >
            {isMuted ? 'Unmute ' : 'Mute '}Push Notifications
          </Typography>
        </MenuItem>
      </CustomStyledMenu>
    </div>
  );
};
