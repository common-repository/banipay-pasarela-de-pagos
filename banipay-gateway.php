<?php
/*
 * Plugin Name: BaniPay Pasarela de Pagos
 * Plugin URI: https://banipay.me/
 * Description: Banipay es una pasarela de pagos compatible con Wordpress y Woocommerce
 * Author: BaniPay
 * Version: 2.0.10
*/
include_once ('banipay.php');
add_filter('woocommerce_payment_gateways', 'banipay_add_gateway_class');
function banipay_add_gateway_class($gateways)
{
    $gateways[] = 'WC_BaniPay_Gateway';
    return $gateways;
}
add_action('plugins_loaded', 'banipay_init_gateway_class', 11);
$estados_bp = array("PENDIENTE" => "<p class='bp-pending'>Verificación con la entidad bancaria.</p>", "PROCESANDO" => "<p class='bp-pending'>Procesando el pago.</p>", "PROCESADO" => "<p class='bp-processed'>Pago Exitoso.</p>", "CANCELADO" => "<p class='bp-error'>Pago fallido o cancelado por el usuario.</p>", "REVOCADO" => "<p class='bp-error'>Pago revocado.</p>", "ERROR" => "<p class='bp-error'>Error.</p>",);
$errores_cs = array("201" => "La transacción no puede ser procesada. Contactese con su banco para gestionar la autorizacion en forma manual, si correspondiera. ", "202" => "La transacción no puede ser procesada. Revise que los datos ingresados sean correctos.Si el error persiste, contactese con su banco. ", "203" => "La transacción no puede ser procesada. Intente con otro medio de pago. Si el error persiste, contactese con su banco. ", "204" => "La transacción no puede ser procesada. No se pudo debitar el importe indicado.", "205" => "La transacción no puede ser procesada.", "207" => "La transacción no puede ser procesada. Espere unos minutos e intente nuevamente.", "208" => "La transacción no puede ser procesada. Tarjeta no habilitada para compras por Internet. Proceda a activarla en su banco, espere unos minutos e intente nuevamente.", "209" => "Transacción declinada. Revise que los datos ingresados sean correctos. Si el error persiste, contactese con su banco. ", "210" => "La transacción no puede ser procesada. No se pudo debitar el importe indicado.", "211" => "Transacción declinada. Revise que los datos ingresados sean correctos. Si el error persiste, contactese con su banco. ", "220" => "La transacción no puede ser procesada.Intente con otro medio de pago local o de otro banco. Contáctese con su banco emisor para mayores detalles.", "221" => "La transacción no puede ser procesada.Intente con otro medio de pago local o de otro banco. Contáctese con su banco emisor para mayores detalles.", "222" => "La transacción no puede ser procesada.Intente con otro medio de pago local o de otro banco. Contáctese con su banco emisor para mayores detalles.", "230" => "La transacción no puede ser procesada.Contáctese con su banco emisor para mayores detalles.", "231" => "Transacción declinada.Revise que los datos ingresados sean correctos.Si el error persiste, contactese con su banco. ", "232" => "La transacción no puede ser procesada.Intente con otro medio de pago local o de otro banco. Contáctese con su banco emisor para mayores detalles.", "233" => "La transacción no puede ser procesada.Intente con otro medio de pago local o de otro banco. Contáctese con su banco emisor para mayores detalles.", "234" => "La transacción no puede ser procesada.Contáctese con el comercio.", "236" => "La transacción no puede ser procesada.Espere unos minutos e intente nuevamente.", "240" => "Transacción declinada.Revise que los datos ingresados sean correctos.Si el error persiste, contactese con el comercio. ", "250" => "La transacción no puede ser procesada.Espere unos minutos e intente nuevamente.", "400" => "La transacción no puede ser procesada. Contactese con el comercio.", "481" => "La transacción no puede ser procesada. Contactese con el comercio.", "475" => "La transacción no puede ser procesada. Debe seguir las instrucciones de su banco emisor y registrar la tarjeta para compras seguras por Internet. Termine el registro, espere unos minutos e intente nuevamente.", "476" => "La transacción no puede ser procesada. Asegurese de contar con los datos necesarios para realizar las transacciones seguras por internet e intente nuevamente.", "100" => "Transacción exitosa.", "101" => "La transacción no puede ser procesada, asegurese de haber ingresado todos los datos solicitados de manera correcta.Contactese con el comercio. Intento con otro medio de pago.", "102" => "La transacción no puede ser procesada, asegurese de haber ingresado todos los datos solicitados de manera correcta.Contactese con el comercio. Intento con otro medio de pago.", "150" => "La transacción no puede ser procesada, asegurese de haber ingresado todos los datos solicitados de manera correcta.Contactese con el comercio.", "151" => "La transacción no puede ser procesada.Espere unos minutos e intente nuevamente.", "152" => "La transacción no puede ser procesada. Espere unos minutos e intente nuevamente.");
function banipay_init_gateway_class()
{
    class WC_BaniPay_Gateway extends WC_Payment_Gateway
    {
        public $details = array();
        public $transaction = array();
        public function __construct()
        {
            $this->id = 'banipayv2';
            $this->icon = 'https://v2.banipay.me/assets/img/Logo_BaniPay.png';
            $this->has_fields = false;
            $this->method_title = 'BaniPay Gateway';
            $this->method_description = 'Pasarela de pagos BaniPay v2';
            $this->supports = array('products');
            $this->init_form_fields();
            $this->init_settings();
            $this->title = $this->get_option('title');
            $this->description = $this->get_option('description');
            $this->enabled = $this->get_option('enabled');
            add_action('woocommerce_api_callback', array($this, 'callback_handler'));
            add_action('woocommerce_update_options_payment_gateways', array($this, 'admin_options'));
            add_action('woocommerce_thankyou', array($this, 'thank_you_page'));
            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
            add_action('wp_enqueue_scripts', array($this, 'payment_scripts'));
        }
        public function init_form_fields()
        {
            $this->form_fields = array('enabled' => array('title' => 'Habilitar/Deshabilitar', 'label' => 'Habilitar Pasarela BaniPay', 'type' => 'checkbox', 'description' => 'Pagos BaniPay', 'default' => 'yes', 'class' => 'wppd-ui-toggle'), 'sandbox' => array('title' => 'Ambiente', 'type' => 'select', 'default' => 'Dev', 'options' => array('Dev' => 'Pruebas', 'Prod' => 'Producción')), 'complete_status' => array('title' => 'Estado al Confirmarse el Pago', 'type' => 'select', 'default' => 'completed', 'options' => array('processed' => 'Pago Procesado', 'completed' => 'Completado')), 'title' => array('title' => 'Título', 'type' => 'text', 'description' => 'Muestra el Título que el usuario ve al momento de pagar.', 'default' => 'Paga por BaniPay', 'desc_tip' => true, 'readonly' => true,), 'description' => array('title' => 'Descripción', 'type' => 'textarea', 'description' => 'Muestra la descripción que el usuario ve al momento de pagar.', 'default' => 'BaniPay te permite pagar en comercios Bolivianos. Paga con tarjetas de crédito, débito, billeteras móviles, códigos QR y otros medios de pago.',), 'affiliate_code' => array('title' => 'Código de Afiliado', 'default' => '141581ae-fb1f-4cfb-b21e-040a8851c265', 'type' => 'text', 'description' => 'Código de Ejemplo (test): 141581ae-fb1f-4cfb-b21e-040a8851c265',), 'business_code' => array('title' => 'Código de Empresa', 'default' => '141581ae-fb1f-4cfb-b21e-040a8851c265', 'type' => 'text', 'description' => 'Código de Ejemplo (test): 141581ae-fb1f-4cfb-b21e-040a8851c265',), 'commercial_id' => array('title' => 'ID Comercial', 'default' => 'BC-0001', 'type' => 'text', 'description' => 'Ejemplo: BC-0001',), 'billing' => array('title' => 'Facturación', 'label' => 'Habilitar emisión de facturas con BaniPay Facturación.', 'type' => 'checkbox', 'default' => 'no', 'class' => 'wppd-ui-toggle', 'disabled' => true), 'cybersource' => array('title' => 'Tarjetas de Débito/Crédito', 'label' => 'Habilitar pagos por Tarjetas de Débito/Crédito.', 'type' => 'checkbox', 'default' => 'yes', 'class' => 'wppd-ui-toggle'), 'simple' => array('title' => 'QR BaniPay', 'label' => 'Habilitar pagos por QR BaniPay.', 'type' => 'checkbox', 'default' => 'yes', 'class' => 'wppd-ui-toggle'), 'tigo' => array('title' => 'Tigo Money', 'label' => 'Habilitar pagos por Tigo Money.', 'type' => 'checkbox', 'default' => 'no', 'class' => 'wppd-ui-toggle', 'disabled' => true), 'soli' => array('title' => 'Soli', 'label' => 'Habilitar pagos por Soli.', 'type' => 'checkbox', 'default' => 'no', 'class' => 'wppd-ui-toggle', 'disabled' => true),);
        }
        function admin_options()
        {
?>
 <h2><?php echo $this->title; ?></h2>
 <table class="form-table">

 <?php $this->generate_settings_html(); ?>

 </table> <?php
        }
        public function get_title()
        {
            return apply_filters('woocommerce_gateway_title', $this->title, $this->id);
        }
        public function get_icon()
        {
            $icon = $this->icon ? '<img " src="' . WC_HTTPS::force_https_url($this->icon) . '" alt="' . esc_attr($this->get_title()) . '" />' : '';
            return apply_filters('woocommerce_gateway_icon', $icon, $this->id);
        }
        public function payment_fields()
        {
            if ($this->description)
            {
                echo wpautop(wp_kses_post($this->description));
            }
            $totals = WC()->cart->get_totals();
            if ($this->settings['sandbox'] == "Prod")
            {
                $environmentType = "Prod";
                $baseUrl = "https://v2.banipay.me/api/pagos";
            }
            else
            {
                $environmentType = "Dev";
                $baseUrl = "https://staging.banipay.me/api/pagos";
            }
            echo '<fieldset id="wc-' . esc_attr($this->id) . '-cc-form" class="wc-banipay wc-payment-form fieldset-custom">';
            do_action('woocommerce_credit_card_form_start', $this->id);
            $disabledMDP = "";
            if ($this->settings['cybersource'] == "no")
            {
                $disabledMDP .= '"CYBER_SOURCE",';
            }
            if ($this->settings['simple'] == "no")
            {
                $disabledMDP .= '"SIMPLEQR",';
            }
            if ($this->settings['tigo'] == "no" || $this->settings['sandbox'] == "Prod")
            {
                $disabledMDP .= '"TIGO_MONEY",';
            }
            if ($this->settings['soli'] == "no" || $this->settings['sandbox'] == "Prod")
            {
                $disabledMDP .= '"SOLI",';
            }
            echo '<script id="paymentScript">
            BaniPay.affiliate = "' . $this->settings['affiliate_code'] . '";
			BaniPay.disabled = [' . $disabledMDP . '];
            BaniPay.business = "' . $this->settings['business_code'] . '";
            BaniPay.currency = "' . get_woocommerce_currency() . '";
            BaniPay.total = ' . $totals['total'] . ';
            BaniPay.environmentType = "' . $environmentType . '";
            BaniPay.baseUrl = "' . $baseUrl . '";
            BaniPay.description = "' . get_bloginfo('name') . '";
            BaniPay.commercialId = "' . $this->settings['commercial_id'] . '";
			BaniPay.wordpress = "True";
			paymentBaniPay("' . $this->settings['affiliate_code'] . '");
            </script>';
            do_action('woocommerce_credit_card_form_end', $this->id);
            echo '<div class="clear"></div></fieldset>';
        }
        public function payment_scripts()
        {
            wp_register_style('woocommerce_banipay', plugins_url( 'assets/css/banipay.css', __FILE__ ) );
            wp_enqueue_style('woocommerce_banipay');
            wp_register_style('font_awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css');
            wp_enqueue_style('font_awesome');
            wp_register_script('woocommerce_banipay', plugins_url( 'assets/js/banipay.js', __FILE__ ) );
            wp_enqueue_script('woocommerce_banipay');
        }
        public function get_return_url($order = null)
        {
            if ($order)
            {
                $return_url = $order->get_checkout_order_received_url();
            }
            else
            {
                $return_url = $order->get_checkout_order_received_url();
            }
            if (is_ssl() || get_option('woocommerce_force_ssl_checkout') == 'yes')
            {
                $return_url = str_replace('http:', 'https:', $return_url);
            }
            return apply_filters('woocommerce_get_return_url', $return_url, $order);
        }
        public function process_payment($order_id)
        {
            $order = wc_get_order($order_id);
            wc_setcookie('order_id', $order_id);
            $return_url = $this->get_return_url($order);
            $startBP = "javascript:startBanipayWC('" . $order_id . "', '" . $return_url . "')";
            return array("result" => "success", "redirect" => $startBP);
        }
        function thank_you_page()
        {
            global $woocommerce;
            $order_id = sanitize_text_field($_GET['wcId']);
            $order = wc_get_order($order_id);
            $estado = sanitize_text_field($_GET['bpTrans']);
            add_post_meta($order_id, 'Medio de Pago', sanitize_text_field($_GET['mdp']));
            if (sanitize_text_field($_GET['mdp']) == "SIMPLEQR")
            {
                add_post_meta($order_id, 'Simple ID', sanitize_text_field($_GET['bpId']));
                $simpleid = sanitize_text_field($_GET['bpId']);
                try
                {
                    $qrData = new Transaction();
                    $getQrTransaction = $qrData->getQrTransaction($simpleid, $simpleid, $this->settings['affiliate_code'], sanitize_text_field($_GET['env']));
                    add_post_meta($order_id, 'Transacción BaniPay', $getQrTransaction["transactionGenerated"]);
                    add_post_meta($order_id, 'ID Pago BaniPay', $getQrTransaction["superPaymentCode"]);
                    $newData = new Transaction();
                    $response = $newData->getTransaction($getQrTransaction["transactionGenerated"], sanitize_text_field($_GET['mdp']), sanitize_text_field($_GET['env']));
                    update_post_meta($order_id, 'ID Pago BaniPay', $response["superPaymentCode"]);
                    update_post_meta($order_id, 'Estado Pago BaniPay', $response["paymentStatus"]);
                    if ($response["paymentStatus"] == "PROCESADO")
                    {
                        $order->payment_complete();
                        if ($this->settings['complete_status'] == 'completed')
                        {
                            $order->update_status('completed');
                        }
                    }
                }
                catch(Exception $e)
                {
                    $qrData = new Transaction();
                    $getQrTransaction = $qrData->getQrBcpStatus($simpleid[0]);
                    if ($getQrTransaction["status"] == "PROCESADO")
                    {
                        $order->payment_complete();
                        if ($this->settings['complete_status'] == 'completed')
                        {
                            $order->update_status('completed');
                        }
                    }
                }
            }
            else
            {
                update_post_meta($order_id, 'Transacción BaniPay', sanitize_text_field($_GET['bpTrans']));
            }
            update_post_meta($order_id, 'Ambiente', sanitize_text_field($_GET['env']));
            $newData = new Transaction();
            $response = $newData->getTransaction(sanitize_text_field($_GET['bpTrans']), sanitize_text_field($_GET['mdp']), sanitize_text_field($_GET['env']));
            update_post_meta($order_id, 'ID Pago BaniPay', $response["superPaymentCode"]);
            update_post_meta($order_id, 'Estado Pago BaniPay', $response["paymentStatus"]);
            if ($response["paymentStatus"] == "PROCESADO")
            {
                $order->payment_complete();
                if ($this->settings['complete_status'] == 'completed')
                {
                    $order->update_status('completed');
                }
            }
            $this->emptyCart($woocommerce);
            unset($_COOKIE['payment_id']);
            unset($_COOKIE['order_id']);
            return;
        }
        function emptyCart($woocommerce)
        {
            $woocommerce->cart->empty_cart();
        }
    }
}
function banipay_meta_box()
{
    add_meta_box('Información acerca del Pago en BaniPay', esc_html__('Pagos BaniPay', 'text-domain'), 'render_banipay_box', 'shop_order', 'side', 'high');
}
add_action('add_meta_boxes', 'banipay_meta_box');
function render_banipay_box()
{
    global $estados_bp, $errores_cs;
    $id = get_the_ID();
    $order = wc_get_order($id);
    $payment_method = $order->get_payment_method_title();
    if ($payment_method == "Paga por BaniPay")
    {
        $medio = get_post_meta($id, 'Medio de Pago');
        $transid = get_post_meta($id, 'Transacción BaniPay');
        $payid = get_post_meta($id, 'ID Pago BaniPay');
        $estado = get_post_meta($id, 'Estado BaniPay');
        $ambiente = get_post_meta($id, 'Ambiente');
        echo '<style></style>';
        $bpSettings = get_option('woocommerce_banipayv2_settings');
        if ($ambiente[0] == "Dev")
        {
            echo '<p class="bp-error">Ambiente de Pruebas</p>';
        }
        if ($medio[0] == "CYBER_SOURCE")
        {
            echo '<b>ID Transacción: </b>' . wp_kses_post($transid[0]) . '<br><br>';
            echo '<b>ID Pago: </b>' . wp_kses_post($payid[0]) . '<br><br>';
            $newData = new Transaction();
            $response = $newData->getTransaction($transid[0], $medio[0], $ambiente[0]);
            if ($response["paymentStatus"] == "PROCESADO")
            {
                $class = "bp-processed";
                $order->payment_complete();
                if ($bpSettings['complete_status'] == 'completed')
                {
                    $order->update_status('completed');
                }
            }
            if ($response["paymentStatus"] == "PROCESANDO")
            {
                $class = "bp-started";
                $order->update_status('pending');
            }
            if ($response["paymentStatus"] == "ERROR")
            {
                $class = "bp-error";
                $order->update_status('pending');
            }
            echo '<b>Estado de Pago (BP): </b><p class="' . esc_attr($class) . '">' . wp_kses_post($response["paymentStatus"]) . '</p><br><br>';
            $codigoCS = $response["reserved5"];
            $newData = new Transaction();
            $response = $newData->getTransactionCS($codigoCS, $ambiente[0]);
            if ($response->applicationInformation->reasonCode == "100")
            {
                $estados_cs = "<p class='bp-processed'>Pago Autorizado.</p>";
            }
            else
            {
                $estados_cs = "<p class='bp-error'>Error " . wp_kses_post($response["applicationInformation"]["reasonCode"]) . "</p><p>" . wp_kses_post($errores_cs[$response["applicationInformation"]["reasonCode"]]) . "</p>";
            }
            echo '<b>Medio de Pago: </b>Tarjeta de Débito/Crédito<br><br>';
            echo '<b>Estado de Transacción por Tarjeta: </b>' . wp_kses_post($estados_cs) . '<br><br>';
        }
        if ($medio[0] == "SIMPLEQR")
        {
            $simpleid = get_post_meta($id, 'Simple ID');
            echo '<b>ID Transacción Simple: </b>' . wp_kses_post($simpleid[0]) . '<br><br>';
            $newData = new Transaction();
            $response = $newData->getQrBcpStatus($simpleid[0]);
            if ($response["status"] == "PROCESADO")
            {
                $class = "bp-processed";
                $order->payment_complete();
                if ($bpSettings['complete_status'] == 'completed')
                {
                    $order->update_status('completed');
                }
            }
            if ($response["status"] == "PROCESANDO")
            {
                $class = "bp-started";
                $order->update_status('pending');
            }
            if ($response["status"] == "ERROR")
            {
                $class = "bp-error";
                $order->update_status('pending');
            }
            echo '<b>Estado de Pago (Simple): </b><p class="' . esc_attr($class) . '">' . wp_kses_post($response["status"]) . '</p><br><br>';
            echo '<p>El estado de la transacción aún debe ser validado por BaniPay.</p>';
        }
        echo '            </div>
            </div>';
    }
}
function banipay_admin_style()
{
    wp_register_style('woocommerce_banipay_admin',  plugins_url( 'assets/css/banipay.css', __FILE__ ) );
    wp_enqueue_style('woocommerce_banipay_admin');
}
add_action('admin_enqueue_scripts', 'banipay_admin_style');
