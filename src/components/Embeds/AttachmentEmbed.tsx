import React, { useContext } from "react";
import { MyContext, getBaseApiReact } from "../../App";
import {
  Card,
  CardContent,
  Typography,
  Box,
  ButtonBase,
  Divider,
  CircularProgress,
  LinearProgress,
  useTheme,
  Chip,
} from "@mui/material";
import { base64ToBlobUrl } from "../../utils/fileReading";
import { saveFileToDiskGeneric } from "../../utils/generateWallet/generateWallet";
import AttachmentIcon from '@mui/icons-material/Attachment';
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import { CustomLoader } from "../../common/CustomLoader";
import { Spacer } from "../../common/Spacer";
import { FileAttachmentContainer, FileAttachmentFont } from "./Embed-styles";
import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from '@mui/icons-material/Save';
import { decodeIfEncoded } from "../../utils/decode";
import { isNative } from "../Apps/useQortalMessageListener";
import { saveFileFromQDNLocation } from "../../qortalRequests/get";


export const AttachmentCard = ({
    resourceData,
    resourceDetails,
    owner,
    openExternal,
    external,
    isLoadingParent,
    errorMsg,
    encryptionType,
    setInfoSnack,
    setOpenSnack,
    selectedGroupId
  }) => {

    const { downloadResource } = useContext(MyContext);
    const theme = useTheme();

    const formatETA = (seconds: number | undefined) => {
      if (!seconds || seconds <= 0) return null;

      if (seconds < 60) {
        return `${Math.round(seconds)}s`;
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
      } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
      }
    };
  
    const saveToDisk = async ()=> {
      const { name, service, identifier } = resourceData;
      
      await saveFileFromQDNLocation({
        location: { service, name, identifier },
        filename: resourceData?.fileName,
        mimeType: resourceData?.mimeType,
        snackMethods: { setOpenSnack, setInfoSnack }
      });
    }
  
    const saveToDiskEncrypted = async ()=> {
      let blobUrl
      try {
        const { name, service, identifier,key } = resourceData;
  
        const url = `${getBaseApiReact()}/arbitrary/${service}/${name}/${identifier}?encoding=base64`;
        const res = await fetch(url)
        const data = await res.text();
        let decryptedData
        try {
          if(key && encryptionType === 'private'){
            decryptedData = await window.sendMessage(
              "DECRYPT_DATA_WITH_SHARING_KEY",
             
                {
                  encryptedData: data,
                key: decodeURIComponent(key),
                }
              
            );
          }
           if(encryptionType === 'group'){
            decryptedData = await window.sendMessage(
              "DECRYPT_QORTAL_GROUP_DATA",
             
                {
                  data64: data,
                groupId:  selectedGroupId,
                }
              
            );
           }
        } catch (error) {
          throw new Error('Unable to decrypt')
        }
        
        if (!decryptedData || decryptedData?.error) throw new Error("Could not decrypt data");
         blobUrl = base64ToBlobUrl(decryptedData, resourceData?.mimeType)
        const response = await fetch(blobUrl);
      const blob = await response.blob();
      setOpenSnack(true)
      setInfoSnack({
        type: "info",
        message:
          "Saving file...",
      });
        await saveFileToDiskGeneric(blob,  resourceData?.fileName)
        setOpenSnack(true)
        setInfoSnack({
          type: "success",
          message:
          isNative ?  "File saved in INTERNAL STORAGE, DOCUMENT folder." : "File downloaded",
        });
      } catch (error) {
        console.error(error)
      } finally {
        if(blobUrl){
          URL.revokeObjectURL(blobUrl);
        }
  
      }
    }
    return (
      <Card
        sx={{
          backgroundColor: "#1F2023",
          height: "250px",
          // height: isOpen ? "auto" : "150px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px 0px 16px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AttachmentIcon
              sx={{
                color: "white",
              }}
            />
            <Typography>ATTACHMENT embed</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {resourceDetails?.status?.status === 'FAILED_TO_DOWNLOAD' && (
              <ButtonBase>
                <RefreshIcon
                  onClick={() => downloadResource(resourceData)}
                  sx={{
                    fontSize: "24px",
                    color: theme.palette.text.primary,
                  }}
                />
              </ButtonBase>
            )}

            {external && (
              <ButtonBase>
                <OpenInNewIcon
                  onClick={openExternal}
                  sx={{
                    fontSize: "24px",
                    color: "white",
                  }}
                />
              </ButtonBase>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            padding: "8px 16px 8px 16px",
          }}
        >
          <Typography
            sx={{
              fontSize: "12px",
              color: "white",
            }}
          >
            Created by {decodeIfEncoded(owner)}
          </Typography>
          <Typography
            sx={{
              fontSize: "12px",
              color: "cadetblue",
            }}
          >
                      {encryptionType === 'private' ? "ENCRYPTED" : encryptionType === 'group' ? 'GROUP ENCRYPTED' : "Not encrypted"}

          </Typography>

          {/* Show peer count and ETA during download */}
          {resourceDetails?.status?.status &&
            !['READY', 'FAILED_TO_DOWNLOAD'].includes(
              resourceDetails.status.status
            ) && (
              <Box
                sx={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {resourceDetails?.status?.numberOfPeers !== undefined && (
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${resourceDetails.status.numberOfPeers} pending peer${resourceDetails.status.numberOfPeers !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                      height: '20px',
                      fontSize: '11px',
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.08)',
                    }}
                  />
                )}
                {resourceDetails?.status?.estimatedTimeRemaining != null &&
                  formatETA(resourceDetails.status.estimatedTimeRemaining) && (
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={formatETA(
                        resourceDetails.status.estimatedTimeRemaining
                      )}
                      size="small"
                      sx={{
                        height: '20px',
                        fontSize: '11px',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.08)',
                      }}
                    />
                  )}
              </Box>
            )}
        </Box>
        <Divider sx={{ borderColor: "rgb(255 255 255 / 10%)" }} />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            alignItems: "center",
          }}
        >
         
          {isLoadingParent && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {" "}
              <CustomLoader />{" "}
            </Box>
          )}
          {errorMsg && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {" "}
              <Typography
                sx={{
                  fontSize: "14px",
                  color: "var(--danger)",
                }}
              >
                {errorMsg}
              </Typography>{" "}
            </Box>
          )}
        </Box>
  
        <Box>
          <CardContent>
          {resourceData?.fileName && (
                <>
               <Typography sx={{
                  fontSize: '14px'
                }}>{resourceData?.fileName}</Typography>
                <Spacer height="10px" />
                </>
              )}
            <ButtonBase sx={{
              width: '90%',
              maxWidth: '400px'
            }} onClick={()=> {
            if(resourceDetails?.status?.status === 'READY'){
              if(encryptionType){
                saveToDiskEncrypted()
                return
              }
              saveToDisk()
              return
            }
            downloadResource(resourceData)
          }}>
             
          <FileAttachmentContainer >
            {!resourceDetails && (
              <>
                        <DownloadIcon />
                        <FileAttachmentFont sx={{
                          fontSize: '14px'
                        }}>Download File</FileAttachmentFont>
  
              </>
            )}

             {resourceDetails && resourceDetails?.status?.status !== 'READY' && resourceDetails?.status?.status !== 'FAILED_TO_DOWNLOAD' && (
              <>
                        <CircularProgress sx={{
                          color: 'white'
                        }} size={20} />
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                          }}
                        >
                          <FileAttachmentFont sx={{
                            fontSize: '14px'
                          }}>
                            Downloading: {Number(resourceDetails?.status?.percentLoaded || 0).toFixed(2)}%
                          </FileAttachmentFont>
                          <LinearProgress
                            variant="determinate"
                            value={resourceDetails?.status?.percentLoaded || 0}
                            sx={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                            }}
                          />
                        </Box>
  
              </>
            )}

            {resourceDetails && resourceDetails?.status?.status === 'READY' &&  (
              <>
                        <SaveIcon />
                        <FileAttachmentFont sx={{
                          fontSize: '14px'
                        }}>Save to Disk</FileAttachmentFont>
  
              </>
            )}

            {resourceDetails && resourceDetails?.status?.status === 'FAILED_TO_DOWNLOAD' && (
              <>
                        <RefreshIcon />
                        <FileAttachmentFont sx={{
                          fontSize: '14px'
                        }}>Video failed</FileAttachmentFont>
  
              </>
            )}
               
              
              </FileAttachmentContainer>
              </ButtonBase>
              
          </CardContent>
        </Box>
      </Card>
    );
  };