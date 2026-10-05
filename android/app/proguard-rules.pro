# OpenQRIS Listener - ProGuard / R8 Rules
#
# File ini direferensikan oleh app/build.gradle (proguardFiles) dan wajib ada
# agar build release tidak gagal.

# Pertahankan seluruh kelas aplikasi (NotificationListenerService, BroadcastReceiver,
# dan activity direferensikan secara reflektif oleh AndroidManifest).
-keep class com.openqris.listener.** { *; }

# Tidak ada dependency pihak ketiga - jangan warning tentang library yang tidak ada
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**

# Pertahankan nama method yang dipanggil via reflection oleh framework Android
-keepclassmembers class * {
    public *;
}
