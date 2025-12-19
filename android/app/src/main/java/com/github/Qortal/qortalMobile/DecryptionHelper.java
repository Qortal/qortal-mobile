package com.github.Qortal.qortalMobile;

import android.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.util.Arrays;

public class DecryptionHelper {
    
    /**
     * Decrypt a chunk of data using AES-256-CTR
     * 
     * @param keyBase64 Base64-encoded encryption key (32 bytes)
     * @param ivBase64 Base64-encoded initialization vector (16 bytes)
     * @param blockOffset The block offset for CTR mode calculation
     * @param encrypted The encrypted data to decrypt
     * @return Decrypted data
     * @throws Exception if decryption fails
     */
    public static byte[] decryptChunk(String keyBase64, String ivBase64, 
                                      long blockOffset, byte[] encrypted) throws Exception {
        // Decode Base64 inputs
        byte[] key = Base64.decode(keyBase64, Base64.NO_WRAP);
        byte[] iv = Base64.decode(ivBase64, Base64.NO_WRAP);
        
        return decryptChunk(key, iv, blockOffset, encrypted);
    }
    
    /**
     * Decrypt a chunk of data using AES-256-CTR
     * 
     * @param key Encryption key (32 bytes for AES-256)
     * @param iv Initialization vector (16 bytes)
     * @param blockOffset The block offset for CTR mode calculation
     * @param encrypted The encrypted data to decrypt
     * @return Decrypted data
     * @throws Exception if decryption fails
     */
    public static byte[] decryptChunk(byte[] key, byte[] iv, 
                                      long blockOffset, byte[] encrypted) throws Exception {
        try {
            // Validate key and IV sizes
            if (key.length != 32) {
                throw new IllegalArgumentException("Key must be 32 bytes for AES-256");
            }
            if (iv.length != 16) {
                throw new IllegalArgumentException("IV must be 16 bytes");
            }
            
            SecretKeySpec keySpec = new SecretKeySpec(key, "AES");
            
            // Derive CTR counter from IV and block offset
            byte[] counter = deriveCtrCounter(iv, blockOffset);
            IvParameterSpec ivSpec = new IvParameterSpec(counter);
            
            // Initialize cipher for AES-CTR mode
            Cipher cipher = Cipher.getInstance("AES/CTR/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            
            // Decrypt and return
            return cipher.doFinal(encrypted);
        } catch (Exception e) {
            throw new Exception("Decryption failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Derive the CTR counter from the IV and block offset
     * This is crucial for proper CTR mode operation with range requests
     * 
     * @param iv The base initialization vector (16 bytes)
     * @param blockOffset The block offset (for seeking)
     * @return The derived counter (16 bytes)
     */
    private static byte[] deriveCtrCounter(byte[] iv, long blockOffset) {
        // Create a copy of the IV to use as the counter
        byte[] counter = Arrays.copyOf(iv, 16);
        
        // Add the block offset to the counter
        long carry = blockOffset;
        
        // Process from right to left (big-endian style)
        for (int i = 15; i >= 0 && carry > 0; i--) {
            long sum = (counter[i] & 0xFF) + (carry & 0xFF);
            counter[i] = (byte)(sum & 0xFF);
            carry = (carry >> 8) + (sum >> 8);
        }
        
        return counter;
    }
    
    /**
     * Calculate the block offset for a given byte position
     * For AES, block size is 16 bytes
     * 
     * @param bytePosition The byte position in the file
     * @return The block offset
     */
    public static long calculateBlockOffset(long bytePosition) {
        return bytePosition / 16;
    }
}

