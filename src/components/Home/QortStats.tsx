import { getBaseApiReact } from "../../App";
import { Box, Typography } from "@mui/material";
import { BarSpinner } from "../../common/Spinners/BarSpinner/BarSpinner";
import { formatDate } from "../../utils/time";
import React, { useCallback, useEffect, useState } from "react";

function formatWithCommasAndDecimals(number: string) {
  const num = parseFloat(number);
  if (isNaN(num)) return number;
  return num.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export const QortStats = () => {
  const [supply, setSupply] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<{ timestamp?: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const getLastBlock = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBaseApiReact()}/blocks/last`);
      const data = await response.json();
      setLastBlock(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSupplyInCirculation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getBaseApiReact()}/stats/supply/circulating`
      );
      const data = await response.text();
      setSupply(formatWithCommasAndDecimals(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSupplyInCirculation();
    getLastBlock();
    const interval = setInterval(() => {
      getSupplyInCirculation();
      getLastBlock();
    }, 900000);
    return () => clearInterval(interval);
  }, [getLastBlock, getSupplyInCirculation]);

  return (
    <Box
      sx={{
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
        flexDirection: "column",
        width: "322px",
      }}
    >
      <Box
        sx={{
          width: "322px",
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontSize: "1rem", fontWeight: "bold" }}>
          Supply
        </Typography>
        {supply === null ? (
          <BarSpinner width="16px" color="white" />
        ) : (
          <Typography sx={{ fontSize: "1rem" }}>{supply} QORT</Typography>
        )}
      </Box>
      <Box
        sx={{
          width: "322px",
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontSize: "1rem", fontWeight: "bold" }}>
          Last block
        </Typography>
        {!lastBlock ? (
          <BarSpinner width="16px" color="white" />
        ) : (
          <Typography sx={{ fontSize: "1rem" }}>
            {lastBlock?.timestamp
              ? formatDate(lastBlock.timestamp)
              : "—"}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
