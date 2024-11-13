import * as React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import CommentIcon from "@mui/icons-material/Comment";
import InfoIcon from "@mui/icons-material/Info";
import { Box, Typography } from "@mui/material";
import { Spacer } from "../../common/Spacer";
import { isMobile } from "../../App";
import { QMailMessages } from "./QMailMessages";

export const ThingsToDoInitial = ({ myAddress, name, hasGroups, balance , userInfo}) => {
  const [checked1, setChecked1] = React.useState(false);
  const [checked2, setChecked2] = React.useState(false);
  const [checked3, setChecked3] = React.useState(false);

  //   const getAddressInfo = async (address) => {
  //     const response = await fetch(getBaseApiReact() + "/addresses/" + address);
  //     const data = await response.json();
  //     if (data.error && data.error === 124) {
  //       setChecked1(false);
  //     } else if (data.address) {
  //       setChecked1(true);
  //     }
  //   };

  //   const checkInfo = async () => {
  //     try {
  //       getAddressInfo(myAddress);
  //     } catch (error) {}
  //   };

  React.useEffect(() => {
    if (balance && +balance >= 6) {
      setChecked1(true);
    }
  }, [balance]);

  React.useEffect(() => {
    if (hasGroups) setChecked3(true);
  }, [hasGroups]);

  React.useEffect(() => {
    if (name) setChecked2(true);
  }, [name]);

  const isLoaded = React.useMemo(()=> {
    if(balance !== null &&  userInfo !== null) return true
  return false
}, [balance, userInfo])

const hasDoneNameAndBalanceAndIsLoaded = React.useMemo(()=> {
  if(isLoaded && checked1 && checked2) return true
return false
}, [checked1, isLoaded, checked2])

if(hasDoneNameAndBalanceAndIsLoaded){
return (
 <QMailMessages userAddress={userInfo?.address} userName={userInfo?.name} />
);
}

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: "322px",
          display: "flex",
          flexDirection: "column",
          padding: "0px 20px",
        }}
      >
        <Typography
          sx={{
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
                 {!isLoaded ? 'Loading...' : 'Getting Started' }

        </Typography>
        <Spacer height="10px" />
      </Box>

      <Box
        sx={{
          width: "322px",
          minHeight: isMobile ? "165px" : "250px",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          padding: "20px",
          borderRadius: "19px",
        }}
      >
        <List sx={{ width: "100%", maxWidth: 360 }}>
          <ListItem
            // secondaryAction={
            //   <IconButton edge="end" aria-label="comments">
            //     <InfoIcon
            //       sx={{
            //         color: "white",
            //       }}
            //     />
            //   </IconButton>
            // }
            disablePadding
            sx={{
              marginBottom: '20px'
            }}
          >
            <ListItemButton
              sx={{
                padding: "0px",
              }}
              disableRipple
              role={undefined}
              dense
            >
              <ListItemText
                sx={{
                  "& .MuiTypography-root": {
                    fontSize: "13px",
                    fontWeight: 400,
                  },
                }}
                primary={`Have at least 6 QORT in your wallet`}
              />
              <ListItemIcon
                sx={{
                  justifyContent: "flex-end",
                }}
              >
                <Box
                  sx={{
                    height: "18px",
                    width: "18px",
                    borderRadius: "50%",
                    backgroundColor: checked1 ? "rgba(9, 182, 232, 1)" : "transparent",
                    outline: "1px solid rgba(9, 182, 232, 1)",
                  }}
                />
                {/* <Checkbox
                  edge="start"
                  checked={checked1}
                  tabIndex={-1}
                  disableRipple
                  disabled={true}
                  sx={{
                    "&.Mui-checked": {
                      color: "white", // Customize the color when checked
                    },
                    "& .MuiSvgIcon-root": {
                      color: "white",
                    },
                  }}
                /> */}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem
          sx={{
            marginBottom: '20px'
          }}
            //  secondaryAction={
            //     <IconButton edge="end" aria-label="comments">
            //       <InfoIcon
            //         sx={{
            //           color: "white",
            //         }}
            //       />
            //     </IconButton>
            //   }
            disablePadding
          >
            <ListItemButton sx={{
                padding: "0px",
              }} disableRipple role={undefined} dense>
              
              <ListItemText   sx={{
                  "& .MuiTypography-root": {
                    fontSize: "13px",
                    fontWeight: 400,
                  },
                }} primary={`Register a name`} />
              <ListItemIcon   sx={{
                  justifyContent: "flex-end",
                }}>
                <Box
                  sx={{
                    height: "18px",
                    width: "18px",
                    borderRadius: "50%",
                    backgroundColor: checked2 ? "rgba(9, 182, 232, 1)" : "transparent",
                    outline: "1px solid rgba(9, 182, 232, 1)",
                  }}
                />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem
            //  secondaryAction={
            //     <IconButton edge="end" aria-label="comments">
            //       <InfoIcon
            //         sx={{
            //           color: "white",
            //         }}
            //       />
            //     </IconButton>
            //   }
            disablePadding
          >
            <ListItemButton sx={{
                padding: "0px",
              }} disableRipple role={undefined} dense>
              
              <ListItemText sx={{
                  "& .MuiTypography-root": {
                    fontSize: "13px",
                    fontWeight: 400,
                  },
                }} primary={`Join a group hub`} />
              <ListItemIcon sx={{
                  justifyContent: "flex-end",
                }}>
              <Box
                  sx={{
                    height: "18px",
                    width: "18px",
                    borderRadius: "50%",
                    backgroundColor: checked3 ? "rgba(9, 182, 232, 1)" : "transparent",
                    outline: "1px solid rgba(9, 182, 232, 1)",
                  }}
                />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};
