package com.github.Qortal.qortalMobile;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Log;

import com.github.Qortal.qortalMobile.MemoryPoW;

import java.util.Iterator;

@CapacitorPlugin(name = "NativePOW")
public class NativePOW extends Plugin {

    @PluginMethod
    public void computeProofOfWork(PluginCall call) {
        try {
            // Extract parameters from the call
            JSObject chatBytesObject = call.getObject("chatBytes", new JSObject());
            int difficulty = call.getInt("difficulty", 0);

            // Convert chatBytesObject to a byte array
            byte[] chatBytes = jsObjectToByteArray(chatBytesObject);

            // Use the MemoryPoW.compute2 method
            int workBufferLength = 8 * 1024 * 1024; // 8 MiB buffer
            Integer nonce = MemoryPoW.compute2(chatBytes, workBufferLength, difficulty);

            // Return result to the plugin caller
            JSObject result = new JSObject();
            result.put("nonce", nonce);

            call.resolve(result);

        } catch (Exception e) {
            call.reject("Error computing proof-of-work", e);
        }
    }

    private byte[] jsObjectToByteArray(JSObject jsObject) {
        int length = jsObject.length();
        byte[] array = new byte[length];
        Iterator<String> keys = jsObject.keys();

        while (keys.hasNext()) {
            String key = keys.next();
            int index = Integer.parseInt(key);
            int value = jsObject.getInteger(key);
            array[index] = (byte) value;
        }

        return array;
    }
}
