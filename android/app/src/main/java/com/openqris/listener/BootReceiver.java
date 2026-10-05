package com.openqris.listener;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Auto-boot receiver: dijalankan Android setelah HP restart.
 *
 * Sebelumnya hanya izin RECEIVE_BOOT_COMPLETED yang dideklarasikan tanpa <receiver>,
 * sehingga fitur "tetap aktif setelah restart" tidak pernah bekerja.
 *
 * Catatan: NotificationListenerService yang sudah diizinkan user memang di-rebind
 * otomatis oleh sistem; receiver ini melakukan startService sebagai best-effort
 * tambahan (gagal ditangkap dengan aman pada Android 8+ yang melarang start dari
 * background).
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "OpenQRISBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            Log.i(TAG, "Boot selesai — mencoba menjalankan ulang layanan listener");

            try {
                Intent service = new Intent(context, QrisNotificationListenerService.class);
                context.startService(service);
            } catch (Exception e) {
                // Normal pada Android 8+ (background start restriction) — listener
                // tetap di-rebind otomatis oleh sistem jika user sudah mengizinkan.
                Log.w(TAG, "Gagal startService setelah boot: " + e.getMessage());
            }
        }
    }
}
