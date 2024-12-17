import React, { useCallback, useEffect,  useRef,  useState } from "react";
import {
  Card,
  CardContent,
  Typography,

  Box,
  ButtonBase,
  Divider,
  Dialog,
  IconButton,

} from "@mui/material";
import QuickPinchZoom,  { make3dTransformValue } from "react-quick-pinch-zoom";


import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { CustomLoader } from "../../common/CustomLoader";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import { decodeIfEncoded } from "../../utils/decode";

export const ImageCard = ({
    image,
    fetchImage,
    owner,
    refresh,
    openExternal,
    external,
    isLoadingParent,
    errorMsg,
    encryptionType,
  }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [height, setHeight] = useState('400px')
    useEffect(() => {
      if (isOpen) {
        fetchImage();
      }
    }, [isOpen]);
  
    // useEffect(()=> {
    //   if(errorMsg){
    //     setHeight('300px')
    //   }
    // }, [errorMsg])
  
    return (
      <Card
        sx={{
          backgroundColor: "#1F2023",
          height: height,
          transition: "height 0.6s ease-in-out",
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
            <ImageIcon
              sx={{
                color: "white",
              }}
            />
            <Typography>IMAGE embed</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ButtonBase>
              <RefreshIcon
                onClick={refresh}
                sx={{
                  fontSize: "24px",
                  color: "white",
                }}
              />
            </ButtonBase>
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
     
          {isLoadingParent && isOpen && (
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
            <ImageViewer  src={image}  />
          </CardContent>
        </Box>
      </Card>
    );
  };

  export function ImageViewer({ src, alt = "" }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const imgRef = useRef(null);
  
    const handleOpenFullscreen = () => setIsFullscreen(true);
    const handleCloseFullscreen = () => setIsFullscreen(false);
  
    const onUpdate = ({ x, y, scale }) => {
      const img = imgRef.current;
      if (img) {
        const transformValue = make3dTransformValue({ x, y, scale });
        img.style.transform = transformValue;
      }
    };
  
  
    return (
      <>
        <Box
          sx={{
            maxWidth: "100%",
            display: "flex",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={handleOpenFullscreen}
        >
          <img
            src={src}
            alt={alt}
            style={{
              maxWidth: "100%",
              maxHeight: "450px", 
              objectFit: "contain", // Preserve aspect ratio
            }}
          />
        </Box>
  
        {/* Fullscreen Viewer */}
        <Dialog
          open={isFullscreen}
          onClose={handleCloseFullscreen}
          maxWidth="lg"
          fullWidth
          fullScreen
          sx={{
            "& .MuiDialog-paper": {
              margin: 0,
              maxWidth: "100%",
              width: "100%",
              height: "100vh",
              overflow: "hidden", 
            },
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              backgroundColor: "#000", 
            }}
          >
            {/* Close Button */}
            <IconButton
              onClick={handleCloseFullscreen}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 10,
                color: "white",
                background: 'rgb(29, 29, 29)',
                borderRadius: '50%',
                padding: '5px'
              }}
            >
              <CloseIcon />
            </IconButton>
  
            {/* Fullscreen Image with Pinch-Zoom */}
            <QuickPinchZoom onUpdate={onUpdate}>
              <img
                ref={imgRef}
                src={src}
                alt={alt}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  touchAction: "none", // Allow gestures directly on the image
                }}
              />
            </QuickPinchZoom>
          </Box>
        </Dialog>
      </>
    );
  }