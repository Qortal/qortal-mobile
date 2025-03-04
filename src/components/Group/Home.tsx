import { Box, Button, ButtonBase, Divider, Typography } from "@mui/material";
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
import { QortPrice } from "../Home/QortPrice";
import { QMailMessages } from "./QMailMessages";
import { Explore } from "../Explore/Explore";
import ExploreIcon from "@mui/icons-material/Explore";

export const Home = ({
  name,
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

  const [checked1, setChecked1] = React.useState(false);
  const [checked2, setChecked2] = React.useState(false);
  React.useEffect(() => {
      if (balance && +balance >= 6) {
        setChecked1(true);
      }
    }, [balance]);
  
  
    React.useEffect(() => {
      if (name) setChecked2(true);
    }, [name]);
  
  
    const isLoaded = React.useMemo(()=> {
        if(userInfo !== null) return true
      return false
    }, [ userInfo])
  
    const hasDoneNameAndBalanceAndIsLoaded = React.useMemo(()=> {
      if(isLoaded && checked1 && checked2) return true
    return false
  }, [checked1, isLoaded, checked2])

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
            alignItems: "center",
            flexDirection: 'column',
            width: '100%'
          }}
        >
          <ThingsToDoInitial
            balance={balance}
            myAddress={myAddress}
            name={userInfo?.name}
            hasGroups={
              groups?.filter((item) => item?.groupId !== "0").length !== 0
            }
            userInfo={userInfo}

          />
          {/* <ListOfThreadPostsWatched /> */}
          <QortPrice />
          {hasDoneNameAndBalanceAndIsLoaded && (
            <>
            <Spacer height="20px" />
            <QMailMessages userAddress={userInfo?.address} userName={userInfo?.name} />
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
          
      <ListOfGroupPromotions />
        
        <Divider
          color="secondary"
          sx={{
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <ExploreIcon
              sx={{
                color: "white",
              }}
            />{" "}
            <Typography
              sx={{
                fontSize: "1rem",
              }}
            >
              Explore
            </Typography>{" "}
          </Box>
        </Divider>
           <Explore setMobileViewMode={setMobileViewMode} />

          </>
          )}
        </Box>
      )}
        
      <Spacer height="180px" />
    </Box>
  );
};
