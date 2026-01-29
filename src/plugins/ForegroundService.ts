import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NotificationActionEvent {
  action: 'stop';
}

export interface ForegroundServicePlugin {
  /**
   * Start the foreground service for Chromecast
   * @param options.deviceName - Name of the Chromecast device
   * @param options.videoTitle - Title of the video being cast
   */
  startCastingService(options: { 
    deviceName: string; 
    videoTitle: string;
  }): Promise<{ success: boolean }>;

  /**
   * Stop the foreground service
   */
  stopCastingService(): Promise<{ success: boolean }>;

  /**
   * Listen for notification actions (e.g., stop button clicked)
   */
  addListener(
    eventName: 'notificationAction',
    listenerFunc: (event: NotificationActionEvent) => void
  ): Promise<PluginListenerHandle>;
}

const ForegroundService = registerPlugin<ForegroundServicePlugin>('ForegroundService');

export { ForegroundService };

