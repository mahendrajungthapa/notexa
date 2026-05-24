<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        User::create([
            'name' => 'Notexa Admin',
            'username' => 'admin',
            'email' => 'admin@notexa.com',
            'password' => Hash::make('NotexaAdmin@2026'),
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        // Settings
        $settings = [
            // General
            ['key'=>'site_name','value'=>'Notexa','type'=>'string','group'=>'general'],
            ['key'=>'site_logo','value'=>'','type'=>'string','group'=>'general'],
            ['key'=>'site_description','value'=>'Collaborative Note Taking Platform','type'=>'string','group'=>'general'],
            ['key'=>'about_us','value'=>'<h2>About Notexa</h2><p>Notexa is a collaborative note-taking platform built as a college minor project. Create notes, share with friends, collaborate in real-time, and much more.</p>','type'=>'text','group'=>'general'],

            // Email
            ['key'=>'email_verification_enabled','value'=>'false','type'=>'boolean','group'=>'email'],
            ['key'=>'smtp_host','value'=>'','type'=>'string','group'=>'smtp'],
            ['key'=>'smtp_port','value'=>'587','type'=>'string','group'=>'smtp'],
            ['key'=>'smtp_username','value'=>'','type'=>'string','group'=>'smtp'],
            ['key'=>'smtp_password','value'=>'','type'=>'string','group'=>'smtp'],
            ['key'=>'smtp_encryption','value'=>'tls','type'=>'string','group'=>'smtp'],
            ['key'=>'smtp_from_address','value'=>'noreply@notexa.com','type'=>'string','group'=>'smtp'],
            ['key'=>'smtp_from_name','value'=>'Notexa','type'=>'string','group'=>'smtp'],

            // Legal
            ['key'=>'privacy_policy','value'=>'<h1>Privacy Policy</h1><p>Your privacy matters to us.</p>','type'=>'text','group'=>'legal'],
            ['key'=>'terms_conditions','value'=>'<h1>Terms and Conditions</h1><p>By using Notexa you agree to these terms.</p>','type'=>'text','group'=>'legal'],

            // Cloudflare R2 (admin configurable)
            ['key'=>'r2_access_key','value'=>'','type'=>'string','group'=>'storage'],
            ['key'=>'r2_secret_key','value'=>'','type'=>'string','group'=>'storage'],
            ['key'=>'r2_bucket','value'=>'notexa-files','type'=>'string','group'=>'storage'],
            ['key'=>'r2_endpoint','value'=>'','type'=>'string','group'=>'storage'],
            ['key'=>'r2_public_url','value'=>'','type'=>'string','group'=>'storage'],

            // AI
            ['key'=>'ai_provider','value'=>'deepseek','type'=>'string','group'=>'ai'],
            ['key'=>'openai_api_key','value'=>'','type'=>'string','group'=>'ai'],
            ['key'=>'openai_base_url','value'=>'https://api.openai.com/v1','type'=>'string','group'=>'ai'],
            ['key'=>'openai_model','value'=>'gpt-4o-mini','type'=>'string','group'=>'ai'],
            ['key'=>'gemini_api_key','value'=>'','type'=>'string','group'=>'ai'],
            ['key'=>'gemini_base_url','value'=>'https://generativelanguage.googleapis.com/v1beta','type'=>'string','group'=>'ai'],
            ['key'=>'gemini_model','value'=>'gemini-1.5-flash','type'=>'string','group'=>'ai'],
            ['key'=>'deepseek_api_key','value'=>'','type'=>'string','group'=>'ai'],
            ['key'=>'deepseek_base_url','value'=>'https://api.deepseek.com','type'=>'string','group'=>'ai'],
            ['key'=>'deepseek_model','value'=>'deepseek-v4-flash','type'=>'string','group'=>'ai'],
            ['key'=>'ai_enabled','value'=>'true','type'=>'boolean','group'=>'ai'],
        ];

        foreach ($settings as $s) SiteSetting::create($s);
    }
}
