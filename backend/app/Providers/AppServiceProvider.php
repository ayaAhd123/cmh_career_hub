<?php

namespace App\Providers;

use App\Models\ModuleGrade;
use App\Models\Promotion;
use App\Observers\ModuleGradeObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;


class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);

        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        $this->configureRateLimiting();

        ModuleGrade::observe(ModuleGradeObserver::class);

        Route::bind('promotion', function (string $value) {
            $query = Promotion::withTrashed();

            if (is_numeric($value)) {
                return $query->where('id', (int) $value)->firstOrFail();
            }

            return $query->where('promo_code', $value)->firstOrFail();
        });
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');

            return [
                Limit::perMinute(10)->by($request->ip()),
                Limit::perMinute(20)->by($email !== '' ? $email : $request->ip()),
            ];
        });

        RateLimiter::for('ai', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(20)->by('ai:'.$key);
        });

        RateLimiter::for('api', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(180)->by('api:'.$key);
        });
    }
}