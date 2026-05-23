<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Ensure the default admin account exists with a known password.
     */
    public function run(): void
    {
        $user = User::withTrashed()->firstOrNew(['email' => 'admin@cmh.ma']);

        $user->full_name = 'Admin User';
        $user->password = Hash::make('1234');
        $user->role = 'Admin';
        $user->deleted_at = null;
        $user->save();
    }
}
