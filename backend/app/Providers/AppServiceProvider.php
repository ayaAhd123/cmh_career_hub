<?php

namespace App\Providers;

use App\Models\ModuleGrade;
use App\Models\Promotion;
use App\Observers\ModuleGradeObserver;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;


class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);

        ModuleGrade::observe(ModuleGradeObserver::class);

        Route::bind('promotion', function (string $value) {
            $query = Promotion::withTrashed();

            if (is_numeric($value)) {
                return $query->where('id', (int) $value)->firstOrFail();
            }

            return $query->where('promo_code', $value)->firstOrFail();
        });
    }

}