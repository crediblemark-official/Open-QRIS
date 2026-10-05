package com.openqris.listener;

import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class NetworkHelper {

    public interface Callback {
        void onResponse(int statusCode, String responseBody);
        void onError(Exception error);
    }

    /**
     * Secret key (sk_live_) hanya untuk verifikasi webhook di server dan TIDAK BOLEH
     * berada/dikirim dari HP. Endpoint listener hanya menerima Device Token (dev_...).
     */
    private static boolean isSecretKey(String token) {
        return token != null && token.trim().startsWith("sk_live_");
    }

    public static void sendNotificationAsync(final String gatewayUrl, final String deviceToken, final String title, final String text, final String packageName, final long postTime, final Callback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final String token = deviceToken != null ? deviceToken.trim() : "";
                    if (isSecretKey(token)) {
                        if (callback != null) {
                            callback.onError(new Exception(
                                "Konfigurasi salah: masukkan Device Token (dev_...), bukan Secret Key. " +
                                "Ambil Device Token dari menu Listener pada dashboard OpenQRIS Anda."));
                        }
                        return;
                    }

                    URL url = new URL(gatewayUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setRequestProperty("User-Agent", "OpenQRIS-Android-Listener/1.0");

                    // Hanya device token yang dikirim (tanpa API key / Authorization)
                    if (!token.isEmpty()) {
                        conn.setRequestProperty("X-Device-Token", token);
                    }

                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("text", text != null ? text : "");
                    body.put("title", title != null ? title : "");
                    body.put("package", packageName != null ? packageName : "");
                    body.put("device_token", token);
                    body.put("timestamp", postTime);

                    byte[] postData = body.toString().getBytes(StandardCharsets.UTF_8);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(postData);
                        os.flush();
                    }

                    int statusCode = conn.getResponseCode();
                    InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();
                    StringBuilder response = new StringBuilder();
                    if (is != null) {
                        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                            String line;
                            while ((line = reader.readLine()) != null) {
                                response.append(line);
                            }
                        }
                    }

                    if (callback != null) {
                        callback.onResponse(statusCode, response.toString());
                    }
                } catch (Exception e) {
                    if (callback != null) {
                        callback.onError(e);
                    }
                }
            }
        }).start();
    }

    public static void sendHeartbeatAsync(final String gatewayUrl, final String deviceToken, final int battery, final String model, final boolean isCharging, final Callback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final String token = deviceToken != null ? deviceToken.trim() : "";
                    if (isSecretKey(token)) {
                        // Jangan pernah mengirim secret key dari HP
                        if (callback != null) {
                            callback.onError(new Exception("Device token tidak valid: gunakan Device Token (dev_...), bukan Secret Key"));
                        }
                        return;
                    }

                    String heartbeatUrl = gatewayUrl.contains("/webhooks/listener")
                            ? gatewayUrl.replace("/webhooks/listener", "/devices/heartbeat")
                            : gatewayUrl + "/v1/devices/heartbeat";
                    URL url = new URL(heartbeatUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setRequestProperty("User-Agent", "OpenQRIS-Android-Listener/1.0");
                    conn.setRequestProperty("X-Device-Token", token);
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("device_token", token);
                    body.put("battery", battery);
                    body.put("model", model);
                    body.put("is_charging", isCharging);

                    byte[] postData = body.toString().getBytes(StandardCharsets.UTF_8);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(postData);
                        os.flush();
                    }

                    int statusCode = conn.getResponseCode();
                    InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();
                    StringBuilder response = new StringBuilder();
                    if (is != null) {
                        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                            String line;
                            while ((line = reader.readLine()) != null) {
                                response.append(line);
                            }
                        }
                    }
                    if (callback != null) callback.onResponse(statusCode, response.toString());
                } catch (Exception e) {
                    if (callback != null) callback.onError(e);
                }
            }
        }).start();
    }
}
