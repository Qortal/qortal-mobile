package com.github.Qortal.qortalMobile;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

@CapacitorPlugin(name = "NetworkInfo")
public class NetworkInfoPlugin extends Plugin {
    private static final String TAG = "NetworkInfoPlugin";

    @PluginMethod
    public void getLocalIpAddress(PluginCall call) {
        try {
            String ipAddress = getDeviceIpAddress();
            
            JSObject ret = new JSObject();
            if (ipAddress != null && !ipAddress.isEmpty()) {
                ret.put("success", true);
                ret.put("ipAddress", ipAddress);
                Log.d(TAG, "Device IP address: " + ipAddress);
                call.resolve(ret);
            } else {
                ret.put("success", false);
                ret.put("error", "No network connection");
                Log.w(TAG, "No network connection found");
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to get IP address", e);
            call.reject("Failed to get IP address: " + e.getMessage());
        }
    }

    private String getDeviceIpAddress() {
        try {
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); 
                 en.hasMoreElements();) {
                NetworkInterface intf = en.nextElement();
                
                // Skip loopback and inactive interfaces
                if (intf.isLoopback() || !intf.isUp()) {
                    continue;
                }
                
                for (Enumeration<InetAddress> enumIpAddr = intf.getInetAddresses(); 
                     enumIpAddr.hasMoreElements();) {
                    InetAddress inetAddress = enumIpAddr.nextElement();
                    
                    // We want the IPv4 address that's not loopback
                    if (!inetAddress.isLoopbackAddress() && inetAddress instanceof Inet4Address) {
                        String ip = inetAddress.getHostAddress();
                        
                        // Typically WiFi IPs start with these prefixes
                        if (ip.startsWith("192.168") || ip.startsWith("10.") || 
                            ip.startsWith("172.16") || ip.startsWith("172.17") || 
                            ip.startsWith("172.18") || ip.startsWith("172.19") ||
                            ip.startsWith("172.20") || ip.startsWith("172.21") || 
                            ip.startsWith("172.22") || ip.startsWith("172.23") ||
                            ip.startsWith("172.24") || ip.startsWith("172.25") || 
                            ip.startsWith("172.26") || ip.startsWith("172.27") ||
                            ip.startsWith("172.28") || ip.startsWith("172.29") || 
                            ip.startsWith("172.30") || ip.startsWith("172.31")) {
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting IP address", e);
        }
        return null;
    }
}

