package com.github.Qortal.qortalMobile;

import android.util.Log;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import fi.iki.elonen.NanoHTTPD;

/**
 * HTTP server that serves decrypted media from encrypted sources
 */
public class MediaServer extends NanoHTTPD {
    private static final String TAG = "MediaServer";
    private final Map<String, MediaConfig> mediaConfigs = new ConcurrentHashMap<>();
    private final Map<String, byte[]> chunkCache = new ConcurrentHashMap<>();
    private static final int MAX_CACHE_SIZE = 50; // Cache up to 50 chunks
    
    public MediaServer(int port) {
        super(port);
    }
    
    /**
     * Register a media file for streaming
     */
    public void registerMedia(String mediaId, String keyBase64, String ivBase64, 
                             String resourceUrl, long totalSize, String mimeType) {
        MediaConfig config = new MediaConfig(mediaId, keyBase64, ivBase64, 
                                            resourceUrl, totalSize, mimeType);
        mediaConfigs.put(mediaId, config);
        Log.d(TAG, "Registered media: " + mediaId + " (" + (totalSize / 1024 / 1024) + " MB)");
        
        // NO PREFETCHING - keep it simple like Electron
    }
    
    /**
     * Prefetch initial chunks for faster video startup
     */
    private void prefetchInitialChunks(MediaConfig config) {
        new Thread(() -> {
            try {
                // Prefetch first 1MB in 256KB chunks (smaller chunks for slow nodes)
                long[] ranges = {
                    0, 262143,           // 0-256KB
                    262144, 524287,      // 256KB-512KB
                    524288, 786431,      // 512KB-768KB
                    786432, 1048575      // 768KB-1MB
                };
                
                for (int i = 0; i < ranges.length; i += 2) {
                    long start = ranges[i];
                    long end = Math.min(ranges[i + 1], config.totalSize - 1);
                    
                    if (start >= config.totalSize) break;
                    
                    String cacheKey = getCacheKey(config.mediaId, start, end);
                    if (chunkCache.containsKey(cacheKey)) continue;
                    
                    byte[] data = fetchRange(config.resourceUrl, start, end);
                    if (data != null && chunkCache.size() < MAX_CACHE_SIZE) {
                        chunkCache.put(cacheKey, data);
                    }
                }
                Log.d(TAG, "Prefetch complete for: " + config.mediaId);
            } catch (Exception e) {
                Log.w(TAG, "Prefetch failed (non-critical): " + e.getMessage());
            }
        }).start();
    }
    
    /**
     * Remove a media file from streaming
     */
    public boolean removeMedia(String mediaId) {
        MediaConfig removed = mediaConfigs.remove(mediaId);
        if (removed != null) {
            Log.d(TAG, "Removed media: " + mediaId);
            return true;
        }
        return false;
    }
    
    /**
     * Clear all registered media
     */
    public void clearAllMedia() {
        int count = mediaConfigs.size();
        mediaConfigs.clear();
        chunkCache.clear(); // Also clear cache
        Log.d(TAG, "Cleared " + count + " media entries and cache");
    }
    
    /**
     * Generate cache key for a chunk
     */
    private String getCacheKey(String mediaId, long start, long end) {
        return mediaId + ":" + start + ":" + end;
    }
    
    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        
        // Handle CORS preflight
        if (Method.OPTIONS.equals(session.getMethod())) {
            Response response = newFixedLengthResponse(Response.Status.OK, "text/plain", "");
            addCorsHeaders(response);
            return response;
        }
        
        // Serve media files
        if (uri.startsWith("/media/")) {
            String mediaId = uri.substring(7); // Remove "/media/"
            return serveMedia(mediaId, session);
        }
        
        // Health check endpoint
        if (uri.equals("/health")) {
            Response response = newFixedLengthResponse(Response.Status.OK, 
                "application/json", "{\"status\":\"ok\",\"registered\":" + mediaConfigs.size() + "}");
            addCorsHeaders(response);
            return response;
        }
        
