import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import Chromecast from "../plugins/ChromecastPlugin";
import { ProxyServer } from "../plugins/ProxyServer";
import { ForegroundService } from "../plugins/ForegroundService";
import { getBaseApiReact } from "../App";

interface VideoMetadata {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  contentType?: string;
}

interface VideoInfo extends VideoMetadata {
  url: string;
}

interface PlaybackState {
  state: "IDLE" | "BUFFERING" | "PLAYING" | "PAUSED";
  position?: number;
  duration?: number;
}

interface ChromecastContextType {
  isInitialized: boolean;
  isConnected: boolean;
  deviceName: string | null;
  isCasting: boolean;
  currentVideo: VideoInfo | null;
  playbackState: PlaybackState;
  isConnecting: boolean;
  isPlayerMinimized: boolean;

  // Actions
  initialize: () => Promise<void>;
  castVideo: (
    url: string,
    metadata?: VideoMetadata
  ) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  showDevicePicker: () => Promise<void>;
  showPlayer: () => void;
  hidePlayer: () => void;
}

const ChromecastContext = createContext<ChromecastContextType | null>(null);

export const useChromecast = () => {
  const context = useContext(ChromecastContext);
  if (!context) {
    throw new Error("useChromecast must be used within ChromecastProvider");
  }
  return context;
};

interface ChromecastProviderProps {
  children: React.ReactNode;
}

