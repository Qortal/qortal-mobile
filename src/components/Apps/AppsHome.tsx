import React, { useMemo, useState } from "react";
import {
  AppCircle,
  AppCircleContainer,
  AppCircleLabel,
  AppLibrarySubTitle,
  AppsContainer,
  AppsParent,
} from "./Apps-styles";
import { Avatar, Box, ButtonBase, Input } from "@mui/material";
import { Add } from "@mui/icons-material";
import { getBaseApiReact, isMobile } from "../../App";
import LogoSelected from "../../assets/svgs/LogoSelected.svg";
import { executeEvent } from "../../utils/events";
import { SortablePinnedApps } from "./SortablePinnedApps";
import { Spacer } from "../../common/Spacer";
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import { extractComponents } from "../Chat/MessageDisplay";

export const AppsHome = ({  setMode, myApp, myWebsite, availableQapps  }) => {
  const [qortalUrl, setQortalUrl] = useState('')

  const openQortalUrl = ()=> {
    try {
      if(!qortalUrl) return
      const res = extractComponents(qortalUrl);
      if (res) {
        const { service, name, identifier, path } = res;
        executeEvent("addTab", { data: { service, name, identifier, path } });
        executeEvent("open-apps-mode", { });
        setQortalUrl('qortal://')
      }
    } catch (error) {
      
    }
  }
  return (
    <>
    <AppsContainer
        sx={{
        
          justifyContent: "flex-start",
        }}
      >
    <AppLibrarySubTitle
   
  >
    Apps Dashboard

  </AppLibrarySubTitle>
  </AppsContainer>
  <Spacer height="20px" />
      <AppsContainer
        sx={{
        
          justifyContent: "flex-start",
          
        }}
      >
        <Box sx={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          backgroundColor: '#1f2023',
          padding: '4px 7px',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '500px'
        }}>
      <Input
              id="standard-adornment-name"
              value={qortalUrl}
              onChange={(e) => {
                setQortalUrl(e.target.value)
              }}
              disableUnderline
              autoComplete='off'
              autoCorrect='off'
              placeholder="qortal://"
              sx={{
                width: '100%',
                color: 'white',
                fontSize: '14px',
                '& .MuiInput-input::placeholder': {
                  color: 'rgba(84, 84, 84, 0.70) !important',
                  fontSize: '14px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '120%', // 24px
                  letterSpacing: '0.15px',
                  opacity: 1,
                },
                '&:focus': {
                  outline: 'none',
                },
                // Add any additional styles for the input here
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && qortalUrl) {
                  openQortalUrl();
                }
              }}
            />
            <ButtonBase onClick={()=> openQortalUrl()}>
              <ArrowOutwardIcon sx={{
                color: qortalUrl ? 'white' : 'rgba(84, 84, 84, 0.70)'
              }} />
            </ButtonBase>
            </Box>
            </AppsContainer>
  <Spacer height="20px" />

      <AppsContainer>
        <ButtonBase
          onClick={() => {
            setMode("library");
          }}
        >
          <AppCircleContainer sx={{
              gap: !isMobile ? "10px" : "5px",
            }}>
            <AppCircle>
              <Add>+</Add>
            </AppCircle>
            <AppCircleLabel>Library</AppCircleLabel>
          </AppCircleContainer>
        </ButtonBase>
       
        <SortablePinnedApps availableQapps={availableQapps} myWebsite={myWebsite} myApp={myApp}  />
    
      </AppsContainer>
      </>
  );
};
