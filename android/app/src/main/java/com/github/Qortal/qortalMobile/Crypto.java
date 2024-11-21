package com.github.Qortal.qortalMobile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public abstract class Crypto {

    /**
     * Returns 32-byte SHA-256 digest of message passed in input.
     * 
     * @param input
     *            variable-length byte[] message
     * @return byte[32] digest, or null if SHA-256 algorithm can't be accessed
     */
    public static byte[] digest(byte[] input) {
        if (input == null)
            return null;

        try {
            // SHA2-256
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            return sha256.digest(input);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 message digest not available");
        }
    }

    /**
     * Returns 32-byte SHA-256 digest of message passed in input.
     * 
     * @param input
     *            variable-length ByteBuffer message
     * @return byte[32] digest, or null if SHA-256 algorithm can't be accessed
     */
    public static byte[] digest(ByteBuffer input) {
        if (input == null)
            return null;

        try {
            // SHA2-256
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            sha256.update(input);
            return sha256.digest();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 message digest not available");
        }
    }

    /**
     * Returns 32-byte digest of two rounds of SHA-256 on message passed in input.
     * 
     * @param input
     *            variable-length byte[] message
     * @return byte[32] digest, or null if SHA-256 algorithm can't be accessed
     */
    public static byte[] doubleDigest(byte[] input) {
        return digest(digest(input));
    }

    /**
     * Returns 32-byte SHA-256 digest of file passed in input.
     *
     * @param file
     *            file in which to perform digest
     * @return byte[32] digest, or null if SHA-256 algorithm can't be accessed
     *
     * @throws IOException if the file cannot be read
     */
    public static byte[] digest(File file) throws IOException {
        return Crypto.digest(file, 8192);
    }

    /**
     * Returns 32-byte SHA-256 digest of file passed in input, in hex format
     *
     * @param file
     *            file in which to perform digest
     * @return String digest as a hexadecimal string, or null if SHA-256 algorithm can't be accessed
     *
     * @throws IOException if the file cannot be read
     */
    public static String digestHexString(File file, int bufferSize) throws IOException {
        byte[] digest = Crypto.digest(file, bufferSize);

        // Convert to hex
        StringBuilder stringBuilder = new StringBuilder();
        for (byte b : digest) {
            stringBuilder.append(String.format("%02x", b));
        }
        return stringBuilder.toString();
    }

    /**
     * Returns 32-byte SHA-256 digest of file passed in input.
     *
     * @param file
     *            file in which to perform digest
     * @param bufferSize
     * 			  the number of bytes to load into memory
     * @return byte[32] digest, or null if SHA-256 algorithm can't be accessed
     *
     * @throws IOException if the file cannot be read
     */
    public static byte[] digest(File file, int bufferSize) throws IOException {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            FileInputStream fileInputStream = new FileInputStream(file);
            byte[] bytes = new byte[bufferSize];
            int count;

            while ((count = fileInputStream.read(bytes)) != -1) {
                sha256.update(bytes, 0, count);
            }
            fileInputStream.close();

            return sha256.digest();

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 message digest not available");
        }
    }
}
