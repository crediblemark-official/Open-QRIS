<?php
/**
 * Plugin Name: OpenQRIS Gateway for WooCommerce
 * Plugin URI: https://openqris.org
 * Description: Plugin Payment Gateway Mandiri berbasis Dynamic QRIS (MDR 0%) terhubung langsung ke OpenQRIS Engine & Android Notification Listener.
 * Version: 1.0.0
 * Author: OpenQRIS Community
 * Author URI: https://openqris.org
 * Text Domain: woocommerce-openqris
 * Domain Path: /languages
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 9.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Pastikan WooCommerce terpasang dan aktif
add_action('plugins_loaded', 'openqris_init_gateway_class', 11);

function openqris_init_gateway_class() {
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class WC_Gateway_OpenQRIS extends WC_Payment_Gateway {

        public function __construct() {
            $this->id                 = 'openqris';
            $this->icon               = apply_filters('woocommerce_openqris_icon', 'https://raw.githubusercontent.com/qris/assets/master/qris-badge.png');
            $this->has_fields         = false;
            $this->method_title       = __('OpenQRIS Dynamic Gateway', 'woocommerce-openqris');
            $this->method_description = __('Terima pembayaran QRIS otomatis (BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay) dengan verifikasi otomatis seketika tanpa perantara.', 'woocommerce-openqris');

            $this->supports = array(
                'products',
            );

            // Inisialisasi pengaturan
            $this->init_form_fields();
            $this->init_settings();

            $this->title        = $this->get_option('title', 'QRIS (BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay)');
            $this->description  = $this->get_option('description', 'Bayar mudah dan instan dengan memindai kode QRIS menggunakan seluruh aplikasi mobile banking atau e-wallet di Indonesia.');
            $this->enabled      = $this->get_option('enabled');
            $this->api_endpoint = rtrim($this->get_option('api_endpoint', 'http://localhost:3000'), '/');
            $this->secret_key   = $this->get_option('secret_key', '');
            $this->public_key   = $this->get_option('public_key', '');

            // Hook simpan opsi di dashboard admin WooCommerce
            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));

            // Hook penerimaan webhook callback dari OpenQRIS
            add_action('woocommerce_api_openqris_webhook', array($this, 'handle_webhook_callback'));
        }

        public function init_form_fields() {
            $webhook_url = add_query_arg('wc-api', 'openqris_webhook', home_url('/'));

            $this->form_fields = array(
                'enabled' => array(
                    'title'   => __('Aktifkan Gateway', 'woocommerce-openqris'),
                    'type'    => 'checkbox',
                    'label'   => __('Aktifkan pembayaran QRIS Dinamis', 'woocommerce-openqris'),
                    'default' => 'yes',
                ),
                'title' => array(
                    'title'       => __('Judul Pembayaran', 'woocommerce-openqris'),
                    'type'        => 'text',
                    'description' => __('Judul metode pembayaran yang ditampilkan kepada pembeli saat checkout.', 'woocommerce-openqris'),
                    'default'     => 'QRIS (Semua Bank & E-Wallet)',
                    'desc_tip'    => true,
                ),
                'description' => array(
                    'title'       => __('Deskripsi', 'woocommerce-openqris'),
                    'type'        => 'textarea',
                    'description' => __('Penjelasan petunjuk pembayaran untuk pembeli.', 'woocommerce-openqris'),
                    'default'     => 'Scan kode QRIS menggunakan BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay, atau bank apa pun. Transfer sesuai nominal dengan digit unik agar terverifikasi otomatis.',
                ),
                'api_endpoint' => array(
                    'title'       => __('URL Server OpenQRIS', 'woocommerce-openqris'),
                    'type'        => 'text',
                    'description' => __('Alamat domain atau IP server OpenQRIS Gateway Anda (contoh: https://qris.domainanda.com atau http://localhost:3000).', 'woocommerce-openqris'),
                    'default'     => 'http://localhost:3000',
                ),
                'secret_key' => array(
                    'title'       => __('Secret Key (sk_live_...)', 'woocommerce-openqris'),
                    'type'        => 'password',
                    'description' => __('Secret Key aplikasi SaaS Anda dari menu SaaS Clients di Dashboard OpenQRIS.', 'woocommerce-openqris'),
                    'default'     => '',
                ),
                'public_key' => array(
                    'title'       => __('Public Key (pk_live_...)', 'woocommerce-openqris'),
                    'type'        => 'text',
                    'description' => __('Public Key aplikasi SaaS Anda.', 'woocommerce-openqris'),
                    'default'     => '',
                ),
                'webhook_info' => array(
                    'title'       => __('Webhook Callback URL', 'woocommerce-openqris'),
                    'type'        => 'title',
                    'description' => sprintf(
                        __('Salin URL ini dan tempelkan pada kolom <strong>Webhook Callback URL</strong> di menu SaaS Clients OpenQRIS:<br><code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;display:inline-block;margin-top:5px;">%s</code>', 'woocommerce-openqris'),
                        esc_url($webhook_url)
                    ),
                ),
            );
        }

        /**
         * Proses Pembayaran Saat Checkout
         */
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);

            if (!$order) {
                wc_add_notice(__('Pesanan tidak valid.', 'woocommerce-openqris'), 'error');
                return array('result' => 'fail');
            }

            if (empty($this->secret_key)) {
                wc_add_notice(__('Pengaturan OpenQRIS belum lengkap: Secret Key belum diisi.', 'woocommerce-openqris'), 'error');
                return array('result' => 'fail');
            }

            $order_number = $order->get_order_number();
            $amount       = (int) round($order->get_total());
            $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
            $customer_email = $order->get_billing_email();

            // Panggil API OpenQRIS POST /v1/charges
            $url = $this->api_endpoint . '/v1/charges';
            $payload = array(
                'order_id'       => (string) $order_number,
                'amount'         => $amount,
                'customer_name'  => !empty($customer_name) ? $customer_name : 'Customer #' . $order_id,
                'customer_email' => !empty($customer_email) ? $customer_email : null,
                'expiry_minutes' => 30,
            );

            $response = wp_remote_post($url, array(
                'method'      => 'POST',
                'timeout'     => 15,
                'redirection' => 5,
                'httpversion' => '1.0',
                'blocking'    => true,
                'headers'     => array(
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . trim($this->secret_key),
                    'User-Agent'    => 'OpenQRIS-WooCommerce-Plugin/1.0',
                ),
                'body'        => wp_json_encode($payload),
            ));

            if (is_wp_error($response)) {
                wc_add_notice(__('Gagal menghubungi server OpenQRIS: ', 'woocommerce-openqris') . $response->get_error_message(), 'error');
                return array('result' => 'fail');
            }

            $status_code = wp_remote_retrieve_response_code($response);
            $body        = wp_remote_retrieve_body($response);
            $json        = json_decode($body, true);

            if ($status_code !== 200 || empty($json['data']['checkout_url'])) {
                $error_msg = !empty($json['message']) ? $json['message'] : __('Gagal membuat tagihan QRIS dinamis.', 'woocommerce-openqris');
                wc_add_notice($error_msg, 'error');
                return array('result' => 'fail');
            }

            $data = $json['data'];

            // Simpan metadata QRIS di pesanan WooCommerce
            $order->update_meta_data('_openqris_charge_id', sanitize_text_field($data['charge_id']));
            $order->update_meta_data('_openqris_total_amount', sanitize_text_field($data['total_amount']));
            $order->update_meta_data('_openqris_unique_code', sanitize_text_field($data['unique_code']));
            $order->update_meta_data('_openqris_checkout_url', esc_url_raw($data['checkout_url']));
            $order->save();

            // Tandai order pending payment
            $order->update_status('on-hold', sprintf(
                __('Menunggu pembayaran QRIS sebesar Rp %s (Kode Unik: +%s). URL Checkout: %s', 'woocommerce-openqris'),
                number_format($data['total_amount'], 0, ',', '.'),
                $data['unique_code'],
                $data['checkout_url']
            ));

            // Kosongkan keranjang belanja
            WC()->cart->empty_cart();

            // Arahkan pembeli langsung ke halaman pembayaran QRIS
            return array(
                'result'   => 'success',
                'redirect' => $data['checkout_url'],
            );
        }

        /**
         * Webhook Handler Callback (Verifikasi Otomatis)
         */
        public function handle_webhook_callback() {
            $raw_payload = file_get_contents('php://input');
            $signature   = isset($_SERVER['HTTP_X_OPENQRIS_SIGNATURE']) ? sanitize_text_field($_SERVER['HTTP_X_OPENQRIS_SIGNATURE']) : '';

            if (empty($raw_payload)) {
                status_header(400);
                wp_send_json_error(array('message' => 'Empty payload'));
                exit;
            }

            // Validasi HMAC SHA256 Signature
            if (!empty($this->secret_key)) {
                $expected_signature = hash_hmac('sha256', $raw_payload, trim($this->secret_key));
                if (!hash_equals($expected_signature, $signature)) {
                    status_header(401);
                    wp_send_json_error(array('message' => 'Invalid HMAC Signature'));
                    exit;
                }
            }

            $payload = json_decode($raw_payload, true);
            if (empty($payload['data']['order_id'])) {
                status_header(400);
                wp_send_json_error(array('message' => 'Missing order_id in data'));
                exit;
            }

            $order_number = $payload['data']['order_id'];
            $order_id     = wc_get_order_id_by_order_number($order_number);
            $order        = wc_get_order($order_id);

            if (!$order) {
                // Fallback cari by order_id langsung jika numerik
                $order = wc_get_order((int)$order_number);
            }

            if (!$order) {
                status_header(404);
                wp_send_json_error(array('message' => 'Order not found: ' . $order_number));
                exit;
            }

            $event = isset($payload['event']) ? $payload['event'] : '';
            if ($event === 'charge.paid') {
                $charge_id = sanitize_text_field($payload['data']['charge_id']);
                $amount    = number_format($payload['data']['total_amount'], 0, ',', '.');
                $paid_at   = sanitize_text_field($payload['data']['paid_at']);

                // Tandai order selesai / lunas
                $order->payment_complete($charge_id);
                $order->add_order_note(sprintf(
                    __('Pembayaran QRIS sebesar Rp %s berhasil diverifikasi seketika via OpenQRIS Engine. ID Transaksi: %s (Waktu: %s)', 'woocommerce-openqris'),
                    $amount,
                    $charge_id,
                    $paid_at
                ));

                wp_send_json_success(array('message' => 'Order payment completed successfully'));
                exit;
            }

            wp_send_json_success(array('message' => 'Ignored event: ' . $event));
            exit;
        }
    }
}

// Daftarkan class gateway ke daftar gateway WooCommerce
add_filter('woocommerce_payment_gateways', 'openqris_add_gateway_class');
function openqris_add_gateway_class($gateways) {
    $gateways[] = 'WC_Gateway_OpenQRIS';
    return $gateways;
}
