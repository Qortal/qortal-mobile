import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Chromecast from '../plugins/ChromecastPlugin';
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
              setIsConnected(false);
              setDeviceName(null);
              setIsCasting(false);
              setCurrentVideo(null);
              setPlaybackState({ state: 'IDLE' });
              setIsPlayerMinimized(false);
              setIsConnecting(false);
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

  // Convert localhost URLs to network IP
  const convertUrlForChromecast = useCallback(async (url: string): Promise<string> => {
    // If it's already a full HTTP/HTTPS URL with localhost or 127.0.0.1, convert it
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      try {
        // Get device's network IP from Android
        const { NetworkInfo } = await import('../plugins/NetworkInfo');
        const networkInfo = await NetworkInfo.getLocalIpAddress();
        
        if (networkInfo.success && networkInfo.ipAddress) {
          const convertedUrl = url
            .replace('localhost', networkInfo.ipAddress)
            .replace('127.0.0.1', networkInfo.ipAddress);
          
          console.log('[ChromecastContext] Converted URL:', url, '→', convertedUrl);
          return convertedUrl;
        } else {
          console.warn('[ChromecastContext] Could not get device IP, using original URL');
        }
      } catch (error) {
        console.error('[ChromecastContext] Failed to convert URL:', error);
      }
    }
    
    // If it's a relative URL, convert to full Qortal node URL
    if (url.startsWith('/arbitrary/')) {
      const baseUrl = getBaseApiReact();
      const fullUrl = `${baseUrl}${url}`;
      console.log('[ChromecastContext] Created full URL:', fullUrl);
      return fullUrl;
    }
    
    return url;
  }, []);

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
        console.log('[ChromecastContext] Video cast successfully');
        return { success: true };
      } else {
        console.log('[ChromecastContext] Cast failed - native plugin returned success=false');
        return { success: false, error: 'Failed to cast video' };
      }
    } catch (error: unknown) {
      console.error('[ChromecastContext] Failed to cast video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [isInitialized, isConnected, initialize, showDevicePicker, convertUrlForChromecast]);

  const disconnect = useCallback(async () => {
    try {
      console.log('[ChromecastContext] ===== DISCONNECT CALLED =====');
      console.log('[ChromecastContext] Current state before disconnect:', { 
        isConnected, 
        isCasting, 
        deviceName,
        hasCurrentVideo: !!currentVideo 
      });
      
      await Chromecast.disconnect();
      console.log('[ChromecastContext] Chromecast.disconnect() completed');
      
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
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
      console.log('[ChromecastContext] State reset despite error');
    }
  }, [isConnected, isCasting, deviceName, currentVideo]);

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
      console.log('[ChromecastContext] Stopping media and disconnecting...');
      await Chromecast.stop();
      
      // Stop should also disconnect from the device
      await Chromecast.disconnect();
      
      // Reset all state
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
      
      console.log('[ChromecastContext] Stopped and disconnected');
    } catch (error) {
      console.error('[ChromecastContext] Failed to stop:', error);
      // Reset state even on error
      setIsConnected(false);
      setDeviceName(null);
      setIsCasting(false);
      setCurrentVideo(null);
      setPlaybackState({ state: 'IDLE' });
      setIsPlayerMinimized(false);
    }
  }, []);

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

  return (
    <ChromecastContext.Provider value={value}>
      {children}
    </ChromecastContext.Provider>
  );
};

