<?php
class Transaction
{
    public $transaction = array();
    private $const = array();
    private $payload = array();
    private $transactionGenerated = array();
    private $transactionStatus = array();
    private $transactionStatusCS = array();
    private $paymentGenerated = array();
    public function __construct()
    {
    }
    public function getTransaction($transactionGenerated, $paymentMethod, $environmentType)
    {
        if ($environmentType == "Dev")
        {
            $baseUrl = "https://staging.banipay.me/api/pagos";
        }
        else
        {
            $baseUrl = "https://v2.banipay.me/api/pagos";
        }
        $response = wp_remote_get("{$baseUrl}/payment/transaction/{$transactionGenerated}");
        $this->transactionStatus = json_decode(wp_remote_retrieve_body($response), true);
        return $this->transactionStatus;
    }
    public function getTransactionCS($paymentCS, $environmentType)
    {
        if ($environmentType == "Dev")
        {
            $baseUrl = "https://staging.banipay.me/api/pagos";
        }
        else
        {
            $baseUrl = "https://v2.banipay.me/api/pagos";
        }
        $response = wp_remote_get("{$baseUrl}/payment/cybersource/atc/{$paymentCS}");
        $this->transactionStatusCS = json_decode(wp_remote_retrieve_body($response), true);
        return $this->transactionStatusCS;
    }
    public function getQrTransaction($transaction, $bPaymentId, $affiliateCode, $environmentType)
    {
        if ($environmentType == "Dev")
        {
            $baseUrl = "https://staging.banipay.me/api/pagos";
        }
        else
        {
            $baseUrl = "https://v2.banipay.me/api/pagos";
        }
        $d = date("Y-m-d");
        $n = date('Y-m-d', strtotime($d . " +1 days"));
        $response = wp_remote_get("{$baseUrl}/payment/affiliate/date/{$affiliateCode}?dateEnd={$n}&dateStart={$d}");
        $transactionsGenerated = json_decode(wp_remote_retrieve_body($response), true);
        foreach ($transactionsGenerated as $transactionGen)
        {
            if ($transactionGen->reserved1 == $bPaymentId)
            {
                $this->transactionGenerated = $transactionGen;
                return $this->transactionGenerated;
            }
        }
        return false;
    }
    public function getQrBcpStatus($externalId)
    {
        $response = wp_remote_get("https://modal-flask-dev-q5zse.ondigitalocean.app/consultQR?id={$externalId}");
        $this->transactionGenerated = json_decode(wp_remote_retrieve_body($response), true);
        return $this->transactionGenerated;
    }
}
?>
