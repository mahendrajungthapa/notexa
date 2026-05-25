<?php

namespace App\Providers;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->ensureRuntimeDirectories();

        if (! is_string(config('view.compiled')) || trim((string) config('view.compiled')) === '') {
            Config::set('view.compiled', storage_path('framework/views'));
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }

    private function ensureRuntimeDirectories(): void
    {
        foreach ([
            storage_path('framework/cache/data'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            storage_path('logs'),
            base_path('bootstrap/cache'),
        ] as $path) {
            if (! is_dir($path)) {
                @mkdir($path, 0775, true);
            }
        }
    }
}
