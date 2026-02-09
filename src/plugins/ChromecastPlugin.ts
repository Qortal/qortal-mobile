import { registerPlugin } from '@capacitor/core';

export interface ChromecastPlugin {
  /**
   * Initialize the Chromecast SDK
   */
  initialize(): Promise<{ success: boolean }>;

  /**
   * Check if Chromecast devices are available
   */
  isAvailable(): Promise<{ available: boolean }>;

  /**
   * Get list of available Chromecast devices
   */
  getDevices(): Promise<{ devices: Array<{ id: string; name: string }> }>;

  /**
   * Connect to a Chromecast device
   */
  connect(): Promise<{ success: boolean; deviceName?: string }>;

  /**
   * Disconnect from current Chromecast device
   */
  disconnect(): Promise<{ success: boolean }>;

  /**
   * Check if currently connected to a device
   */
  isConnected(): Promise<{ connected: boolean; deviceName?: string }>;

  /**
   * Cast a video URL to the connected device
   */
  castVideo(options: {
    url: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    contentType?: string;
  }): Promise<{ success: boolean }>;

  /**
   * Play the current media
   */
  play(): Promise<{ success: boolean }>;

  /**
   * Pause the current media
   */
  pause(): Promise<{ success: boolean }>;

  /**
   * Stop the current media
   */
  stop(): Promise<{ success: boolean }>;

  /**
   * Seek to a specific position (in seconds)
   */
  seek(options: { position: number }): Promise<{ success: boolean }>;

  /**
   * Set the volume (0.0 to 1.0)
   */
  setVolume(options: { volume: number }): Promise<{ success: boolean }>;

  /**
   * Get current playback state
   */
  getPlaybackState(): Promise<{
    state: 'IDLE' | 'BUFFERING' | 'PLAYING' | 'PAUSED';
    position?: number;
    duration?: number;
  }>;

  /**
   * Add a listener for cast state changes
   */
  addListener(
    eventName: 'castStateChanged',
    listenerFunc: (data: { state: string; deviceName?: string }) => void
  ): Promise<{ id: string }>;

  /**
   * Remove all listeners
   */
  removeAllListeners(): Promise<void>;
}

const Chromecast = registerPlugin<ChromecastPlugin>('Chromecast');

export default Chromecast;


