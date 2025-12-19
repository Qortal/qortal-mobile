import { registerPlugin } from '@capacitor/core';

/**
 * Interface for the EncryptedMediaServer plugin
 */
export interface EncryptedMediaServerPlugin {
  /**
   * Start the HTTP server
   * @param options Optional port number (defaults to 3001)
   * @returns Promise with success status and port number
   */
  startServer(options?: { port?: number }): Promise<{
    success: boolean;
    port: number;
    message?: string;
    error?: string;
  }>;

  /**
   * Stop the HTTP server
   * @returns Promise with success status
   */
  stopServer(): Promise<{
    success: boolean;
    message?: string;
  }>;

  /**
   * Register an encrypted media file for streaming
   * @param options Media configuration
   * @returns Promise with stream URL
   */
  registerMedia(options: {
    mediaId: string;
    key: string; // base64-encoded encryption key
    iv: string; // base64-encoded initialization vector
    resourceUrl: string; // URL of the encrypted file
    totalSize: number; // Total size of the decrypted file in bytes
    mimeType?: string; // MIME type (defaults to video/mp4)
  }): Promise<{
    success: boolean;
    streamUrl: string;
    mediaId: string;
  }>;

  /**
   * Unregister (cleanup) a media file
   * @param options Media ID to cleanup
   * @returns Promise with success status
   */
  cleanupMedia(options: { mediaId: string }): Promise<{
    success: boolean;
    existed: boolean;
    mediaId: string;
  }>;

  /**
   * Clear all registered media files
   * @returns Promise with success status
   */
  clearAllMedia(): Promise<{
    success: boolean;
  }>;

  /**
   * Get server status
   * @returns Promise with server status
   */
  getStatus(): Promise<{
    success: boolean;
    isRunning: boolean;
    port: number;
  }>;
}

/**
 * Get the EncryptedMediaServer plugin instance
 */
export const EncryptedMediaServer = registerPlugin<EncryptedMediaServerPlugin>('EncryptedMediaServer');

/**
 * Helper class for managing encrypted media streaming
 */
export class EncryptedMediaManager {
  private static instance: EncryptedMediaManager;
  private activeMedia: Set<string> = new Set();
  private serverStarted: boolean = false;

  private constructor() {}

  static getInstance(): EncryptedMediaManager {
    if (!EncryptedMediaManager.instance) {
      EncryptedMediaManager.instance = new EncryptedMediaManager();
    }
    return EncryptedMediaManager.instance;
  }

  /**
   * Initialize the media server
   */
  async initialize(port: number = 57000): Promise<void> {
    try {
      const result = await EncryptedMediaServer.startServer({ port });
      if (result.success) {
        this.serverStarted = true;
        console.log('EncryptedMediaServer started on port', result.port);
      } else {
        throw new Error(result.error || 'Failed to start server');
      }
    } catch (error) {
      console.error('Failed to initialize EncryptedMediaServer:', error);
      throw error;
    }
  }

  /**
   * Register and get stream URL for encrypted media
   */
  async registerMedia(
    mediaId: string,
    key: string,
    iv: string,
    resourceUrl: string,
    totalSize: number,
    mimeType?: string
  ): Promise<string> {
    if (!this.serverStarted) {
      await this.initialize();
    }

    // Ensure totalSize is definitely a number
    const size = Number(totalSize);
    
    if (isNaN(size) || size <= 0) {
      throw new Error(`Invalid totalSize: ${totalSize} (type: ${typeof totalSize})`);
    }

    console.log('[EncryptedMediaManager] Registering media with exact parameters:');
    console.log('  mediaId:', mediaId, '(type:', typeof mediaId, ')');
    console.log('  key length:', key?.length);
    console.log('  iv length:', iv?.length);
    console.log('  resourceUrl:', resourceUrl);
    console.log('  totalSize:', size, '(type:', typeof size, ')');
    console.log('  mimeType:', mimeType || 'video/mp4');
    
    // Create the options object explicitly
    const options = {
      mediaId: String(mediaId),
      key: String(key),
      iv: String(iv),
      resourceUrl: String(resourceUrl),
      totalSize: size,  // This is a number
      mimeType: mimeType || 'video/mp4'
    };
    
    console.log('[EncryptedMediaManager] Options object:', JSON.stringify(options, null, 2));

    try {
      const result = await EncryptedMediaServer.registerMedia(options);

      if (result.success) {
        this.activeMedia.add(mediaId);
        return result.streamUrl;
      } else {
        throw new Error('Failed to register media');
      }
    } catch (error) {
      console.error('Failed to register media:', error);
      throw error;
    }
  }

  /**
   * Cleanup a media file
   */
  async cleanupMedia(mediaId: string): Promise<void> {
    try {
      await EncryptedMediaServer.cleanupMedia({ mediaId });
      this.activeMedia.delete(mediaId);
    } catch (error) {
      console.error('Failed to cleanup media:', error);
    }
  }

  /**
   * Cleanup all media files
   */
  async cleanupAll(): Promise<void> {
    try {
      await EncryptedMediaServer.clearAllMedia();
      this.activeMedia.clear();
    } catch (error) {
      console.error('Failed to cleanup all media:', error);
    }
  }

  /**
   * Check if server is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const status = await EncryptedMediaServer.getStatus();
      return status.isRunning;
    } catch (error) {
      return false;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    try {
      await EncryptedMediaServer.stopServer();
      this.serverStarted = false;
      this.activeMedia.clear();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  }
}

