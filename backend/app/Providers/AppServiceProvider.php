<?php

namespace App\Providers;

use App\Models\Promotion;
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

        Route::bind('promotion', fn (string $value) => Promotion::withTrashed()->findOrFail($value));
    }

}