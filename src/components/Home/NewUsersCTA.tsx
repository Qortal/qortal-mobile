import { Box, ButtonBase, Typography } from "@mui/material";
import React from "react";
import { Spacer } from "../../common/Spacer";

export const NewUsersCTA = ({ balance }) => {
  if (balance === undefined || +balance > 0) return null;
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Spacer height="40px" />

      <Box
        sx={{
          width: "320px",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
          padding: "15px",
          outline: "1px solid gray",
          borderRadius: "4px",
        }}
      >
        <Typography
          sx={{
            textAlign: "center",
            fontSize: "1.2rem",
            fontWeight: "bold",
          }}
        >
          Are you a new user?
        </Typography>
        <Spacer height="20px" />
        <Typography>
          Please message us on Telegram or Discord if you need 4 QORT to start
          chatting without any limitations
        </Typography>
        <Spacer height="20px" />
        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          <ButtonBase
            sx={{
              textDecoration: "underline",
            }}
            onClick={() => {
              if (chrome && chrome.tabs) {
                chrome.tabs.create({ url: "https://link.qortal.dev/telegram-invite" }, (tab) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error opening tab:", chrome.runtime.lastError);
                  } else {
                    console.log("Tab opened successfully:", tab);
                  }
                });
              }
          
            }}
          >
            Telegram
          </ButtonBase>
          <ButtonBase
            sx={{
              textDecoration: "underline",
            }}
            onClick={() => {
              if (chrome && chrome.tabs) {
                chrome.tabs.create({ url: "https://link.qortal.dev/discord-invite" }, (tab) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error opening tab:", chrome.runtime.lastError);
                  } else {
                    console.log("Tab opened successfully:", tab);
                  }
                });
              }
            }}
          >
            Discord
          </ButtonBase>
        </Box>
      </Box>
    </Box>
  );
};
