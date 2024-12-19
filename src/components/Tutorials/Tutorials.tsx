import React, { useContext, useState } from 'react'
import { GlobalContext, MyContext } from '../../App';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { VideoPlayer } from '../Embeds/VideoPlayer';

export const Tutorials = () => {
    const { openTutorialModal, setOpenTutorialModal  } = useContext(GlobalContext);
    const [multiNumber, setMultiNumber] = useState(0)
    const handleClose = ()=> {
        setOpenTutorialModal(null)
        setMultiNumber(0)
    }
    if(!openTutorialModal) return null
    if(openTutorialModal?.multi){
        const selectedTutorial = openTutorialModal?.multi[multiNumber]
        return (
            <Dialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={!!openTutorialModal}
        fullWidth={true}
        maxWidth={false}
        fullScreen
        sx={{
          margin: 0,
          padding: 0
        }}
      >
         <Tabs variant='scrollable'  sx={{
        "& .MuiTabs-indicator": {
          backgroundColor: "white",
        },
      }} value={multiNumber} onChange={(e, value)=> setMultiNumber(value)} aria-label="basic tabs example">
            {openTutorialModal?.multi?.map((item, index)=> {
                return (
                    <Tab   sx={{
                        "&.Mui-selected": {
                          color: "white",
                        },
                        fontSize:'0.75rem'
                      }} label={item?.title} value={index} />
                   
                )
            })}
  </Tabs>
        <DialogTitle sx={{ m: 0, p: 2, fontSize: '14px' }} >
          {selectedTutorial?.title} {` Tutorial`}
        </DialogTitle>
        <DialogContent dividers sx={{
            height: '85vh'
        }}>

          <VideoPlayer node="https://ext-node.qortal.link" {...selectedTutorial?.resource || {}} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleClose}>
           Close
          </Button>
        </DialogActions>
      </Dialog>
        )
    }
  return (
    <>
      <Dialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={!!openTutorialModal}
        fullWidth={true}
        maxWidth={false}
        fullScreen
        sx={{
          margin: 0,
          padding: 0
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, fontSize: '14px' }} >
          {openTutorialModal?.title} {` Tutorial`}
        </DialogTitle>
        <DialogContent dividers sx={{
            height: '85vh'
        }}>

          <VideoPlayer node="https://ext-node.qortal.link" {...openTutorialModal?.resource || {}} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleClose}>
           Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
