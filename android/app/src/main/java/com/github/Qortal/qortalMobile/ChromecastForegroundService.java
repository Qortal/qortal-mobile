package com.github.Qortal.qortalMobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class ChromecastForegroundService extends Service {
    private static final String TAG = "ChromecastForegroundService";
    private static final String CHANNEL_ID = "chromecast_channel";
    private static final String CHANNEL_NAME = "Chromecast";
    private static final int NOTIFICATION_ID = 1001;
    
    public static final String ACTION_START = "com.github.Qortal.qortalMobile.START_CASTING";
    public static final String ACTION_STOP = "com.github.Qortal.qortalMobile.STOP_CASTING";
    public static final String ACTION_STOP_FROM_NOTIFICATION = "com.github.Qortal.qortalMobile.STOP_CASTING_FROM_NOTIFICATION";
    public static final String BROADCAST_STOP_CASTING = "com.github.Qortal.qortalMobile.BROADCAST_STOP_CASTING";
    public static final String EXTRA_DEVICE_NAME = "device_name";
    public static final String EXTRA_VIDEO_TITLE = "video_title";

    private String deviceName = "Chromecast";
    private String videoTitle = "Video";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service onStartCommand: " + (intent != null ? intent.getAction() : "null"));

        if (intent != null) {
            String action = intent.getAction();
            
            if (ACTION_START.equals(action)) {
                deviceName = intent.getStringExtra(EXTRA_DEVICE_NAME);
                videoTitle = intent.getStringExtra(EXTRA_VIDEO_TITLE);
                
                if (deviceName == null) deviceName = "Chromecast";
                if (videoTitle == null) videoTitle = "Video";
                
                Log.d(TAG, "Starting foreground service - Device: " + deviceName + ", Video: " + videoTitle);
                
                Notification notification = createNotification();
                startForeground(NOTIFICATION_ID, notification);
                
            } else if (ACTION_STOP.equals(action)) {
                Log.d(TAG, "Stopping foreground service (direct stop)");
                stopForeground(true);
                stopSelf();
                
            } else if (ACTION_STOP_FROM_NOTIFICATION.equals(action)) {
                Log.d(TAG, "Stop button clicked in notification - broadcasting to app");
                
                // Broadcast to the app that user clicked stop
                Intent broadcastIntent = new Intent(BROADCAST_STOP_CASTING);
                LocalBroadcastManager.getInstance(this).sendBroadcast(broadcastIntent);
                
                // The app will handle stopping casting and then call stopService
                // Don't stop the service immediately here
            }
        }

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service onDestroy");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifications for Chromecast playback");
            channel.setShowBadge(false);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created");
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Create stop casting action - use ACTION_STOP_FROM_NOTIFICATION instead
        Intent stopIntent = new Intent(this, ChromecastForegroundService.class);
        stopIntent.setAction(ACTION_STOP_FROM_NOTIFICATION);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Casting to " + deviceName)
            .setContentText(videoTitle)
            .setSmallIcon(android.R.drawable.stat_sys_upload) // Default cast icon
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop Casting",
                stopPendingIntent
            );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }

        return builder.build();
    }

    public static void startService(Context context, String deviceName, String videoTitle) {
        Intent intent = new Intent(context, ChromecastForegroundService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_DEVICE_NAME, deviceName);
        intent.putExtra(EXTRA_VIDEO_TITLE, videoTitle);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
        Log.d(TAG, "Service start requested");
    }

    public static void stopService(Context context) {
        Intent intent = new Intent(context, ChromecastForegroundService.class);
        intent.setAction(ACTION_STOP);
        context.startService(intent);
        Log.d(TAG, "Service stop requested");
    }
}

