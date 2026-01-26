import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AppsIcon from "@mui/icons-material/Apps";
import {Box, ButtonBase, Typography} from "@mui/material";
import React from "react";
import qTradeLogo from "../../assets/Icons/q-trade-logo.webp";
import {executeEvent} from "../../utils/events";


export const Explore = ({setMobileViewMode}) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
        justifyContent: 'center',
        padding: '10px'
      }}
    >
      <ButtonBase
        sx={{
          "&:hover": { backgroundColor: "secondary.main" },
          transition: "all 0.1s ease-in-out",
          padding: "5px",
          borderRadius: "5px",
          gap: "5px",
        }}
        onClick={async () => {
            executeEvent("addTab", {
              data: { service: "APP", name: "q-trade" },
            });
            executeEvent("open-apps-mode", {});
          }}
      >
        <img
          style={{
            borderRadius: "50%",
            height: '30px'
          }}
          src={qTradeLogo}
        />
        <Typography
          sx={{
            fontSize: "1rem",
          }}
        >
          Trade QORT
        </Typography>
      </ButtonBase>
      <ButtonBase
        sx={{
          "&:hover": { backgroundColor: "secondary.main" },
          transition: "all 0.1s ease-in-out",
          padding: "5px",
          borderRadius: "5px",
          gap: "5px",
        }}
         onClick={()=> {
            setMobileViewMode('apps')

         }}
      >
        <AppsIcon
          sx={{
            color: "white",
          }}
        />
        <Typography
          sx={{
            fontSize: "1rem",
          }}
        >
          See Apps
        </Typography>
      </ButtonBase>
      <ButtonBase
        sx={{
          "&:hover": { backgroundColor: "secondary.main" },
          transition: "all 0.1s ease-in-out",
          padding: "5px",
          borderRadius: "5px",
          gap: "5px",
        }}
        onClick={async () => {
            executeEvent("openWalletsApp", {
           
            });
          }}
      >
        <AccountBalanceWalletIcon
          sx={{
            color: "white",
          }}
        />
        <Typography
          sx={{
            fontSize: "1rem",
          }}
        >
          Wallets
        </Typography>
      </ButtonBase>
    </Box>
  );
};
