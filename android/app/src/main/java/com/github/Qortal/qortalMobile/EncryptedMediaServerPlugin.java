package com.github.Qortal.qortalMobile;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;

/**
 * Capacitor plugin for serving encrypted media through a local HTTP server
 */
@CapacitorPlugin(name = "EncryptedMediaServer")
public class EncryptedMediaServerPlugin extends Plugin {
    private static final String TAG = "EncryptedMediaServer";
    private MediaServer server;
    private int currentPort = 57000;
    
    /**
     * Start the HTTP server
     */
    @PluginMethod
    public void startServer(PluginCall call) {
        try {
            // Get port from call or use default
            Integer port = call.getInt("port");
            if (port == null) {
                port = currentPort;
            }
            
            // Stop existing server if running
            if (server != null && server.isAlive()) {
                Log.d(TAG, "Server already running on port " + currentPort);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("port", currentPort);
                ret.put("message", "Server already running");
                call.resolve(ret);
                return;
            }
            
            // Create and start new server
            server = new MediaServer(port);
            server.start();
            currentPort = port;
            
            Log.d(TAG, "Server started on port " + currentPort);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("port", currentPort);
            ret.put("message", "Server started successfully");
            call.resolve(ret);
            
        } catch (IOException e) {
            Log.e(TAG, "Failed to start server", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.reject("Failed to start server: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error starting server", e);
            call.reject("Unexpected error: " + e.getMessage());
        }
    }
    
    /**
     * Stop the HTTP server
     */
    @PluginMethod
    public void stopServer(PluginCall call) {
        try {
            if (server != null && server.isAlive()) {
                server.stop();
                server.clearAllMedia();
                Log.d(TAG, "Server stopped");
                
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Server stopped successfully");
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Server was not running");
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping server", e);
            call.reject("Failed to stop server: " + e.getMessage());
        }
    }
    
    /**
     * Register an encrypted media file for streaming
     */
    @PluginMethod
    public void registerMedia(PluginCall call) {
        try {
            // Validate server is running
            if (server == null || !server.isAlive()) {
                call.reject("Server is not running. Call startServer() first.");
                return;
            }
            
            // DEBUG: Log the raw data received
            Log.d(TAG, "=== registerMedia called ===");
            Log.d(TAG, "Raw call data: " + call.getData().toString());
            
            // Get parameters
            String mediaId = call.getString("mediaId");
            String key = call.getString("key"); // base64
            String iv = call.getString("iv"); // base64
            String resourceUrl = call.getString("resourceUrl");
            String mimeType = call.getString("mimeType");
            
            // DEBUG: Log what we got so far
            Log.d(TAG, "mediaId: " + mediaId);
            Log.d(TAG, "key length: " + (key != null ? key.length() : "null"));
            Log.d(TAG, "iv length: " + (iv != null ? iv.length() : "null"));
            Log.d(TAG, "resourceUrl: " + resourceUrl);
            Log.d(TAG, "mimeType: " + mimeType);
            
            // Try to get totalSize - handle multiple possible types
            Long totalSize = null;
            Object totalSizeObj = call.getData().opt("totalSize");
            Log.d(TAG, "totalSize raw object: " + totalSizeObj + " (class: " + (totalSizeObj != null ? totalSizeObj.getClass().getName() : "null") + ")");
            
            // Direct conversion from the raw object if it's a Number
            if (totalSizeObj instanceof Number) {
                totalSize = ((Number) totalSizeObj).longValue();
                Log.d(TAG, "Converted Number directly to Long: " + totalSize);
            } else if (totalSizeObj != null) {
                // Try to parse as string
                try {
                    totalSize = Long.parseLong(totalSizeObj.toString());
                    Log.d(TAG, "Parsed toString to Long: " + totalSize);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to parse totalSize from toString", e);
                }
            }
            
            // If still null, try the Capacitor methods
            if (totalSize == null) {
                try {
                    totalSize = call.getLong("totalSize");
                    Log.d(TAG, "getLong returned: " + totalSize);
                } catch (Exception e) {
                    Log.w(TAG, "getLong failed: " + e.getMessage());
                    try {
                        Integer intSize = call.getInt("totalSize");
                        if (intSize != null) {
                            totalSize = intSize.longValue();
                            Log.d(TAG, "getInt returned: " + intSize + " converted to: " + totalSize);
                        }
                    } catch (Exception e2) {
                        Log.w(TAG, "getInt failed: " + e2.getMessage());
                        try {
                            Double doubleSize = call.getDouble("totalSize");
                            if (doubleSize != null) {
                                totalSize = doubleSize.longValue();
                                Log.d(TAG, "getDouble returned: " + doubleSize + " converted to: " + totalSize);
                            }
                        } catch (Exception e3) {
                            Log.w(TAG, "getDouble failed: " + e3.getMessage());
                        }
                    }
                }
            }
            
            Log.d(TAG, "Final totalSize value: " + totalSize);
            
            // Validate required parameters
            if (mediaId == null || mediaId.isEmpty()) {
                call.reject("mediaId is required");
                return;
            }
            if (key == null || key.isEmpty()) {
                call.reject("key is required");
                return;
            }
            if (iv == null || iv.isEmpty()) {
                call.reject("iv is required");
                return;
            }
            if (resourceUrl == null || resourceUrl.isEmpty()) {
                call.reject("resourceUrl is required");
                return;
            }
            if (totalSize == null || totalSize <= 0) {
                Log.e(TAG, "totalSize validation failed. Value: " + totalSize);
                call.reject("totalSize is required and must be positive. Received: " + totalSize);
                return;
            }
            
            // Default mime type if not provided
            if (mimeType == null || mimeType.isEmpty()) {
                mimeType = "video/mp4"; // Default to video
            }
            
            // Register the media
            server.registerMedia(mediaId, key, iv, resourceUrl, totalSize, mimeType);
            
            // Return stream URL
            String streamUrl = "http://127.0.0.1:" + currentPort + "/media/" + mediaId;
            
            Log.d(TAG, "Registered media " + mediaId + " -> " + streamUrl);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("streamUrl", streamUrl);
            ret.put("mediaId", mediaId);
            call.resolve(ret);
            
        } catch (Exception e) {
            Log.e(TAG, "Error registering media", e);
            call.reject("Failed to register media: " + e.getMessage());
        }
    }
    
    /**
     * Unregister (cleanup) a media file
     */
    @PluginMethod
    public void cleanupMedia(PluginCall call) {
        try {
            String mediaId = call.getString("mediaId");
            
            if (mediaId == null || mediaId.isEmpty()) {
                call.reject("mediaId is required");
                return;
            }
            
            boolean existed = false;
            if (server != null) {
                existed = server.removeMedia(mediaId);
            }
            
            Log.d(TAG, "Cleaned up media: " + mediaId + " (existed: " + existed + ")");
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("existed", existed);
            ret.put("mediaId", mediaId);
            call.resolve(ret);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up media", e);
            call.reject("Failed to cleanup media: " + e.getMessage());
        }
    }
    
    /**
     * Clear all registered media
     */
    @PluginMethod
    public void clearAllMedia(PluginCall call) {
        try {
            if (server != null) {
                server.clearAllMedia();
            }
            
            Log.d(TAG, "Cleared all media");
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            
        } catch (Exception e) {
            Log.e(TAG, "Error clearing all media", e);
            call.reject("Failed to clear all media: " + e.getMessage());
        }
    }
    
    /**
     * Get encrypted media as a blob URL (alternative to streaming)
     * This fetches and decrypts the entire file, then returns a data URL
     */
    @PluginMethod
    public void getMediaAsBlob(PluginCall call) {
        try {
            String key = call.getString("key");
            String iv = call.getString("iv");
            String resourceUrl = call.getString("resourceUrl");
            String mimeType = call.getString("mimeType");
            
            // Validate parameters
            if (key == null || iv == null || resourceUrl == null) {
                call.reject("key, iv, and resourceUrl are required");
                return;
            }
            
            if (mimeType == null || mimeType.isEmpty()) {
                mimeType = "video/mp4";
            }
            
            // This should be done in a background thread for large files
            // For now, we'll return an error suggesting to use the streaming approach
            call.reject("getMediaAsBlob is not yet implemented. Use streaming with registerMedia instead, or update Q-App CSP to include http://127.0.0.1:*");
            
        } catch (Exception e) {
            Log.e(TAG, "Error creating blob URL", e);
            call.reject("Failed to create blob URL: " + e.getMessage());
        }
    }
    
    /**
     * Get server status
     */
    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            boolean isRunning = server != null && server.isAlive();
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isRunning", isRunning);
            ret.put("port", currentPort);
            call.resolve(ret);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting status", e);
            call.reject("Failed to get status: " + e.getMessage());
        }
    }
    
    /**
     * Clean up when plugin is destroyed
     */
    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (server != null && server.isAlive()) {
            try {
                server.stop();
                server.clearAllMedia();
                Log.d(TAG, "Server stopped on plugin destroy");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping server on destroy", e);
            }
        }
    }
}

