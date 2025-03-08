import React, { useState, useEffect, useRef } from 'react';
import { Box, Divider, Menu, MenuItem, Typography, styled } from '@mui/material';
import { executeEvent } from '../utils/events';
import { useRecoilState } from 'recoil';
import { lastEnteredGroupIdAtom } from '../atoms/global';
import CloseIcon from '@mui/icons-material/Close';

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

export const GlobalTouchMenu = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const tapCount = useRef(0);
    const lastTapTime = useRef(0);
    const [menuPosition, setMenuPosition] = useState(null);
    const [lastEnteredGroupId] = useRecoilState(lastEnteredGroupIdAtom)


    useEffect(() => {
        const handleTouchStart = (event) => {
            const currentTime = new Date().getTime();
            const tapGap = currentTime - lastTapTime.current;
            const { clientX, clientY } = event.touches[0];

            if (tapGap < 400) {
                tapCount.current += 1;
            } else {
                tapCount.current = 1; // Reset if too much time has passed
            }

            lastTapTime.current = currentTime;

            if (tapCount.current === 3) {
                setMenuPosition({
                    top: clientY,
                    left: clientX,
                });
                setMenuOpen(true);
                tapCount.current = 0; // Reset after activation
            }
        };

        document.addEventListener('touchstart', handleTouchStart);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
        };
    }, []);

    const handleClose = () => {
        setMenuOpen(false);
    };

    return (
        <CustomStyledMenu
            open={menuOpen}
            anchorReference="anchorPosition"
            anchorPosition={menuPosition ? { top: menuPosition?.top, left: menuPosition?.left } : undefined}
        >
            <MenuItem onClick={handleClose}>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <CloseIcon />
                <Typography variant="inherit">Close Menu</Typography>
            </Box>
              
            </MenuItem>
            <Divider />
            <MenuItem onClick={()=> {
                executeEvent('open-apps-mode', {})
                handleClose()
            }}>
                <Typography variant="inherit">Apps</Typography>
            </MenuItem>
            <MenuItem onClick={()=> {
                 executeEvent("openGroupMessage", {
                              from: lastEnteredGroupId ,
                            });
                handleClose()
            }}>
                <Typography variant="inherit">Group Chat</Typography>
            </MenuItem>
            <MenuItem onClick={()=> {
                executeEvent('openUserLookupDrawer', {
                                  addressOrName: ""
                                 })
                handleClose()
            }}>
                <Typography variant="inherit">User Lookup</Typography>
            </MenuItem>
            <MenuItem onClick={()=> {
                executeEvent('openUserProfile',{})
                handleClose()
            }}>
                <Typography variant="inherit">My Account</Typography>
            </MenuItem>
            <MenuItem onClick={()=> {
                 executeEvent('openWalletsApp', {})
                handleClose()
            }}>
                <Typography variant="inherit">Wallets</Typography>
            </MenuItem>
        </CustomStyledMenu>
    );
};

