package com.github.Qortal.qortalMobile;

import android.os.Environment;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "FileWriter")
public class FileWriter extends Plugin {

    // 🔒 Added synchronization lock (ONLY change)
    private static final Object fileLock = new Object();

    @PluginMethod
    public void writeChunk(PluginCall call) {
        String filename = call.getString("filename");
        String dataBase64 = call.getString("dataBase64");
        Boolean append = call.getBoolean("append", false);

        if (filename == null || filename.isEmpty()) {
            call.reject("Filename is required");
            return;
        }

        if (dataBase64 == null || dataBase64.isEmpty()) {
            call.reject("dataBase64 is required");
            return;
        }

        try {
            // Documents directory
            File documentsDir = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOCUMENTS
            );

            if (!documentsDir.exists() && !documentsDir.mkdirs()) {
                call.reject("Failed to create Documents directory");
                return;
            }

            File file = new File(documentsDir, filename);

            // Decode Base64 safely
            byte[] bytes = Base64.decode(dataBase64, Base64.NO_WRAP);

            // 🔒 Synchronized write (ONLY change)
            synchronized (fileLock) {
                try (FileOutputStream fos = new FileOutputStream(file, append)) {
                    fos.write(bytes);
                    fos.flush();
                }
            }

            JSObject ret = new JSObject();
            ret.put("path", file.getAbsolutePath());
            ret.put("uri", "file://" + file.getAbsolutePath());
            call.resolve(ret);

        } catch (IllegalArgumentException e) {
            call.reject("Invalid Base64 data: " + e.getMessage());
        } catch (IOException e) {
            call.reject("Failed to write file: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Unexpected error: " + e.getMessage());
        }
    }
}
