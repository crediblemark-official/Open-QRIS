package com.openqris.listener;

import android.app.Notification;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class QrisNotificationListenerService extends NotificationListenerService {
    private static final String TAG = "QrisNotificationService";
    public static final String ACTION_NOTIFICATION_RECEIVED = "com.openqris.listener.NOTIFICATION_RECEIVED";

    private ConfigManager configManager;
    private final Handler heartbeatHandler = new Handler(Looper.getMainLooper());
    private final Runnable heartbeatRunnable = new Runnable() {
        @Override
        public void run() {
            sendHeartbeat();
            heartbeatHandler.postDelayed(this, 15 * 60 * 1000); // Setiap 15 menit
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        configManager = new ConfigManager(this);
        Log.i(TAG, "OpenQRIS Notification Ingestion Service Started.");
        sendHeartbeat();
        heartbeatHandler.postDelayed(heartbeatRunnable, 15 * 60 * 1000);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        heartbeatHandler.removeCallbacks(heartbeatRunnable);
    }

    private void sendHeartbeat() {
        try {
            String gatewayUrl = configManager.getGatewayUrl();
            String secretKey = configManager.getSecretKey();
            if (gatewayUrl == null || gatewayUrl.isEmpty() || secretKey == null || secretKey.isEmpty()) {
                return;
            }

            Intent batteryIntent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int level = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) : -1;
            int scale = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1) : -1;
            int batteryPct = (level != -1 && scale != -1) ? (int)((level / (float)scale) * 100) : 100;
            int status = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1) : -1;
            boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
            String model = Build.MANUFACTURER + " " + Build.MODEL;

            NetworkHelper.sendHeartbeatAsync(gatewayUrl, secretKey, batteryPct, model, isCharging, null);
        } catch (Exception ignored) {}
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        final String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Skip internal/system packages if not relevant
        if (packageName.equals("android") || packageName.equals("com.android.systemui")) return;

        // Check if package matches user's active filters
        if (!configManager.isTargetPackage(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = textCs != null ? textCs.toString() : "";
        if (bigTextCs != null && !bigTextCs.toString().isEmpty()) {
            text = bigTextCs.toString();
        }

        // Full composite message for regex parsers
        final String combinedText = (title.isEmpty() ? "" : title + ": ") + text;
        final long postTime = sbn.getPostTime();

        Log.i(TAG, "Captured notification from [" + packageName + "]: " + combinedText);

        final String gatewayUrl = configManager.getGatewayUrl();
        final String secretKey = configManager.getSecretKey();

        // Forward to OpenQRIS Gateway
        NetworkHelper.sendNotificationAsync(gatewayUrl, secretKey, title, combinedText, packageName, postTime, new NetworkHelper.Callback() {
            @Override
            public void onResponse(int statusCode, String responseBody) {
                Log.i(TAG, "Gateway Response HTTP " + statusCode + ": " + responseBody);
                configManager.addLog(title, combinedText, packageName, statusCode, responseBody);

                // Broadcast to update UI if activity is open
                Intent broadcast = new Intent(ACTION_NOTIFICATION_RECEIVED);
                broadcast.putExtra("package", packageName);
                broadcast.putExtra("title", title);
                broadcast.putExtra("text", combinedText);
                broadcast.putExtra("status", statusCode);
                sendBroadcast(broadcast);
            }

            @Override
            public void onError(Exception error) {
                Log.e(TAG, "Failed forwarding notification to gateway: " + error.getMessage());
                configManager.addLog(title, combinedText, packageName, 0, "Error: " + error.getMessage());

                Intent broadcast = new Intent(ACTION_NOTIFICATION_RECEIVED);
                broadcast.putExtra("package", packageName);
                broadcast.putExtra("title", title);
                broadcast.putExtra("text", combinedText);
                broadcast.putExtra("status", 0);
                sendBroadcast(broadcast);
            }
        });
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No action needed on dismiss
    }
}