export const ChromecastProvider: React.FC<ChromecastProviderProps> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    state: "IDLE",
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [proxyPort, setProxyPort] = useState<number | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // AV1 warning dialog state
  const [showAV1Warning, setShowAV1Warning] = useState(false);
  const [pendingCastInfo, setPendingCastInfo] = useState<{
    url: string;
    contentType: string;
    metadata?: VideoMetadata;
  } | null>(null);

  // Initialize Chromecast on mount
  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      console.log("[ChromecastContext] Initializing...");
      const result = await Chromecast.initialize();

      if (result.success) {
        setIsInitialized(true);
        console.log("[ChromecastContext] Initialized successfully");

        // Check if already connected
        const connectedState = await Chromecast.isConnected();
        if (connectedState.connected && connectedState.deviceName) {
          setIsConnected(true);
          setDeviceName(connectedState.deviceName);
          console.log(
            "[ChromecastContext] Already connected to:",
            connectedState.deviceName
          );
        }
      }
    } catch (error) {
      console.error("[ChromecastContext] Failed to initialize:", error);
    }
  }, [isInitialized]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Listen for cast state changes (e.g., TV disconnection)
  useEffect(() => {
    if (!isInitialized) return;

    let listenerId: string | null = null;

    const setupListener = async () => {
      try {
        const result = await Chromecast.addListener(
          "castStateChanged",
          (data) => {
            console.log("[ChromecastContext] Cast state changed:", data);

            // Handle different cast states from Android plugin
            switch (data.state) {
              case "CONNECTING":
                console.log("[ChromecastContext] Connecting to device...");
                setIsConnecting(true);
                break;

              case "CONNECTED":
                console.log(
                  "[ChromecastContext] Connected to:",
                  data.deviceName
                );
                setIsConnected(true);
                setIsConnecting(false);
                if (data.deviceName) {
                  setDeviceName(data.deviceName);
                }
                break;

              case "DISCONNECTING":
                console.log("[ChromecastContext] Disconnecting...");
                break;

              case "DISCONNECTED":
              case "ERROR":
              case "SUSPENDED":
                // Device disconnected, error, or session suspended - clean up state
                console.log(
                  "[ChromecastContext] Session ended/error, cleaning up state"
                );

                // Stop foreground service
                ForegroundService.stopCastingService().catch((err) => {
                  console.error(
                    "[ChromecastContext] Failed to stop foreground service:",
                    err
                  );
                });

                // Stop proxy server if running
                ProxyServer.getProxyInfo()
                  .then((info) => {
                    if (info.isRunning) {
                      console.log(
                        "[ChromecastContext] Stopping proxy after disconnect"
                      );
                      ProxyServer.stopProxy().catch((err) => {
                        console.error(
                          "[ChromecastContext] Failed to stop proxy:",
                          err
                        );
                      });
                    }
                  })
                  .catch((err) => {
                    console.error(
                      "[ChromecastContext] Failed to get proxy info:",
                      err
                    );
                  });

                setIsConnected(false);
                setDeviceName(null);
                setIsCasting(false);
                setCurrentVideo(null);
                setPlaybackState({ state: "IDLE" });
                setIsPlayerMinimized(false);
                setIsConnecting(false);
                setProxyPort(null);
                break;
            }
          }
        );

        listenerId = result.id;
        console.log(
          "[ChromecastContext] Cast state listener registered:",
          listenerId
        );
      } catch (error) {
        console.error(
          "[ChromecastContext] Failed to setup cast state listener:",
          error
        );
      }
    };

    setupListener();

    return () => {
      // Cleanup listener on unmount
      if (listenerId) {
        Chromecast.removeAllListeners().catch((error) => {
          console.error(
            "[ChromecastContext] Failed to remove listeners:",
            error
          );
        });
      }
    };
  }, [isInitialized]);

  // Poll playback state when casting
  useEffect(() => {
    if (!isCasting) {
      console.log("[ChromecastContext] Not polling - isCasting is false");
      return;
    }

    console.log("[ChromecastContext] Starting playback state polling...");
    const interval = setInterval(async () => {
      try {
        const state = await Chromecast.getPlaybackState();
        console.log("[ChromecastContext] Playback state update:", state);
        setPlaybackState(state);
      } catch (error) {
        console.error(
          "[ChromecastContext] Failed to get playback state:",
          error
        );
      }
    }, 1000);

    return () => {
      console.log("[ChromecastContext] Stopping playback state polling");
      clearInterval(interval);
    };
  }, [isCasting]);

  /**
   * Detect video MIME type and codec from URL or file headers
   */
  const detectVideoMimeType = useCallback(
    async (url: string): Promise<string> => {
      console.log("[ChromecastContext] Detecting MIME type for:", url);

      try {
        // First, try to detect from URL/file extension
        const urlLower = url.toLowerCase();

        // WebM container (VP8, VP9, or AV1)
        if (urlLower.includes(".webm") || urlLower.includes("video/webm")) {
          // Check URL for codec hints
          if (urlLower.includes("av1") || urlLower.includes("av01")) {
            console.log(
              "[ChromecastContext] Detected AV1 codec in WebM from URL"
            );
            return 'video/webm; codecs="av01.0.05M.08"';
          } else if (urlLower.includes("vp9")) {
            console.log(
              "[ChromecastContext] Detected VP9 codec in WebM from URL"
            );
            return 'video/webm; codecs="vp9"';
          } else if (urlLower.includes("vp8")) {
            console.log(
              "[ChromecastContext] Detected VP8 codec in WebM from URL"
            );
            return 'video/webm; codecs="vp8"';
          }
          console.log(
            "[ChromecastContext] WebM container without specific codec info"
          );
          return "video/webm"; // Generic WebM
        }

        // Matroska/MKV container
        if (urlLower.includes(".mkv")) {
          console.log("[ChromecastContext] Detected MKV container from URL");
          return "video/x-matroska";
        }

        // MP4 container - check URL for specific codecs
        if (urlLower.includes(".mp4") || urlLower.includes("video/mp4")) {
          if (urlLower.includes("av1") || urlLower.includes("av01")) {
            console.log(
              "[ChromecastContext] Detected AV1 codec in MP4 from URL"
            );
            return 'video/mp4; codecs="av01.0.05M.08"';
          } else if (
            urlLower.includes("hevc") ||
            urlLower.includes("h265") ||
            urlLower.includes("hev1")
          ) {
            console.log(
              "[ChromecastContext] Detected HEVC/H.265 codec in MP4 from URL"
            );
            return 'video/mp4; codecs="hev1.1.6.L120.90"';
          } else if (urlLower.includes("h264") || urlLower.includes("avc1")) {
            console.log(
              "[ChromecastContext] Detected H.264/AVC codec in MP4 from URL"
            );
            return 'video/mp4; codecs="avc1.64001F"';
          }
        }

        // OGG/Theora
        if (urlLower.includes(".ogv") || urlLower.includes(".ogg")) {
          console.log("[ChromecastContext] Detected OGG container from URL");
          return "video/ogg";
        }

        // MPEG
        if (urlLower.includes(".mpg") || urlLower.includes(".mpeg")) {
          console.log("[ChromecastContext] Detected MPEG container from URL");
          return "video/mpeg";
        }

        // No extension or codec hint in URL - inspect file headers
        console.log(
          "[ChromecastContext] No codec info in URL, inspecting file headers..."
        );
        try {
          const response = await fetch(url, {
            headers: { Range: "bytes=0-63" },
          });

          if (!response.ok) {
            console.warn(
              "[ChromecastContext] Failed to fetch file headers:",
              response.status
            );
            return "video/mp4"; // Fallback
          }

          const buffer = await response.arrayBuffer();
          const bytes = new Uint8Array(buffer);

          // Check for WebM/Matroska signature (0x1A 0x45 0xDF 0xA3)
          if (
            bytes.length >= 4 &&
            bytes[0] === 0x1a &&
            bytes[1] === 0x45 &&
            bytes[2] === 0xdf &&
            bytes[3] === 0xa3
          ) {
            console.log(
              "[ChromecastContext] Detected WebM/Matroska from file signature"
            );
            // Would need more parsing to determine codec from EBML
            return "video/webm";
          }

          // Check for MP4 signature (ftyp box starting at byte 4)
          if (
            bytes.length >= 12 &&
            bytes[4] === 0x66 &&
            bytes[5] === 0x74 &&
            bytes[6] === 0x79 &&
            bytes[7] === 0x70
          ) {
            console.log("[ChromecastContext] Detected MP4 from file signature");

            // Read the ftyp box to check for codec brands
            const ftypData = String.fromCharCode(
              ...bytes.slice(8, Math.min(bytes.length, 64))
            );

            if (ftypData.includes("av01")) {
              console.log(
                "[ChromecastContext] ✅ Found AV1 codec in MP4 ftyp box!"
              );
              return 'video/mp4; codecs="av01.0.05M.08"';
            } else if (ftypData.includes("hev1") || ftypData.includes("hvc1")) {
              console.log(
                "[ChromecastContext] Found HEVC codec in MP4 ftyp box"
              );
              return 'video/mp4; codecs="hev1.1.6.L120.90"';
            } else if (ftypData.includes("avc1")) {
              console.log(
                "[ChromecastContext] Found H.264 codec in MP4 ftyp box"
              );
              return 'video/mp4; codecs="avc1.64001F"';
            } else if (ftypData.includes("vp09")) {
              console.log(
                "[ChromecastContext] Found VP9 codec in MP4 ftyp box"
              );
              return 'video/mp4; codecs="vp09.00.10.08"';
            }

            console.log(
              "[ChromecastContext] MP4 file but could not determine codec from ftyp"
            );
            return "video/mp4"; // Generic MP4
          }
        } catch (fetchError) {
          console.error(
            "[ChromecastContext] Error fetching file headers:",
            fetchError
          );
        }

        // Default to MP4 if we can't determine
        console.log(
          "[ChromecastContext] Could not determine MIME type, defaulting to video/mp4"
        );
        return "video/mp4";
      } catch (error) {
        console.error("[ChromecastContext] Error detecting MIME type:", error);
        return "video/mp4"; // Fallback
      }
    },
    []
  );

  // Convert localhost URLs to network IP with proxy
  const convertUrlForChromecast = useCallback(
    async (url: string): Promise<string> => {
      console.log(
        "[ChromecastContext] convertUrlForChromecast called with URL:",
        url
      );

      // If it's already a full HTTP/HTTPS URL with localhost or 127.0.0.1, use proxy
      if (url.includes("localhost") || url.includes("127.0.0.1")) {
        console.log(
          "[ChromecastContext] Detected localhost URL, starting proxy conversion"
        );
        try {
          // Extract the port from the localhost URL
          const urlObj = new URL(url);
          const localhostPort = urlObj.port || "80";
          console.log(
            "[ChromecastContext] Extracted localhost port:",
            localhostPort
          );

          // Start proxy server if not already running
          let currentProxyPort = proxyPort;
          if (!currentProxyPort) {
            console.log(
              "[ChromecastContext] Starting proxy server for localhost:",
              localhostPort
            );
            const proxyResult = await ProxyServer.startProxy({
              port: 0, // Auto-assign port
              targetHost: "localhost",
              targetPort: parseInt(localhostPort, 10),
            });

            if (proxyResult.success && proxyResult.port) {
              currentProxyPort = proxyResult.port;
              setProxyPort(currentProxyPort);
              console.log(
                "[ChromecastContext] Proxy server started on port:",
                currentProxyPort
              );
            } else {
              console.error(
                "[ChromecastContext] Failed to start proxy server, result:",
                proxyResult
              );
              return url; // Fallback to original URL
            }
          } else {
            console.log(
              "[ChromecastContext] Reusing existing proxy on port:",
              currentProxyPort
            );
          }

          // Get device's network IP from Android
          console.log("[ChromecastContext] Getting device network IP...");
          const { NetworkInfo } = await import("../plugins/NetworkInfo");
          const networkInfo = await NetworkInfo.getLocalIpAddress();
          console.log("[ChromecastContext] Network info result:", networkInfo);

          if (
            networkInfo.success &&
            networkInfo.ipAddress &&
            currentProxyPort
          ) {
            // Replace localhost with device IP and use proxy port
            const convertedUrl = url
              .replace(
                /localhost:\d+/,
                `${networkInfo.ipAddress}:${currentProxyPort}`
              )
              .replace(
                /127\.0\.0\.1:\d+/,
                `${networkInfo.ipAddress}:${currentProxyPort}`
              );

            console.log(
              "[ChromecastContext] ✅ Converted URL via proxy:",
              url,
              "→",
              convertedUrl
            );
            return convertedUrl;
          } else {
            console.warn(
              "[ChromecastContext] ⚠️ Could not get device IP or proxy port, using original URL"
            );
            console.warn(
              "[ChromecastContext] networkInfo:",
              networkInfo,
              "proxyPort:",
              currentProxyPort
            );
          }
        } catch (error) {
          console.error("[ChromecastContext] ❌ Failed to convert URL:", error);
        }
      } else {
        console.log(
          "[ChromecastContext] URL does not contain localhost, no conversion needed"
        );
      }

      // If it's a relative URL, convert to full Qortal node URL
      if (url.startsWith("/arbitrary/")) {
        console.log("[ChromecastContext] Converting relative URL to full URL");
        const baseUrl = getBaseApiReact();
        const fullUrl = `${baseUrl}${url}`;
        console.log("[ChromecastContext] Created full URL:", fullUrl);
        // Recursively convert in case baseUrl contains localhost
        return convertUrlForChromecast(fullUrl);
      }

      console.log("[ChromecastContext] Returning original URL:", url);
      return url;
    },
    [proxyPort]
  );

  const showDevicePicker = useCallback(async () => {
    if (!isInitialized) {
      await initialize();
    }

    setIsConnecting(true);
    try {
      console.log("[ChromecastContext] Showing device picker...");
      const result = await Chromecast.connect();

      if (result.success && result.deviceName) {
        setIsConnected(true);
        setDeviceName(result.deviceName);
        console.log("[ChromecastContext] Connected to:", result.deviceName);
      } else {
        console.log("[ChromecastContext] Connection cancelled or failed");
      }
    } catch (error) {
      console.error("[ChromecastContext] Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [isInitialized, initialize]);

  // Helper function to actually perform the cast (used by castVideo and AV1 confirmation)
  const performActualCast = useCallback(
    async (
      convertedUrl: string,
      contentType: string,
      metadata?: VideoMetadata
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log(
          "[ChromecastContext] Performing cast with contentType:",
          contentType
        );

        const result = await Chromecast.castVideo({
          url: convertedUrl,
          title: metadata?.title,
          subtitle: metadata?.subtitle,
          imageUrl: metadata?.imageUrl,
          contentType: contentType,
        });

        if (result.success) {
          setIsCasting(true);
          setCurrentVideo({
            url: convertedUrl,
            ...metadata,
            contentType,
          });
          setIsPlayerMinimized(false); // Show player when new video starts

          // Start foreground service to keep app alive while casting
          try {
            await ForegroundService.startCastingService({
              deviceName: deviceName || "Chromecast",
              videoTitle: metadata?.title || "Video",
            });
            console.log("[ChromecastContext] Foreground service started");
          } catch (serviceError) {
            console.warn(
              "[ChromecastContext] Failed to start foreground service:",
              serviceError
            );
            // Continue anyway, video will still cast but app might be killed
          }

          console.log("[ChromecastContext] Video cast successfully");
          return { success: true };
        } else {
          console.log(
            "[ChromecastContext] Cast failed - native plugin returned success=false"
          );
          // Stop proxy if cast failed
          if (proxyPort) {
            console.log("[ChromecastContext] Stopping proxy after failed cast");
            await ProxyServer.stopProxy();
            setProxyPort(null);
          }
          return { success: false, error: "Failed to cast video" };
        }
      } catch (error: unknown) {
        console.error(
          "[ChromecastContext] Failed in performActualCast:",
          error
        );
        // Stop proxy on error
        if (proxyPort) {
          console.log("[ChromecastContext] Stopping proxy after cast error");
          try {
            await ProxyServer.stopProxy();
          } catch (proxyError) {
            console.error(
              "[ChromecastContext] Failed to stop proxy:",
              proxyError
            );
          }
          setProxyPort(null);
        }
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    [deviceName, proxyPort]
  );

  const castVideo = useCallback(
    async (
      url: string,
      metadata?: VideoMetadata
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!isInitialized) {
          await initialize();
        }

        // Check current connection state from native plugin (not React state)
        const currentConnectionState = await Chromecast.isConnected();

        // If not connected, show device picker first
        if (!currentConnectionState.connected) {
          console.log(
            "[ChromecastContext] Not connected, showing device picker..."
          );
          await showDevicePicker();

          // Check if connection was successful after picker
          const connectedState = await Chromecast.isConnected();
          if (!connectedState.connected) {
            console.log(
              "[ChromecastContext] No device selected or connection failed"
            );
            return {
              success: false,
              error: "No device selected or connection failed",
            };
          }

          // Update React state to match native state
          console.log(
            "[ChromecastContext] Updating connection state after picker"
          );
          setIsConnected(true);
          if (connectedState.deviceName) {
            setDeviceName(connectedState.deviceName);
          }
        } else {
          console.log(
            "[ChromecastContext] Already connected to:",
            currentConnectionState.deviceName
          );
          // Ensure React state matches native state
          if (!isConnected) {
            setIsConnected(true);
            setDeviceName(currentConnectionState.deviceName || null);
          }
        }

        // Convert URL for network access
        const convertedUrl = await convertUrlForChromecast(url);

        // Detect MIME type if not provided
        let contentType = metadata?.contentType;
        if (!contentType) {
          console.log(
            "[ChromecastContext] No contentType provided, detecting..."
          );
          contentType = await detectVideoMimeType(convertedUrl);
          console.log("[ChromecastContext] Detected contentType:", contentType);
        } else {
          console.log(
            "[ChromecastContext] Using provided contentType:",
            contentType
          );
        }

        // Check if it's AV1 - show warning modal
        if (contentType.includes("av01")) {
          console.log(
            "[ChromecastContext] ⚠️ AV1 codec detected, showing warning modal"
          );

          // Store the pending cast info for user confirmation
          setPendingCastInfo({
            url: convertedUrl,
            contentType,
            metadata,
          });
          setShowAV1Warning(true);

          // Return pending state (will continue if user confirms)
          return { success: false, error: "AV1 confirmation pending" };
        }

        // Not AV1, proceed with normal casting
        return await performActualCast(convertedUrl, contentType, metadata);
      } catch (error: unknown) {
        console.error("[ChromecastContext] Failed to cast video:", error);
        // Stop proxy on error
        if (proxyPort) {
          console.log("[ChromecastContext] Stopping proxy after cast error");
          try {
            await ProxyServer.stopProxy();
          } catch (proxyError) {
            console.error(
              "[ChromecastContext] Failed to stop proxy:",
              proxyError
            );
          }
          setProxyPort(null);
        }
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    [
      isInitialized,
      isConnected,
      initialize,
      showDevicePicker,
      convertUrlForChromecast,
      detectVideoMimeType,
      performActualCast,
      proxyPort,
    ]
  );

  // Handler for when user confirms AV1 warning and wants to proceed
  const handleAV1Proceed = useCallback(async () => {
    console.log("[ChromecastContext] User confirmed AV1 cast, proceeding...");
    setShowAV1Warning(false);

    if (!pendingCastInfo) {
      console.error("[ChromecastContext] No pending cast info!");
      return;
    }

    // Proceed with casting
    await performActualCast(
      pendingCastInfo.url,
      pendingCastInfo.contentType,
      pendingCastInfo.metadata
    );

    setPendingCastInfo(null);
  }, [pendingCastInfo, performActualCast]);

  // Handler for when user cancels AV1 warning
  const handleAV1Cancel = useCallback(() => {
    console.log("[ChromecastContext] User cancelled AV1 cast");
    setShowAV1Warning(false);
    setPendingCastInfo(null);
  }, []);

  const disconnect = useCallback(async () => {
    // Prevent double-disconnect
    if (isDisconnecting) {
      console.log(
        "[ChromecastContext] Disconnect already in progress, ignoring duplicate call"
      );
      return;
    }

    setIsDisconnecting(true);

    try {
      console.log("[ChromecastContext] ===== DISCONNECT CALLED =====");
      console.log("[ChromecastContext] Current state before disconnect:", {
        isConnected,
        isCasting,
        deviceName,
        hasCurrentVideo: !!currentVideo,
        proxyPort,
      });

      await Chromecast.disconnect();
      console.log("[ChromecastContext] Chromecast.disconnect() completed");

      // Stop foreground service
      try {
        await ForegroundService.stopCastingService();
        console.log("[ChromecastContext] Foreground service stopped");
      } catch (serviceError) {
        console.error(
          "[ChromecastContext] Failed to stop foreground service:",
          serviceError
        );
      }

      // Stop proxy server
      if (proxyPort) {
        console.log(
          "[ChromecastContext] Stopping proxy server on port:",
          proxyPort
        );
        await ProxyServer.stopProxy();
        setProxyPort(null);
      }

      // Reset ALL state to ensure clean disconnect
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: "IDLE" });
      setIsPlayerMinimized(false);

      console.log("[ChromecastContext] All state reset after disconnect");
      console.log("[ChromecastContext] ===== DISCONNECT COMPLETE =====");
    } catch (error) {
      console.error("[ChromecastContext] Failed to disconnect:", error);
      // Even if disconnect fails, reset the UI state
      try {
        await ForegroundService.stopCastingService();
      } catch (serviceError) {
        console.error(
          "[ChromecastContext] Failed to stop foreground service:",
          serviceError
        );
      }
      if (proxyPort) {
        try {
          await ProxyServer.stopProxy();
        } catch (proxyError) {
          console.error(
            "[ChromecastContext] Failed to stop proxy:",
            proxyError
          );
        }
        setProxyPort(null);
      }
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: "IDLE" });
      setIsPlayerMinimized(false);
      console.log("[ChromecastContext] State reset despite error");
    } finally {
      setIsDisconnecting(false);
    }
  }, [
    isConnected,
    isCasting,
    deviceName,
    currentVideo,
    proxyPort,
    isDisconnecting,
  ]);

  const play = useCallback(async () => {
    try {
      await Chromecast.play();
      console.log("[ChromecastContext] Playing");
    } catch (error) {
      console.error("[ChromecastContext] Failed to play:", error);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await Chromecast.pause();
      console.log("[ChromecastContext] Paused");
    } catch (error) {
      console.error("[ChromecastContext] Failed to pause:", error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      console.log("[ChromecastContext] Stopping media (keeping connection)...");
      await Chromecast.stop();

      // Stop foreground service since video stopped
      try {
        await ForegroundService.stopCastingService();
        console.log("[ChromecastContext] Foreground service stopped");
      } catch (serviceError) {
        console.error(
          "[ChromecastContext] Failed to stop foreground service:",
          serviceError
        );
      }

      // Stop proxy server since video is stopped
      if (proxyPort) {
        console.log(
          "[ChromecastContext] Stopping proxy server on port:",
          proxyPort
        );
        await ProxyServer.stopProxy();
        setProxyPort(null);
      }

      // Reset casting state but KEEP the connection
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: "IDLE" });
      setIsPlayerMinimized(false);

      console.log("[ChromecastContext] Stopped media, connection maintained");
    } catch (error) {
      console.error("[ChromecastContext] Failed to stop:", error);
      // Reset casting state even on error but keep connection
      try {
        await ForegroundService.stopCastingService();
      } catch (serviceError) {
        console.error(
          "[ChromecastContext] Failed to stop foreground service:",
          serviceError
        );
      }
      if (proxyPort) {
        try {
          await ProxyServer.stopProxy();
        } catch (proxyError) {
          console.error(
            "[ChromecastContext] Failed to stop proxy:",
            proxyError
          );
        }
        setProxyPort(null);
      }
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: "IDLE" });
      setIsPlayerMinimized(false);
    }
  }, [proxyPort]);

  const seek = useCallback(async (position: number) => {
    try {
      await Chromecast.seek({ position });
      console.log("[ChromecastContext] Seeked to:", position);
    } catch (error) {
      console.error("[ChromecastContext] Failed to seek:", error);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await Chromecast.setVolume({ volume: clampedVolume });
      console.log("[ChromecastContext] Volume set to:", clampedVolume);
    } catch (error) {
      console.error("[ChromecastContext] Failed to set volume:", error);
    }
  }, []);

  const showPlayer = useCallback(() => {
    setIsPlayerMinimized(false);
  }, []);

  const hidePlayer = useCallback(() => {
    setIsPlayerMinimized(true);
  }, []);

  const value: ChromecastContextType = {
    isInitialized,
    isConnected,
    deviceName,
    isCasting,
    currentVideo,
    playbackState,
    isConnecting,
    isPlayerMinimized,

    initialize,
    castVideo,
    disconnect,
    play,
    pause,
    stop,
    seek,
    setVolume,
    showDevicePicker,
    showPlayer,
    hidePlayer,
  };

  // Cleanup proxy and foreground service on unmount
  useEffect(() => {
    return () => {
      // Component is unmounting, stop proxy and service if running
      if (proxyPort) {
        console.log("[ChromecastContext] Component unmounting, stopping proxy");
        ProxyServer.stopProxy().catch((error) => {
          console.error(
            "[ChromecastContext] Failed to stop proxy on unmount:",
            error
          );
        });
      }
      // Stop foreground service on unmount
      ForegroundService.stopCastingService().catch((error) => {
        console.error(
          "[ChromecastContext] Failed to stop service on unmount:",
          error
        );
      });
    };
  }, [proxyPort]);

  // Listen for notification actions (stop button clicked)
  useEffect(() => {
    console.log("[ChromecastContext] Setting up notification action listener");

    const setupListener = async () => {
      try {
        const handle = await ForegroundService.addListener(
          "notificationAction",
          async (event) => {
            console.log(
              "[ChromecastContext] Notification action received:",
              event
            );

            if (event.action === "stop") {
              console.log(
                "[ChromecastContext] Stop button clicked in notification, stopping casting..."
              );
              await stop();
            }
          }
        );

        return handle;
      } catch (error) {
        console.error(
          "[ChromecastContext] Failed to setup notification listener:",
          error
        );
        return null;
      }
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then((handle) => {
        if (handle) {
          console.log(
            "[ChromecastContext] Removing notification action listener"
          );
          handle.remove();
        }
      });
    };
  }, [stop]); // Include stop in dependencies

  return (
    <ChromecastContext.Provider value={value}>
      {children}

      {/* AV1 Warning Dialog */}
      <Dialog open={showAV1Warning} onClose={handleAV1Cancel}>
        <DialogTitle>⚠️ AV1 Video Detected</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This video uses the <strong>AV1 codec</strong>, which is{" "}
            <strong>not supported by most Chromecast devices</strong>.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            You may experience:
          </DialogContentText>
          <DialogContentText component="div" sx={{ ml: 2 }}>
            • Audio only (no video)
            <br />
            • Black screen
            <br />• Playback errors
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            <strong>Only Chromecast with Google TV (4K)</strong> may support
            AV1. Older Chromecast models will not work.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Do you want to try casting anyway?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAV1Cancel} variant="contained" color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleAV1Proceed}
            color="warning"
            variant="contained"
          >
            Try Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </ChromecastContext.Provider>
  );
};
