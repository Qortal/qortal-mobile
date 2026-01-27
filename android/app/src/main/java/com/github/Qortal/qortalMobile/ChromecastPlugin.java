package com.github.Qortal.qortalMobile;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.cast.Cast;
import com.google.android.gms.cast.CastDevice;
import com.google.android.gms.cast.MediaInfo;
import com.google.android.gms.cast.MediaLoadRequestData;
import com.google.android.gms.cast.MediaMetadata;
import com.google.android.gms.cast.MediaSeekOptions;
import com.google.android.gms.cast.MediaStatus;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.CastState;
import com.google.android.gms.cast.framework.SessionManager;
import com.google.android.gms.cast.framework.SessionManagerListener;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import com.google.android.gms.common.images.WebImage;

import androidx.mediarouter.app.MediaRouteChooserDialog;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "Chromecast")
public class ChromecastPlugin extends Plugin {

    private CastContext castContext;
    private SessionManager sessionManager;
    private CastSession castSession;
    private RemoteMediaClient remoteMediaClient;

    private final SessionManagerListener<CastSession> sessionManagerListener =
            new SessionManagerListener<CastSession>() {
                @Override
                public void onSessionStarting(@NonNull CastSession castSession) {
                    notifyListeners("castStateChanged", createStateObject("CONNECTING", null));
                }

                @Override
                public void onSessionStarted(@NonNull CastSession castSession, @NonNull String s) {
                    ChromecastPlugin.this.castSession = castSession;
                    remoteMediaClient = castSession.getRemoteMediaClient();
                    String deviceName = castSession.getCastDevice().getFriendlyName();
                    notifyListeners("castStateChanged", createStateObject("CONNECTED", deviceName));
                }

                @Override
                public void onSessionEnding(@NonNull CastSession castSession) {
                    notifyListeners("castStateChanged", createStateObject("DISCONNECTING", null));
                }

                @Override
                public void onSessionEnded(@NonNull CastSession castSession, int i) {
                    ChromecastPlugin.this.castSession = null;
                    remoteMediaClient = null;
                    notifyListeners("castStateChanged", createStateObject("DISCONNECTED", null));
                }

                @Override
                public void onSessionResuming(@NonNull CastSession castSession, @NonNull String s) {
                    notifyListeners("castStateChanged", createStateObject("CONNECTING", null));
                }

                @Override
                public void onSessionResumed(@NonNull CastSession castSession, boolean b) {
                    ChromecastPlugin.this.castSession = castSession;
                    remoteMediaClient = castSession.getRemoteMediaClient();
                    String deviceName = castSession.getCastDevice().getFriendlyName();
                    notifyListeners("castStateChanged", createStateObject("CONNECTED", deviceName));
                }

                @Override
                public void onSessionStartFailed(@NonNull CastSession castSession, int i) {
                    notifyListeners("castStateChanged", createStateObject("ERROR", null));
                }

                @Override
                public void onSessionSuspended(@NonNull CastSession castSession, int i) {
                    notifyListeners("castStateChanged", createStateObject("SUSPENDED", null));
                }

                @Override
                public void onSessionResumeFailed(@NonNull CastSession castSession, int i) {
                    notifyListeners("castStateChanged", createStateObject("ERROR", null));
                }
            };

