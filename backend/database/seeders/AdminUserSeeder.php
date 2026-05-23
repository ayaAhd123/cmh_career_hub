<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
class AdminUserSeeder extends Seeder
{
    /**
     * Create the initial admin account if missing. Never overwrites an existing password.
     */
    public function run(): void
    {
        $user = User::withTrashed()->firstOrNew(['email' => 'admin@cmh.ma']);
        $isNew = ! $user->exists;

        if ($isNew) {
            $user->full_name = 'Admin User';
            $user->password = env('ADMIN_INITIAL_PASSWORD', 'ChangeMeNow!');
            $user->role = 'Admin';
        }

        $user->deleted_at = null;
        $user->save();
    }
}
