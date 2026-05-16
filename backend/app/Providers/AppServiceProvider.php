<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \App\Models\ModuleGrade::observe(\App\Observers\ModuleGradeObserver::class);
        \App\Models\Module::observe(\App\Observers\ModuleObserver::class);
    }
}
