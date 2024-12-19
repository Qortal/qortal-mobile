import { Box, Button, ButtonBase, Typography } from "@mui/material";
import React, { useContext } from "react";
import { Spacer } from "../../common/Spacer";
import { ListOfThreadPostsWatched } from "./ListOfThreadPostsWatched";
import { ThingsToDoInitial } from "./ThingsToDoInitial";
import { GroupJoinRequests } from "./GroupJoinRequests";
import { GroupInvites } from "./GroupInvites";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ListOfGroupPromotions } from "./ListOfGroupPromotions";
import HelpIcon from '@mui/icons-material/Help';
import { useHandleTutorials } from "../Tutorials/useHandleTutorials";
import { GlobalContext } from "../../App";

export const Home = ({
  refreshHomeDataFunc,
  myAddress,
  isLoadingGroups,
  balance,
  userInfo,
  groups,
  setGroupSection,
  setSelectedGroup,
  getTimestampEnterChat,
  setOpenManageMembers,
  setOpenAddGroup,
  setMobileViewMode,
}) => {
  const { showTutorial } = useContext(GlobalContext);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        alignItems: "center",
        position: 'relative'
      }}
    >
   
               <ButtonBase sx={{
                position: 'absolute',
                top: '5px',
                right: '5px'
               }} onClick={()=> {
               
                  showTutorial('getting-started', true)
  
              
                }} >
                  <HelpIcon sx={{
                color: 'var(--unread)',
                fontSize: '18px'
                 }} />
                </ButtonBase>
          
            
      <Spacer height="20px" />
      <Typography
        sx={{
          color: "rgba(255, 255, 255, 1)",
          fontWeight: 400,
          fontSize: userInfo?.name?.length > 15 ? "16px" : "20px",
          padding: '10px'
        }}
      >
        Welcome
        {userInfo?.name ? (
          <span
            style={{
              fontStyle: "italic",
            }}
          >{`, ${userInfo?.name}`}</span>
        ) : null}
      </Typography>
      <Spacer height="26px" />

      {/* <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "flex-start",
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={refreshHomeDataFunc}
                  sx={{
                    color: "white",
                  }}
                >
                  Refresh home data
                </Button>
              </Box> */}
      {!isLoadingGroups && (
        <Box
          sx={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <ThingsToDoInitial
            balance={balance}
            myAddress={myAddress}
            name={userInfo?.name}
            hasGroups={groups?.length !== 0}
            userInfo={userInfo}

          />
          <ListOfThreadPostsWatched />

          <GroupJoinRequests
            setGroupSection={setGroupSection}
            setSelectedGroup={setSelectedGroup}
            getTimestampEnterChat={getTimestampEnterChat}
            setOpenManageMembers={setOpenManageMembers}
            myAddress={myAddress}
            groups={groups}
            setMobileViewMode={setMobileViewMode}
          />
          <GroupInvites
            setOpenAddGroup={setOpenAddGroup}
            myAddress={myAddress}
            groups={groups}
            setMobileViewMode={setMobileViewMode}
          />
        </Box>
      )}
         {!isLoadingGroups && (
      <ListOfGroupPromotions />
         )}
      <Spacer height="180px" />
    </Box>
  );
};
