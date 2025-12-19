package com.github.Qortal.qortalMobile;

/**
 * Configuration for an encrypted media file
 */
public class MediaConfig {
    public final String mediaId;
    public final String keyBase64;
    public final String ivBase64;
    public final String resourceUrl;
    public final long totalSize;
    public final String mimeType;
    
    public MediaConfig(String mediaId, String keyBase64, String ivBase64, 
                      String resourceUrl, long totalSize, String mimeType) {
        this.mediaId = mediaId;
        this.keyBase64 = keyBase64;
        this.ivBase64 = ivBase64;
        this.resourceUrl = resourceUrl;
        this.totalSize = totalSize;
        this.mimeType = mimeType != null ? mimeType : "application/octet-stream";
    }
    
    /**
     * Get the decrypted key as bytes
     */
    public byte[] getKey() {
        return android.util.Base64.decode(keyBase64, android.util.Base64.NO_WRAP);
    }
    
    /**
     * Get the decrypted IV as bytes
     */
    public byte[] getIv() {
        return android.util.Base64.decode(ivBase64, android.util.Base64.NO_WRAP);
    }
}

