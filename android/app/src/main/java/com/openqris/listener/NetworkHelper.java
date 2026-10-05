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

    public static void sendNotificationAsync(final String gatewayUrl, final String secretKey, final String title, final String text, final String packageName, final long postTime, final Callback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(gatewayUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setRequestProperty("User-Agent", "OpenQRIS-Android-Listener/1.0");

                    if (secretKey != null && !secretKey.trim().isEmpty()) {
                        conn.setRequestProperty("X-API-Key", secretKey.trim());
                        conn.setRequestProperty("Authorization", "Bearer " + secretKey.trim());
                        conn.setRequestProperty("X-Device-Token", secretKey.trim());
                    }

                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("text", text != null ? text : "");
                    body.put("title", title != null ? title : "");
                    body.put("package", packageName != null ? packageName : "");
                    body.put("device_token", secretKey != null ? secretKey.trim() : "");
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
                    String heartbeatUrl = gatewayUrl.contains("/webhooks/listener")
                            ? gatewayUrl.replace("/webhooks/listener", "/devices/heartbeat")
                            : gatewayUrl + "/v1/devices/heartbeat";
                    URL url = new URL(heartbeatUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setRequestProperty("User-Agent", "OpenQRIS-Android-Listener/1.0");
                    conn.setRequestProperty("X-Device-Token", deviceToken != null ? deviceToken.trim() : "");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("device_token", deviceToken != null ? deviceToken.trim() : "");
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
