package com.openqris.listener;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {

    private ConfigManager configManager;
    private View statusBanner;
    private TextView tvStatusTitle;
    private TextView tvStatusDesc;
    private View btnEnablePermission;
    private View btnServiceRunning;

    private EditText etGatewayUrl;
    private EditText etSecretKey;
    private CheckBox cbDana;
    private CheckBox cbBca;
    private CheckBox cbMandiri;
    private CheckBox cbGopay;
    private CheckBox cbOvo;
    private CheckBox cbSms;

    private View btnSaveConfig;
    private View btnTestSignal;
    private View btnClearLogs;

    private ListView lvLogs;
    private TextView tvEmptyLogs;
    private LogAdapter logAdapter;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final BroadcastReceiver notificationReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            refreshLogs();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        configManager = new ConfigManager(this);

        initViews();
        loadConfig();
        refreshStatus();
        refreshLogs();
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshStatus();
        refreshLogs();

        IntentFilter filter = new IntentFilter(QrisNotificationListenerService.ACTION_NOTIFICATION_RECEIVED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(notificationReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(notificationReceiver, filter);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        try {
            unregisterReceiver(notificationReceiver);
        } catch (Exception ignored) {}
    }

    private void initViews() {
        statusBanner = findViewById(R.id.status_banner);
        tvStatusTitle = findViewById(R.id.tv_status_title);
        tvStatusDesc = findViewById(R.id.tv_status_desc);
        btnEnablePermission = findViewById(R.id.btn_enable_permission);
        btnServiceRunning = findViewById(R.id.btn_service_running);

        etGatewayUrl = findViewById(R.id.et_gateway_url);
        etSecretKey = findViewById(R.id.et_secret_key);
        cbDana = findViewById(R.id.cb_dana);
        cbBca = findViewById(R.id.cb_bca);
        cbMandiri = findViewById(R.id.cb_mandiri);
        cbGopay = findViewById(R.id.cb_gopay);
        cbOvo = findViewById(R.id.cb_ovo);
        cbSms = findViewById(R.id.cb_sms);

        btnSaveConfig = findViewById(R.id.btn_save_config);
        btnTestSignal = findViewById(R.id.btn_test_signal);
        btnClearLogs = findViewById(R.id.btn_clear_logs);

        lvLogs = findViewById(R.id.lv_logs);
        tvEmptyLogs = findViewById(R.id.tv_empty_logs);

        TextWatcher smartPairingWatcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                if (s == null) return;
                String input = s.toString().trim();
                if (input.startsWith("{") && input.endsWith("}")) {
                    try {
                        JSONObject json = new JSONObject(input);
                        if (json.has("serverUrl")) {
                            etGatewayUrl.setText(json.getString("serverUrl"));
                        }
                        if (json.has("deviceToken")) {
                            etSecretKey.setText(json.getString("deviceToken"));
                        }
                        Toast.makeText(MainActivity.this, "Konfigurasi merchant berhasil diimpor otomatis!", Toast.LENGTH_SHORT).show();
                    } catch (Exception ignored) {}
                }
            }
        };
        etGatewayUrl.addTextChangedListener(smartPairingWatcher);
        etSecretKey.addTextChangedListener(smartPairingWatcher);

        btnEnablePermission.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openNotificationAccessSettings();
            }
        });

        btnSaveConfig.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveConfig();
            }
        });

        btnTestSignal.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendTestSignal();
            }
        });

        btnClearLogs.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                configManager.clearLogs();
                refreshLogs();
                Toast.makeText(MainActivity.this, "Log notifikasi dibersihkan", Toast.LENGTH_SHORT).show();
            }
        });

        logAdapter = new LogAdapter();
        lvLogs.setAdapter(logAdapter);
    }

    private void loadConfig() {
        etGatewayUrl.setText(configManager.getGatewayUrl());
        etSecretKey.setText(configManager.getSecretKey());
        cbDana.setChecked(configManager.isFilterDana());
        cbBca.setChecked(configManager.isFilterBca());
        cbMandiri.setChecked(configManager.isFilterMandiri());
        cbGopay.setChecked(configManager.isFilterGopay());
        cbOvo.setChecked(configManager.isFilterOvo());
        cbSms.setChecked(configManager.isFilterSms());
    }

    private void saveConfig() {
        String url = etGatewayUrl.getText().toString().trim();
        if (url.isEmpty()) {
            Toast.makeText(this, "URL Webhook Gateway tidak boleh kosong", Toast.LENGTH_SHORT).show();
            return;
        }

        configManager.setGatewayUrl(url);
        configManager.setSecretKey(etSecretKey.getText().toString().trim());
        configManager.setFilterDana(cbDana.isChecked());
        configManager.setFilterBca(cbBca.isChecked());
        configManager.setFilterMandiri(cbMandiri.isChecked());
        configManager.setFilterGopay(cbGopay.isChecked());
        configManager.setFilterOvo(cbOvo.isChecked());
        configManager.setFilterSms(cbSms.isChecked());

        Toast.makeText(this, "Pengaturan Gateway berhasil disimpan!", Toast.LENGTH_SHORT).show();
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        final String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (flat != null && !flat.isEmpty()) {
            final String[] names = flat.split(":");
            for (String name : names) {
                final ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null) {
                    if (pkgName.equals(cn.getPackageName())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private void openNotificationAccessSettings() {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
                intent.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                        new ComponentName(this, QrisNotificationListenerService.class).flattenToString());
            } else {
                intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            }
            startActivity(intent);
        } catch (Exception e) {
            startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        }
    }

    private void refreshStatus() {
        boolean enabled = isNotificationServiceEnabled();
        if (enabled) {
            statusBanner.setBackgroundResource(R.drawable.bg_status_active);
            tvStatusTitle.setText("Service Listener Aktif");
            tvStatusDesc.setText("Aplikasi sedang mendengarkan notifikasi pembayaran DANA & Bank di latar belakang.");
            btnEnablePermission.setVisibility(View.GONE);
            btnServiceRunning.setVisibility(View.VISIBLE);
        } else {
            statusBanner.setBackgroundResource(R.drawable.bg_status_warning);
            tvStatusTitle.setText("Izin Akses Belum Diaktifkan");
            tvStatusDesc.setText("Aktifkan izin akses notifikasi agar OpenQRIS dapat membaca pesan uang masuk.");
            btnEnablePermission.setVisibility(View.VISIBLE);
            btnServiceRunning.setVisibility(View.GONE);
        }
    }

    private void sendTestSignal() {
        final String url = etGatewayUrl.getText().toString().trim();
        final String secret = etSecretKey.getText().toString().trim();
        final String dummyText = "DANA: Kamu menerima uang Rp 50.000 dari TEST PEMBAYARAN";

        Toast.makeText(this, "Mengirim tes sinyal ke gateway...", Toast.LENGTH_SHORT).show();

        NetworkHelper.sendNotificationAsync(url, secret, "DANA", dummyText, "id.dana", System.currentTimeMillis(), new NetworkHelper.Callback() {
            @Override
            public void onResponse(final int statusCode, final String responseBody) {
                configManager.addLog("DANA (Uji Coba)", dummyText, "id.dana", statusCode, responseBody);
                mainHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        refreshLogs();
                        Toast.makeText(MainActivity.this, "Respons Gateway: HTTP " + statusCode, Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onError(final Exception error) {
                configManager.addLog("DANA (Uji Coba Gagal)", dummyText, "id.dana", 0, error.getMessage());
                mainHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        refreshLogs();
                        Toast.makeText(MainActivity.this, "Gagal koneksi: " + error.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
            }
        });
    }

    private void refreshLogs() {
        final JSONArray logs = configManager.getLogsJson();
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (logs.length() == 0) {
                    tvEmptyLogs.setVisibility(View.VISIBLE);
                    lvLogs.setVisibility(View.GONE);
                } else {
                    tvEmptyLogs.setVisibility(View.GONE);
                    lvLogs.setVisibility(View.VISIBLE);
                    logAdapter.setData(logs);
                }
            }
        });
    }

    private class LogAdapter extends BaseAdapter {
        private JSONArray data = new JSONArray();
        private final SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss dd/MM", Locale.getDefault());

        public void setData(JSONArray arr) {
            this.data = arr;
            notifyDataSetChanged();
        }

        @Override
        public int getCount() {
            return data.length();
        }

        @Override
        public Object getItem(int position) {
            return data.optJSONObject(position);
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = LayoutInflater.from(MainActivity.this).inflate(R.layout.item_log, parent, false);
            }

            JSONObject item = data.optJSONObject(position);
            if (item != null) {
                TextView tvTitle = convertView.findViewById(R.id.log_title);
                TextView tvMessage = convertView.findViewById(R.id.log_message);
                TextView tvStatus = convertView.findViewById(R.id.log_status);
                TextView tvTime = convertView.findViewById(R.id.log_time);

                long ts = item.optLong("timestamp", System.currentTimeMillis());
                int status = item.optInt("status", 0);
                String msg = item.optString("message", "");
                String pkg = item.optString("package", "");

                tvTitle.setText(pkg.isEmpty() ? "Notification" : pkg);
                tvMessage.setText(msg);
                tvTime.setText(sdf.format(new Date(ts)));

                if (status >= 200 && status < 300) {
                    tvStatus.setText("HTTP " + status);
                    tvStatus.setBackgroundResource(R.drawable.badge_success);
                    tvStatus.setTextColor(0xFF047857);
                } else {
                    tvStatus.setText(status == 0 ? "ERROR" : "HTTP " + status);
                    tvStatus.setBackgroundResource(R.drawable.badge_error);
                    tvStatus.setTextColor(0xFFB91C1C);
                }
            }

            return convertView;
        }
    }
}