    @Override
    public void load() {
        super.load();
        try {
            Context context = getContext();
            android.util.Log.d("ChromecastPlugin", "Attempting to initialize Cast context");
            
            castContext = CastContext.getSharedInstance(context);
            android.util.Log.d("ChromecastPlugin", "Cast context initialized successfully");
            
            sessionManager = castContext.getSessionManager();
            sessionManager.addSessionManagerListener(sessionManagerListener, CastSession.class);
            android.util.Log.d("ChromecastPlugin", "Session manager listener added successfully");
            
        } catch (Exception e) {
            android.util.Log.e("ChromecastPlugin", "Failed to initialize Cast framework: " + e.getMessage(), e);
            // Don't crash the app, just log the error
            castContext = null;
            sessionManager = null;
        }
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "initialize() called");
        if (castContext == null) {
            android.util.Log.e("ChromecastPlugin", "Cast context is null - framework not available");
            call.reject("Cast framework not available. Make sure Google Play Services is installed and up to date.");
            return;
        }
        android.util.Log.d("ChromecastPlugin", "Cast framework is available");
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "isAvailable() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            JSObject ret = new JSObject();
            try {
                if (castContext == null) {
                    android.util.Log.w("ChromecastPlugin", "isAvailable: castContext is null");
                    ret.put("available", false);
                } else {
                    int castState = castContext.getCastState();
                    boolean available = castState != CastState.NO_DEVICES_AVAILABLE;
                    android.util.Log.d("ChromecastPlugin", "isAvailable: castState=" + castState + ", available=" + available);
                    ret.put("available", available);
                }
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "isAvailable error: " + e.getMessage(), e);
                ret.put("available", false);
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getDevices(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "getDevices() called");
        // Note: Google Cast SDK doesn't provide direct access to device list
        // Devices are discovered and managed by the framework
        JSObject ret = new JSObject();
        try {
            JSONArray devices = new JSONArray();
            ret.put("devices", devices);
            call.resolve(ret);
        } catch (Exception e) {
            android.util.Log.e("ChromecastPlugin", "getDevices error: " + e.getMessage(), e);
            call.reject("Failed to get devices: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "connect() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            android.util.Log.e("ChromecastPlugin", "Cannot connect - Activity is null");
            call.reject("Activity not available");
            return;
        }

        // Run all Cast SDK calls on UI thread
        activity.runOnUiThread(() -> {
            try {
                if (castContext == null || sessionManager == null) {
                    android.util.Log.e("ChromecastPlugin", "Cannot connect - Cast framework not initialized");
                    call.reject("Cast framework not initialized");
                    return;
                }

                // Check if already connected using SessionManager (more reliable)
                CastSession currentSession = sessionManager.getCurrentCastSession();
                if (currentSession != null && currentSession.isConnected()) {
                    android.util.Log.d("ChromecastPlugin", "Already connected to: " + currentSession.getCastDevice().getFriendlyName());
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("deviceName", currentSession.getCastDevice().getFriendlyName());
                    call.resolve(ret);
                    return;
                }

                android.util.Log.d("ChromecastPlugin", "Showing Cast device picker dialog");
                
                try {
                    MediaRouteChooserDialog dialog = new MediaRouteChooserDialog(activity);
                    dialog.setRouteSelector(castContext.getMergedSelector());
                    
                    // Add listener to detect when dialog is dismissed
                    dialog.setOnDismissListener(d -> {
                        android.util.Log.d("ChromecastPlugin", "Cast dialog dismissed, starting connection polling");
                        
                        // Poll connection status multiple times over 5 seconds
                        final int[] attempts = {0};
                        final int maxAttempts = 10; // 10 attempts * 500ms = 5 seconds
                        
                        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
                        Runnable checkConnection = new Runnable() {
                            @Override
                            public void run() {
                                attempts[0]++;
                                
                                // Check SessionManager for current session instead of member variable
                                CastSession session = sessionManager.getCurrentCastSession();
                                
                                if (session != null && session.isConnected()) {
                                    android.util.Log.d("ChromecastPlugin", "✅ Session connected successfully after " + (attempts[0] * 500) + "ms");
                                    // Update member variable to match
                                    ChromecastPlugin.this.castSession = session;
                                    ChromecastPlugin.this.remoteMediaClient = session.getRemoteMediaClient();
                                    
                                    JSObject ret = new JSObject();
                                    ret.put("success", true);
                                    ret.put("deviceName", session.getCastDevice().getFriendlyName());
                                    call.resolve(ret);
                                } else if (attempts[0] >= maxAttempts) {
                                    android.util.Log.w("ChromecastPlugin", "❌ Connection timeout after " + (attempts[0] * 500) + "ms");
                                    JSObject ret = new JSObject();
                                    ret.put("success", false);
                                    ret.put("message", "Connection timeout - no device selected or connection failed");
                                    call.resolve(ret);
                                } else {
                                    android.util.Log.d("ChromecastPlugin", "⏳ Polling attempt " + attempts[0] + "/" + maxAttempts + " - not connected yet");
                                    // Try again in 500ms
                                    handler.postDelayed(this, 500);
                                }
                            }
                        };
                        
                        // Start checking after 500ms (give Cast SDK time to initiate connection)
                        handler.postDelayed(checkConnection, 500);
                    });
                    
                    dialog.show();
                    android.util.Log.d("ChromecastPlugin", "Cast dialog shown successfully");
                } catch (Exception e) {
                    android.util.Log.e("ChromecastPlugin", "Failed to show Cast dialog: " + e.getMessage(), e);
                    call.reject("Failed to show Cast dialog: " + e.getMessage());
                }
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "Failed to initiate connection: " + e.getMessage(), e);
                call.reject("Failed to initiate connection: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "disconnect() called");
        try {
            if (sessionManager != null) {
                sessionManager.endCurrentSession(true);
                android.util.Log.d("ChromecastPlugin", "Session ended successfully");
            } else {
                android.util.Log.w("ChromecastPlugin", "disconnect: sessionManager is null");
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            android.util.Log.e("ChromecastPlugin", "disconnect error: " + e.getMessage(), e);
            call.reject("Failed to disconnect: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "isConnected() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            JSObject ret = new JSObject();
            try {
                boolean connected = castSession != null && castSession.isConnected();
                ret.put("connected", connected);
                if (connected && castSession != null) {
                    String deviceName = castSession.getCastDevice().getFriendlyName();
                    ret.put("deviceName", deviceName);
                    android.util.Log.d("ChromecastPlugin", "isConnected: true, device=" + deviceName);
                } else {
                    android.util.Log.d("ChromecastPlugin", "isConnected: false");
                }
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "isConnected error: " + e.getMessage(), e);
                ret.put("connected", false);
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void castVideo(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "castVideo() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            try {
                if (remoteMediaClient == null) {
                    android.util.Log.e("ChromecastPlugin", "castVideo: remoteMediaClient is null");
                    call.reject("Not connected to a cast device");
                    return;
                }

                String url = call.getString("url");
                if (url == null || url.isEmpty()) {
                    android.util.Log.e("ChromecastPlugin", "castVideo: URL is null or empty");
                    call.reject("URL is required");
                    return;
                }

                String title = call.getString("title", "");
                String subtitle = call.getString("subtitle", "");
                String imageUrl = call.getString("imageUrl", "");
                String contentType = call.getString("contentType", "video/mp4");
                
                android.util.Log.d("ChromecastPlugin", "castVideo: url=" + url + ", title=" + title + ", contentType=" + contentType);

                MediaMetadata metadata = new MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE);
                metadata.putString(MediaMetadata.KEY_TITLE, title);
                metadata.putString(MediaMetadata.KEY_SUBTITLE, subtitle);
                
                if (!imageUrl.isEmpty()) {
                    metadata.addImage(new WebImage(Uri.parse(imageUrl)));
                }

                MediaInfo mediaInfo = new MediaInfo.Builder(url)
                        .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
                        .setContentType(contentType)
                        .setMetadata(metadata)
                        .build();

                MediaLoadRequestData loadRequest = new MediaLoadRequestData.Builder()
                        .setMediaInfo(mediaInfo)
                        .setAutoplay(true)
                        .build();

                remoteMediaClient.load(loadRequest);
                
                android.util.Log.d("ChromecastPlugin", "castVideo: load request sent successfully");

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "castVideo error: " + e.getMessage(), e);
                call.reject("Failed to cast video: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "play() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            try {
                if (remoteMediaClient == null) {
                    android.util.Log.e("ChromecastPlugin", "play: remoteMediaClient is null");
                    call.reject("Not connected to a cast device");
                    return;
                }

                remoteMediaClient.play();
                android.util.Log.d("ChromecastPlugin", "play: command sent");
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "play error: " + e.getMessage(), e);
                call.reject("Failed to play: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "pause() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            try {
                if (remoteMediaClient == null) {
                    android.util.Log.e("ChromecastPlugin", "pause: remoteMediaClient is null");
                    call.reject("Not connected to a cast device");
                    return;
                }

                remoteMediaClient.pause();
                android.util.Log.d("ChromecastPlugin", "pause: command sent");
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "pause error: " + e.getMessage(), e);
                call.reject("Failed to pause: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "stop() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            try {
                if (remoteMediaClient == null) {
                    android.util.Log.e("ChromecastPlugin", "stop: remoteMediaClient is null");
                    call.reject("Not connected to a cast device");
                    return;
                }

                remoteMediaClient.stop();
                android.util.Log.d("ChromecastPlugin", "stop: command sent");
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "stop error: " + e.getMessage(), e);
                call.reject("Failed to stop: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void seek(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "seek() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            try {
                if (remoteMediaClient == null) {
                    android.util.Log.e("ChromecastPlugin", "seek: remoteMediaClient is null");
                    call.reject("Not connected to a cast device");
                    return;
                }

                Double position = call.getDouble("position");
                if (position == null) {
                    android.util.Log.e("ChromecastPlugin", "seek: position is null");
                    call.reject("Position is required");
                    return;
                }

                long positionMs = (long) (position * 1000);
                MediaSeekOptions seekOptions = new MediaSeekOptions.Builder()
                        .setPosition(positionMs)
                        .build();

                remoteMediaClient.seek(seekOptions);
                android.util.Log.d("ChromecastPlugin", "seek: seeking to " + position + "s");
                
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "seek error: " + e.getMessage(), e);
                call.reject("Failed to seek: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "setVolume() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            try {
                if (castSession == null) {
                    android.util.Log.e("ChromecastPlugin", "setVolume: castSession is null");
                    call.reject("Not connected to a cast device");
                    return;
                }

                Double volume = call.getDouble("volume");
                if (volume == null) {
                    android.util.Log.e("ChromecastPlugin", "setVolume: volume is null");
                    call.reject("Volume is required");
                    return;
                }

                castSession.setVolume(volume);
                android.util.Log.d("ChromecastPlugin", "setVolume: volume set to " + volume);
                
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "setVolume error: " + e.getMessage(), e);
                call.reject("Failed to set volume: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getPlaybackState(PluginCall call) {
        android.util.Log.d("ChromecastPlugin", "getPlaybackState() called");
        
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        
        activity.runOnUiThread(() -> {
            JSObject ret = new JSObject();
            try {
                if (remoteMediaClient == null || remoteMediaClient.getMediaStatus() == null) {
                    android.util.Log.d("ChromecastPlugin", "getPlaybackState: no media status, returning IDLE");
                    ret.put("state", "IDLE");
                    call.resolve(ret);
                    return;
                }

                MediaStatus mediaStatus = remoteMediaClient.getMediaStatus();
                int playerState = mediaStatus.getPlayerState();

                String state = "IDLE";
                switch (playerState) {
                    case MediaStatus.PLAYER_STATE_BUFFERING:
                        state = "BUFFERING";
                        break;
                    case MediaStatus.PLAYER_STATE_PLAYING:
                        state = "PLAYING";
                        break;
                    case MediaStatus.PLAYER_STATE_PAUSED:
                        state = "PAUSED";
                        break;
                    case MediaStatus.PLAYER_STATE_IDLE:
                        state = "IDLE";
                        break;
                }

                ret.put("state", state);
                ret.put("position", mediaStatus.getStreamPosition() / 1000.0);
                
                if (mediaStatus.getMediaInfo() != null) {
                    ret.put("duration", mediaStatus.getMediaInfo().getStreamDuration() / 1000.0);
                }
                
                android.util.Log.d("ChromecastPlugin", "getPlaybackState: state=" + state + 
                    ", position=" + (mediaStatus.getStreamPosition() / 1000.0));
                
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("ChromecastPlugin", "getPlaybackState error: " + e.getMessage(), e);
                ret.put("state", "IDLE");
                call.resolve(ret);
            }
        });
    }

    private JSObject createStateObject(String state, @Nullable String deviceName) {
        JSObject obj = new JSObject();
        obj.put("state", state);
        if (deviceName != null) {
            obj.put("deviceName", deviceName);
        }
        return obj;
    }

    @Override
    protected void handleOnDestroy() {
        if (sessionManager != null) {
            sessionManager.removeSessionManagerListener(sessionManagerListener, CastSession.class);
        }
        super.handleOnDestroy();
    }
}

