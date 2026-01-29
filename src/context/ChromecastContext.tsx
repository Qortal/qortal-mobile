import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Chromecast from '../plugins/ChromecastPlugin';
import { ProxyServer } from '../plugins/ProxyServer';
import { ForegroundService } from '../plugins/ForegroundService';
import { getBaseApiReact } from '../App';

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
  state: 'IDLE' | 'BUFFERING' | 'PLAYING' | 'PAUSED';
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
  castVideo: (url: string, metadata?: VideoMetadata) => Promise<{ success: boolean; error?: string }>;
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
    throw new Error('useChromecast must be used within ChromecastProvider');
  }
  return context;
};

interface ChromecastProviderProps {
  children: React.ReactNode;
}

export const ChromecastProvider: React.FC<ChromecastProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({ state: 'IDLE' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [proxyPort, setProxyPort] = useState<number | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Initialize Chromecast on mount
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      console.log('[ChromecastContext] Initializing...');
      const result = await Chromecast.initialize();
      
      if (result.success) {
        setIsInitialized(true);
        console.log('[ChromecastContext] Initialized successfully');
        
        // Check if already connected
        const connectedState = await Chromecast.isConnected();
        if (connectedState.connected && connectedState.deviceName) {
          setIsConnected(true);
          setDeviceName(connectedState.deviceName);
          console.log('[ChromecastContext] Already connected to:', connectedState.deviceName);
        }
      }
    } catch (error) {
      console.error('[ChromecastContext] Failed to initialize:', error);
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
        const result = await Chromecast.addListener('castStateChanged', (data) => {
          console.log('[ChromecastContext] Cast state changed:', data);
          
          // Handle different cast states from Android plugin
          switch (data.state) {
            case 'CONNECTING':
              console.log('[ChromecastContext] Connecting to device...');
              setIsConnecting(true);
              break;
              
            case 'CONNECTED':
              console.log('[ChromecastContext] Connected to:', data.deviceName);
              setIsConnected(true);
              setIsConnecting(false);
              if (data.deviceName) {
                setDeviceName(data.deviceName);
              }
              break;
              
            case 'DISCONNECTING':
              console.log('[ChromecastContext] Disconnecting...');
              break;
              
            case 'DISCONNECTED':
            case 'ERROR':
            case 'SUSPENDED':
              // Device disconnected, error, or session suspended - clean up state
              console.log('[ChromecastContext] Session ended/error, cleaning up state');
              
              // Stop foreground service
              ForegroundService.stopCastingService().catch((err) => {
                console.error('[ChromecastContext] Failed to stop foreground service:', err);
              });
              
              // Stop proxy server if running
              ProxyServer.getProxyInfo().then((info) => {
                if (info.isRunning) {
                  console.log('[ChromecastContext] Stopping proxy after disconnect');
                  ProxyServer.stopProxy().catch((err) => {
                    console.error('[ChromecastContext] Failed to stop proxy:', err);
                  });
                }
              }).catch((err) => {
                console.error('[ChromecastContext] Failed to get proxy info:', err);
              });
              
              setIsConnected(false);
              setDeviceName(null);
              setIsCasting(false);
              setCurrentVideo(null);
              setPlaybackState({ state: 'IDLE' });
              setIsPlayerMinimized(false);
              setIsConnecting(false);
              setProxyPort(null);
              break;
          }
        });
        
        listenerId = result.id;
        console.log('[ChromecastContext] Cast state listener registered:', listenerId);
      } catch (error) {
        console.error('[ChromecastContext] Failed to setup cast state listener:', error);
      }
    };

    setupListener();

    return () => {
      // Cleanup listener on unmount
      if (listenerId) {
        Chromecast.removeAllListeners().catch((error) => {
          console.error('[ChromecastContext] Failed to remove listeners:', error);
        });
      }
    };
  }, [isInitialized]);

  // Poll playback state when casting
  useEffect(() => {
    if (!isCasting) {
      console.log('[ChromecastContext] Not polling - isCasting is false');
      return;
    }

    console.log('[ChromecastContext] Starting playback state polling...');
    const interval = setInterval(async () => {
      try {
        const state = await Chromecast.getPlaybackState();
        console.log('[ChromecastContext] Playback state update:', state);
        setPlaybackState(state);
      } catch (error) {
        console.error('[ChromecastContext] Failed to get playback state:', error);
      }
    }, 1000);

    return () => {
      console.log('[ChromecastContext] Stopping playback state polling');
      clearInterval(interval);
    };
  }, [isCasting]);

  // Convert localhost URLs to network IP with proxy
  const convertUrlForChromecast = useCallback(async (url: string): Promise<string> => {
    console.log('[ChromecastContext] convertUrlForChromecast called with URL:', url);
    
    // If it's already a full HTTP/HTTPS URL with localhost or 127.0.0.1, use proxy
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      console.log('[ChromecastContext] Detected localhost URL, starting proxy conversion');
      try {
        // Extract the port from the localhost URL
        const urlObj = new URL(url);
        const localhostPort = urlObj.port || '80';
        console.log('[ChromecastContext] Extracted localhost port:', localhostPort);
        
        // Start proxy server if not already running
        let currentProxyPort = proxyPort;
        if (!currentProxyPort) {
          console.log('[ChromecastContext] Starting proxy server for localhost:', localhostPort);
          const proxyResult = await ProxyServer.startProxy({
            port: 0, // Auto-assign port
            targetHost: 'localhost',
            targetPort: parseInt(localhostPort, 10),
          });
          
          if (proxyResult.success && proxyResult.port) {
            currentProxyPort = proxyResult.port;
            setProxyPort(currentProxyPort);
            console.log('[ChromecastContext] Proxy server started on port:', currentProxyPort);
          } else {
            console.error('[ChromecastContext] Failed to start proxy server, result:', proxyResult);
            return url; // Fallback to original URL
          }
        } else {
          console.log('[ChromecastContext] Reusing existing proxy on port:', currentProxyPort);
        }
        
        // Get device's network IP from Android
        console.log('[ChromecastContext] Getting device network IP...');
        const { NetworkInfo } = await import('../plugins/NetworkInfo');
        const networkInfo = await NetworkInfo.getLocalIpAddress();
        console.log('[ChromecastContext] Network info result:', networkInfo);
        
        if (networkInfo.success && networkInfo.ipAddress && currentProxyPort) {
          // Replace localhost with device IP and use proxy port
          const convertedUrl = url
            .replace(/localhost:\d+/, `${networkInfo.ipAddress}:${currentProxyPort}`)
            .replace(/127\.0\.0\.1:\d+/, `${networkInfo.ipAddress}:${currentProxyPort}`);
          
          console.log('[ChromecastContext] ✅ Converted URL via proxy:', url, '→', convertedUrl);
          return convertedUrl;
        } else {
          console.warn('[ChromecastContext] ⚠️ Could not get device IP or proxy port, using original URL');
          console.warn('[ChromecastContext] networkInfo:', networkInfo, 'proxyPort:', currentProxyPort);
        }
      } catch (error) {
        console.error('[ChromecastContext] ❌ Failed to convert URL:', error);
      }
    } else {
      console.log('[ChromecastContext] URL does not contain localhost, no conversion needed');
    }
    
    // If it's a relative URL, convert to full Qortal node URL
    if (url.startsWith('/arbitrary/')) {
      console.log('[ChromecastContext] Converting relative URL to full URL');
      const baseUrl = getBaseApiReact();
      const fullUrl = `${baseUrl}${url}`;
      console.log('[ChromecastContext] Created full URL:', fullUrl);
      // Recursively convert in case baseUrl contains localhost
      return convertUrlForChromecast(fullUrl);
    }
    
    console.log('[ChromecastContext] Returning original URL:', url);
    return url;
  }, [proxyPort]);

  const showDevicePicker = useCallback(async () => {
    if (!isInitialized) {
      await initialize();
    }
    
    setIsConnecting(true);
    try {
      console.log('[ChromecastContext] Showing device picker...');
      const result = await Chromecast.connect();
      
      if (result.success && result.deviceName) {
        setIsConnected(true);
        setDeviceName(result.deviceName);
        console.log('[ChromecastContext] Connected to:', result.deviceName);
      } else {
        console.log('[ChromecastContext] Connection cancelled or failed');
      }
    } catch (error) {
      console.error('[ChromecastContext] Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [isInitialized, initialize]);

  const castVideo = useCallback(async (
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
        console.log('[ChromecastContext] Not connected, showing device picker...');
        await showDevicePicker();
        
        // Check if connection was successful after picker
        const connectedState = await Chromecast.isConnected();
        if (!connectedState.connected) {
          console.log('[ChromecastContext] No device selected or connection failed');
          return { success: false, error: 'No device selected or connection failed' };
        }
        
        // Update React state to match native state
        console.log('[ChromecastContext] Updating connection state after picker');
        setIsConnected(true);
        if (connectedState.deviceName) {
          setDeviceName(connectedState.deviceName);
        }
      } else {
        console.log('[ChromecastContext] Already connected to:', currentConnectionState.deviceName);
        // Ensure React state matches native state
        if (!isConnected) {
          setIsConnected(true);
          setDeviceName(currentConnectionState.deviceName || null);
        }
      }

      // Convert URL for network access
      const convertedUrl = await convertUrlForChromecast(url);

      console.log('[ChromecastContext] Casting video:', convertedUrl);
      
      const result = await Chromecast.castVideo({
        url: convertedUrl,
        title: metadata?.title,
        subtitle: metadata?.subtitle,
        imageUrl: metadata?.imageUrl,
        contentType: metadata?.contentType || 'video/mp4',
      });

      if (result.success) {
        setIsCasting(true);
        setCurrentVideo({
          url: convertedUrl,
          ...metadata,
        });
        setIsPlayerMinimized(false); // Show player when new video starts
        
        // Start foreground service to keep app alive while casting
        try {
          await ForegroundService.startCastingService({
            deviceName: deviceName || 'Chromecast',
            videoTitle: metadata?.title || 'Video',
          });
          console.log('[ChromecastContext] Foreground service started');
        } catch (serviceError) {
          console.warn('[ChromecastContext] Failed to start foreground service:', serviceError);
          // Continue anyway, video will still cast but app might be killed
        }
        
        console.log('[ChromecastContext] Video cast successfully, autoplay enabled');
        return { success: true };
      } else {
        console.log('[ChromecastContext] Cast failed - native plugin returned success=false');
        // Stop proxy if cast failed
        if (proxyPort) {
          console.log('[ChromecastContext] Stopping proxy after failed cast');
          await ProxyServer.stopProxy();
          setProxyPort(null);
        }
        return { success: false, error: 'Failed to cast video' };
      }
    } catch (error: unknown) {
      console.error('[ChromecastContext] Failed to cast video:', error);
      // Stop proxy on error
      if (proxyPort) {
        console.log('[ChromecastContext] Stopping proxy after cast error');
        try {
          await ProxyServer.stopProxy();
        } catch (proxyError) {
          console.error('[ChromecastContext] Failed to stop proxy:', proxyError);
        }
        setProxyPort(null);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [isInitialized, isConnected, initialize, showDevicePicker, convertUrlForChromecast, proxyPort]);

  const disconnect = useCallback(async () => {
    // Prevent double-disconnect
    if (isDisconnecting) {
      console.log('[ChromecastContext] Disconnect already in progress, ignoring duplicate call');
      return;
    }
    
    setIsDisconnecting(true);
    
    try {
      console.log('[ChromecastContext] ===== DISCONNECT CALLED =====');
      console.log('[ChromecastContext] Current state before disconnect:', { 
        isConnected, 
        isCasting, 
        deviceName,
        hasCurrentVideo: !!currentVideo,
        proxyPort 
      });
      
      await Chromecast.disconnect();
      console.log('[ChromecastContext] Chromecast.disconnect() completed');
      
      // Stop foreground service
      try {
        await ForegroundService.stopCastingService();
        console.log('[ChromecastContext] Foreground service stopped');
      } catch (serviceError) {
        console.error('[ChromecastContext] Failed to stop foreground service:', serviceError);
      }
      
      // Stop proxy server
      if (proxyPort) {
        console.log('[ChromecastContext] Stopping proxy server on port:', proxyPort);
        await ProxyServer.stopProxy();
        setProxyPort(null);
      }
      
      // Reset ALL state to ensure clean disconnect
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
      
      console.log('[ChromecastContext] All state reset after disconnect');
      console.log('[ChromecastContext] ===== DISCONNECT COMPLETE =====');
    } catch (error) {
      console.error('[ChromecastContext] Failed to disconnect:', error);
      // Even if disconnect fails, reset the UI state
      try {
        await ForegroundService.stopCastingService();
      } catch (serviceError) {
        console.error('[ChromecastContext] Failed to stop foreground service:', serviceError);
      }
      if (proxyPort) {
        try {
          await ProxyServer.stopProxy();
        } catch (proxyError) {
          console.error('[ChromecastContext] Failed to stop proxy:', proxyError);
        }
        setProxyPort(null);
      }
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
      console.log('[ChromecastContext] State reset despite error');
    } finally {
      setIsDisconnecting(false);
    }
  }, [isConnected, isCasting, deviceName, currentVideo, proxyPort, isDisconnecting]);

  const play = useCallback(async () => {
    try {
      await Chromecast.play();
      console.log('[ChromecastContext] Playing');
    } catch (error) {
      console.error('[ChromecastContext] Failed to play:', error);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await Chromecast.pause();
      console.log('[ChromecastContext] Paused');
    } catch (error) {
      console.error('[ChromecastContext] Failed to pause:', error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      console.log('[ChromecastContext] Stopping media (keeping connection)...');
      await Chromecast.stop();
      
      // Stop foreground service since video stopped
      try {
        await ForegroundService.stopCastingService();
        console.log('[ChromecastContext] Foreground service stopped');
      } catch (serviceError) {
        console.error('[ChromecastContext] Failed to stop foreground service:', serviceError);
      }
      
      // Stop proxy server since video is stopped
      if (proxyPort) {
        console.log('[ChromecastContext] Stopping proxy server on port:', proxyPort);
        await ProxyServer.stopProxy();
        setProxyPort(null);
      }
      
      // Reset casting state but KEEP the connection
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
      
      console.log('[ChromecastContext] Stopped media, connection maintained');
    } catch (error) {
      console.error('[ChromecastContext] Failed to stop:', error);
      // Reset casting state even on error but keep connection
      try {
        await ForegroundService.stopCastingService();
      } catch (serviceError) {
        console.error('[ChromecastContext] Failed to stop foreground service:', serviceError);
      }
      if (proxyPort) {
        try {
          await ProxyServer.stopProxy();
        } catch (proxyError) {
          console.error('[ChromecastContext] Failed to stop proxy:', proxyError);
        }
        setProxyPort(null);
      }
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
    }
  }, [proxyPort]);

  const seek = useCallback(async (position: number) => {
    try {
      await Chromecast.seek({ position });
      console.log('[ChromecastContext] Seeked to:', position);
    } catch (error) {
      console.error('[ChromecastContext] Failed to seek:', error);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await Chromecast.setVolume({ volume: clampedVolume });
      console.log('[ChromecastContext] Volume set to:', clampedVolume);
    } catch (error) {
      console.error('[ChromecastContext] Failed to set volume:', error);
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
        console.log('[ChromecastContext] Component unmounting, stopping proxy');
        ProxyServer.stopProxy().catch((error) => {
          console.error('[ChromecastContext] Failed to stop proxy on unmount:', error);
        });
      }
      // Stop foreground service on unmount
      ForegroundService.stopCastingService().catch((error) => {
        console.error('[ChromecastContext] Failed to stop service on unmount:', error);
      });
    };
  }, [proxyPort]);

  // Listen for notification actions (stop button clicked)
  useEffect(() => {
    console.log('[ChromecastContext] Setting up notification action listener');
    
    const setupListener = async () => {
      try {
        const handle = await ForegroundService.addListener('notificationAction', async (event) => {
          console.log('[ChromecastContext] Notification action received:', event);
          
          if (event.action === 'stop') {
            console.log('[ChromecastContext] Stop button clicked in notification, stopping casting...');
            await stop();
          }
        });
        
        return handle;
      } catch (error) {
        console.error('[ChromecastContext] Failed to setup notification listener:', error);
        return null;
      }
    };
    
    const listenerPromise = setupListener();
    
    return () => {
      listenerPromise.then((handle) => {
        if (handle) {
          console.log('[ChromecastContext] Removing notification action listener');
          handle.remove();
        }
      });
    };
  }, [stop]); // Include stop in dependencies

  return (
    <ChromecastContext.Provider value={value}>
      {children}
    </ChromecastContext.Provider>
  );
};