        return newFixedLengthResponse(Response.Status.NOT_FOUND, 
            "text/plain", "Not found");
    }
    
    /**
     * Serve an encrypted media file with decryption
     */
    private Response serveMedia(String mediaId, IHTTPSession session) {
        MediaConfig config = mediaConfigs.get(mediaId);
        
        if (config == null) {
            Log.w(TAG, "Media not found: " + mediaId);
            return newFixedLengthResponse(Response.Status.NOT_FOUND, 
                "text/plain", "Media not found: " + mediaId);
        }
        
        try {
            // Parse Range header
            String rangeHeader = session.getHeaders().get("range");
            Log.d(TAG, "Request for " + mediaId + " with Range: " + (rangeHeader != null ? rangeHeader : "NONE"));
            long start = 0;
            long end = -1; // Will be set based on request type
            boolean isRangeRequest = false;
            
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                isRangeRequest = true;
                String[] parts = rangeHeader.substring(6).split("-");
                
                if (parts.length > 0 && !parts[0].isEmpty()) {
                    start = Long.parseLong(parts[0]);
                }
                
                if (parts.length > 1 && !parts[1].isEmpty()) {
                    end = Long.parseLong(parts[1]);
                } else {
                    // Open-ended range like "bytes=1000-"
                    // DON'T fetch to end of file! Cap at reasonable chunk size (2MB)
                    end = Math.min(start + 2097151, config.totalSize - 1);
                    Log.d(TAG, "Open-ended range request, capping to 2MB: " + start + "-" + end);
                }
                
                // Validate range
                if (start > end || start < 0 || end >= config.totalSize) {
                    Log.w(TAG, "Invalid range: " + start + "-" + end);
                    return newFixedLengthResponse(Response.Status.RANGE_NOT_SATISFIABLE, 
                        "text/plain", "Invalid range");
                }
            } else {
                // No range header - default to first 512KB like a normal video player would request
                start = 0;
                end = Math.min(524287, config.totalSize - 1);
            }
            
            // NO CHUNK EXPANSION - fetch EXACTLY what's requested, just like Electron
            long fetchStart = start;
            long fetchEnd = end;
            
            Log.d(TAG, "Serving: " + start + "-" + end + " (" + (end-start+1) + " bytes)");
            
            // Check cache first
            String cacheKey = getCacheKey(mediaId, fetchStart, fetchEnd);
            byte[] encryptedData = chunkCache.get(cacheKey);
            
            if (encryptedData == null) {
                // Cache miss - fetch encrypted data from resource URL
                encryptedData = fetchRange(config.resourceUrl, fetchStart, fetchEnd);
                
                if (encryptedData == null || encryptedData.length == 0) {
                    Log.e(TAG, "Failed to fetch data for: " + mediaId);
                    return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, 
                        "text/plain", "Failed to fetch encrypted data");
                }
                
                // Cache it (with simple size limit)
                if (chunkCache.size() < MAX_CACHE_SIZE) {
                    chunkCache.put(cacheKey, encryptedData);
                }
            }
            
            // Calculate block offset for CTR mode (divide by 16, AES block size)
            long blockOffset = DecryptionHelper.calculateBlockOffset(fetchStart);
            
            // Decrypt the chunk
            byte[] decrypted = DecryptionHelper.decryptChunk(
                config.keyBase64, config.ivBase64, blockOffset, encryptedData
            );
            
            // No trimming needed - we fetched exactly what was requested
            
            // Create response
            Response.Status status = isRangeRequest ? 
                Response.Status.PARTIAL_CONTENT : Response.Status.OK;
            
            Response response = newFixedLengthResponse(
                status,
                config.mimeType,
                new ByteArrayInputStream(decrypted),
                decrypted.length
            );
            
            // Add headers
            if (isRangeRequest) {
                response.addHeader("Content-Range", 
                    String.format("bytes %d-%d/%d", start, start + decrypted.length - 1, config.totalSize));
            }
            
            response.addHeader("Accept-Ranges", "bytes");
            response.addHeader("Content-Length", String.valueOf(decrypted.length));
            response.addHeader("Cache-Control", "no-cache"); // Match Electron
            addCorsHeaders(response);
            
            return response;
            
        } catch (Exception e) {
            Log.e(TAG, "Error serving media: " + mediaId, e);
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, 
                "text/plain", "Server error: " + e.getMessage());
        }
    }
    
    /**
     * Fetch a range of data from a URL
     */
    private byte[] fetchRange(String urlString, long start, long end) throws IOException {
        long startTime = System.currentTimeMillis();
        long requestSize = end - start + 1;
        
        HttpURLConnection conn = null;
        InputStream in = null;
        
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            
            // Critical: Set method before other properties
            conn.setRequestMethod("GET");
            
            // Enable connection reuse
            conn.setRequestProperty("Connection", "keep-alive");
            conn.setRequestProperty("Accept-Encoding", "identity"); // Prevent compression that breaks range
            
            // Set range header - MUST be exact format
            String rangeValue = "bytes=" + start + "-" + end;
            conn.setRequestProperty("Range", rangeValue);
            
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setUseCaches(false);
            conn.setInstanceFollowRedirects(true);
            
            Log.d(TAG, "Fetching from Qortal: " + rangeValue + " (" + requestSize + " bytes)");
            
            int responseCode = conn.getResponseCode();
            
            if (responseCode != HttpURLConnection.HTTP_PARTIAL && 
                responseCode != HttpURLConnection.HTTP_OK) {
                Log.e(TAG, "Failed to fetch range. Response code: " + responseCode + " for " + rangeValue);
                return null;
            }
            
            // Check if we got what we asked for
            String contentRange = conn.getHeaderField("Content-Range");
            if (responseCode == HttpURLConnection.HTTP_PARTIAL && contentRange != null) {
                Log.d(TAG, "Got Content-Range: " + contentRange);
            } else if (responseCode == HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "Server returned 200 instead of 206 - may not support range requests!");
            }
            
            in = conn.getInputStream();
            byte[] data = readAllBytes(in);
            
            long elapsed = System.currentTimeMillis() - startTime;
            long bytesPerSec = elapsed > 0 ? (requestSize * 1000 / elapsed) : 0;
            
            if (elapsed > 1000) {
                Log.w(TAG, String.format("Slow fetch: %dms for %d bytes (~%d KB/s)", 
                    elapsed, requestSize, bytesPerSec / 1024));
            } else {
                Log.d(TAG, String.format("Fetch OK: %dms for %d bytes (~%d KB/s)", 
                    elapsed, requestSize, bytesPerSec / 1024));
            }
            
            return data;
            
        } finally {
            if (in != null) {
                try {
                    in.close();
                } catch (IOException e) {
                    Log.w(TAG, "Error closing input stream", e);
                }
            }
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
    
    /**
     * Read all bytes from an input stream
     */
    private byte[] readAllBytes(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        byte[] data = new byte[65536]; // 64KB buffer for better I/O performance
        int bytesRead;
        
        while ((bytesRead = in.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, bytesRead);
        }
        
        buffer.flush();
        return buffer.toByteArray();
    }
    
    /**
     * Add CORS headers to response
     */
    private void addCorsHeaders(Response response) {
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        response.addHeader("Access-Control-Allow-Headers", "Range, Content-Type");
        response.addHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
    }
}

