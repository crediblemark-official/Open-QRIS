package com.openqris.listener;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class ConfigManager {
    private static final String PREF_NAME = "openqris_listener_config";
    private static final String KEY_GATEWAY_URL = "gateway_url";
    private static final String KEY_SECRET_KEY = "secret_key";
    private static final String KEY_FILTER_DANA = "filter_dana";
    private static final String KEY_FILTER_BCA = "filter_bca";
    private static final String KEY_FILTER_MANDIRI = "filter_mandiri";
    private static final String KEY_FILTER_GOPAY = "filter_gopay";
    private static final String KEY_FILTER_OVO = "filter_ovo";
    private static final String KEY_FILTER_SMS = "filter_sms";
    private static final String KEY_LOGS = "recent_logs";

    private final SharedPreferences prefs;

    public ConfigManager(Context context) {
        this.prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public String getGatewayUrl() {
        return prefs.getString(KEY_GATEWAY_URL, "http://10.0.2.2:3000/v1/webhooks/listener");
    }

    public void setGatewayUrl(String url) {
        prefs.edit().putString(KEY_GATEWAY_URL, url != null ? url.trim() : "").apply();
    }

    public String getSecretKey() {
        return prefs.getString(KEY_SECRET_KEY, "");
    }

    public void setSecretKey(String key) {
        prefs.edit().putString(KEY_SECRET_KEY, key != null ? key.trim() : "").apply();
    }

    public boolean isFilterDana() {
        return prefs.getBoolean(KEY_FILTER_DANA, true);
    }

    public void setFilterDana(boolean val) {
        prefs.edit().putBoolean(KEY_FILTER_DANA, val).apply();
    }

    public boolean isFilterBca() {
        return prefs.getBoolean(KEY_FILTER_BCA, true);
    }

    public void setFilterBca(boolean val) {
        prefs.edit().putBoolean(KEY_FILTER_BCA, val).apply();
    }

    public boolean isFilterMandiri() {
        return prefs.getBoolean(KEY_FILTER_MANDIRI, true);
    }

    public void setFilterMandiri(boolean val) {
        prefs.edit().putBoolean(KEY_FILTER_MANDIRI, val).apply();
    }

    public boolean isFilterGopay() {
        return prefs.getBoolean(KEY_FILTER_GOPAY, true);
    }

    public void setFilterGopay(boolean val) {
        prefs.edit().putBoolean(KEY_FILTER_GOPAY, val).apply();
    }

    public boolean isFilterOvo() {
        return prefs.getBoolean(KEY_FILTER_OVO, true);
    }

    public void setFilterOvo(boolean val) {
        prefs.edit().putBoolean(KEY_FILTER_OVO, val).apply();
    }

    public boolean isFilterSms() {
        return prefs.getBoolean(KEY_FILTER_SMS, true);
    }

    public void setFilterSms(boolean val) {
        prefs.edit().putBoolean(KEY_FILTER_SMS, val).apply();
    }

    public boolean isTargetPackage(String pkg) {
        if (pkg == null) return false;
        String lower = pkg.toLowerCase();

        // DANA
        if (lower.contains("dana") && isFilterDana()) return true;
        // BCA
        if ((lower.contains("bca") || lower.contains("mybca")) && isFilterBca()) return true;
        // Mandiri Livin
        if ((lower.contains("mandiri") || lower.contains("livin")) && isFilterMandiri()) return true;
        // GoPay / Gojek
        if ((lower.contains("gojek") || lower.contains("gopay")) && isFilterGopay()) return true;
        // OVO
        if (lower.contains("ovo") && isFilterOvo()) return true;
        // SMS
        if ((lower.contains("mms") || lower.contains("sms") || lower.contains("messaging")) && isFilterSms()) return true;

        return false;
    }

    public synchronized void addLog(String title, String message, String pkg, int statusCode, String responseBody) {
        try {
            JSONArray arr = getLogsJson();
            JSONObject item = new JSONObject();
            item.put("timestamp", System.currentTimeMillis());
            item.put("title", title);
            item.put("message", message);
            item.put("package", pkg);
            item.put("status", statusCode);
            item.put("response", responseBody);

            // Prepend new item
            JSONArray newArr = new JSONArray();
            newArr.put(item);
            for (int i = 0; i < Math.min(arr.length(), 49); i++) {
                newArr.put(arr.get(i));
            }
            prefs.edit().putString(KEY_LOGS, newArr.toString()).apply();
        } catch (Exception ignored) {}
    }

    public synchronized JSONArray getLogsJson() {
        try {
            String str = prefs.getString(KEY_LOGS, "[]");
            return new JSONArray(str);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public synchronized void clearLogs() {
        prefs.edit().putString(KEY_LOGS, "[]").apply();
    }
}
