<?php
/**
 * Pusher Helper - Lightweight implementation without Composer
 * Uses cURL to trigger Pusher events
 */
require_once __DIR__ . '/config.php';

class Pusher
{
    private $appId;
    private $key;
    private $secret;
    private $cluster;

    public function __construct()
    {
        $this->appId = PUSHER_APP_ID;
        $this->key = PUSHER_KEY;
        $this->secret = PUSHER_SECRET;
        $this->cluster = PUSHER_CLUSTER;
    }

    /**
     * Trigger an event on a channel
     */
    public function trigger($channel, $event, $data)
    {
        $host = "api-{$this->cluster}.pusher.com";
        $path = "/apps/{$this->appId}/events";

        $body = json_encode([
            'name' => $event,
            'channel' => $channel,
            'data' => json_encode($data)
        ]);

        $timestamp = time();
        $bodyMd5 = md5($body);

        $params = [
            'auth_key' => $this->key,
            'auth_timestamp' => $timestamp,
            'auth_version' => '1.0',
            'body_md5' => $bodyMd5
        ];

        ksort($params);
        $queryString = http_build_query($params);

        $signatureString = "POST\n{$path}\n{$queryString}";
        $signature = hash_hmac('sha256', $signatureString, $this->secret);

        $url = "https://{$host}{$path}?{$queryString}&auth_signature={$signature}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($body)
            ],
            CURLOPT_TIMEOUT => 5
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }

    /**
     * Generate auth signature for private channels
     */
    public function socketAuth($channel, $socketId)
    {
        $stringToSign = "{$socketId}:{$channel}";
        $signature = hash_hmac('sha256', $stringToSign, $this->secret);
        return [
            'auth' => "{$this->key}:{$signature}"
        ];
    }
}

// Helper function
function pusher()
{
    static $instance = null;
    if ($instance === null) {
        $instance = new Pusher();
    }
    return $instance;
}
