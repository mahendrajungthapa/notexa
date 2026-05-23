<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ApiNepalPaymentService
{
    private function getKeys(): array
    {
        return [
            'public_key' => SiteSetting::get('apinepal_public_key', config('services.apinepal.public_key', '')),
            'secret_key' => SiteSetting::get('apinepal_secret_key', config('services.apinepal.secret_key', '')),
            'mode' => SiteSetting::get('apinepal_mode', 'test'),
        ];
    }

    public function initiatePayment(array $data): array
    {
        $keys = $this->getKeys();
        $identifier = 'NTX' . strtoupper(Str::random(10));

        $url = $keys['mode'] === 'live'
            ? 'https://apinepal.com/payment/initiate'
            : 'https://apinepal.com/test/payment/initiate';

        $parameters = [
            'public_key' => $keys['public_key'],
            'secret_key' => $keys['secret_key'],
            'identifier' => $identifier,
            'currency' => $data['currency'] ?? 'NPR',
            'amount' => $data['amount'],
            'details' => $data['details'] ?? 'Notexa Premium Subscription',
            'ipn_url' => url('/api/subscription/ipn'),
            'success_url' => config('app.frontend_url', 'http://localhost:3000') . '/dashboard/subscription?status=success',
            'cancel_url' => config('app.frontend_url', 'http://localhost:3000') . '/dashboard/subscription?status=cancelled',
            'site_name' => SiteSetting::get('site_name', 'Notexa'),
            'checkout_theme' => 'light',
            'customer' => $data['customer'],
        ];

        $response = Http::asForm()->post($url, $parameters);
        $result = $response->json();

        return [
            'identifier' => $identifier,
            'api_response' => $result,
            'success' => ($result['status'] ?? '') === 'success',
            'redirect_url' => $result['redirect_url'] ?? null,
            'sdk_url' => $result['sdk_url'] ?? null,
            'trx_number' => $result['trx_number'] ?? null,
        ];
    }

    public function validateIPN(string $status, string $signature, string $identifier, array $data): bool
    {
        $keys = $this->getKeys();
        $customKey = $data['amount'] . $identifier;
        $mySignature = strtoupper(hash_hmac('sha256', $customKey, $keys['secret_key']));
        return $status === 'success' && $signature === $mySignature;
    }

    public function checkPaymentStatus(string $trxNumber): array
    {
        $keys = $this->getKeys();
        $response = Http::asForm()->post('https://apinepal.com/payment/payment-status', [
            'public_key' => $keys['public_key'],
            'secret_key' => $keys['secret_key'],
            'trx_number' => $trxNumber,
        ]);
        return $response->json();
    }
}
