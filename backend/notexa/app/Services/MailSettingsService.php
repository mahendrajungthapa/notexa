<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class MailSettingsService
{
    public static function apply(): void
    {
        $host = trim((string) SiteSetting::get('smtp_host', ''));
        $port = (int) SiteSetting::get('smtp_port', 587);
        $username = trim((string) SiteSetting::get('smtp_username', ''));
        $password = (string) SiteSetting::get('smtp_password', '');
        $scheme = trim((string) SiteSetting::get('smtp_encryption', 'tls'));
        $fromAddress = trim((string) SiteSetting::get('smtp_from_address', Config::get('mail.from.address', 'hello@example.com')));
        $fromName = trim((string) SiteSetting::get('smtp_from_name', SiteSetting::get('site_name', Config::get('app.name', 'Notexa'))));

        Config::set('mail.default', $host === '' ? 'log' : 'smtp');
        Config::set('mail.mailers.smtp.host', $host === '' ? '127.0.0.1' : $host);
        Config::set('mail.mailers.smtp.port', $port > 0 ? $port : 587);
        Config::set('mail.mailers.smtp.username', $username === '' ? null : $username);
        Config::set('mail.mailers.smtp.password', $password === '' ? null : $password);
        Config::set('mail.mailers.smtp.scheme', $scheme === '' ? null : $scheme);
        Config::set('mail.mailers.smtp.encryption', $scheme === '' ? null : $scheme);
        Config::set('mail.from.address', $fromAddress === '' ? 'hello@example.com' : $fromAddress);
        Config::set('mail.from.name', $fromName === '' ? 'Notexa' : $fromName);

        Mail::purge('smtp');
    }

    public static function hasSmtpConfig(): bool
    {
        return trim((string) SiteSetting::get('smtp_host', '')) !== '';
    }
}
