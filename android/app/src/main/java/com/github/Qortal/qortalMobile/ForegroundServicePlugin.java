package com.github.Qortal.qortalMobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

@CapacitorPlugin(name = "ForegroundService")
public class ForegroundServicePlugin extends Plugin {
    private static final String TAG = "ForegroundServicePlugin";
    private BroadcastReceiver stopCastingReceiver;

    @Override
    public void load() {
        super.load();
        
        // Register broadcast receiver for stop casting events
        stopCastingReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Received stop casting broadcast from notification");
                
                // Notify the web layer
                JSObject ret = new JSObject();
                ret.put("action", "stop");
                notifyListeners("notificationAction", ret);
            }
        };
        
        IntentFilter filter = new IntentFilter(ChromecastForegroundService.BROADCAST_STOP_CASTING);
        LocalBroadcastManager.getInstance(getContext()).registerReceiver(stopCastingReceiver, filter);
        Log.d(TAG, "Broadcast receiver registered");
    }

    @Override
    protected void handleOnDestroy() {
        // Unregister broadcast receiver
        if (stopCastingReceiver != null) {
            LocalBroadcastManager.getInstance(getContext()).unregisterReceiver(stopCastingReceiver);
            Log.d(TAG, "Broadcast receiver unregistered");
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void startCastingService(PluginCall call) {
        String deviceName = call.getString("deviceName", "Chromecast");
        String videoTitle = call.getString("videoTitle", "Video");

        Log.d(TAG, "Starting casting service for: " + deviceName);

        Context context = getContext();
        if (context != null) {
            ChromecastForegroundService.startService(context, deviceName, videoTitle);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("Context not available");
        }
    }

    @PluginMethod
    public void stopCastingService(PluginCall call) {
        Log.d(TAG, "Stopping casting service");

        Context context = getContext();
        if (context != null) {
            ChromecastForegroundService.stopService(context);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("Context not available");
        }
    }
}

