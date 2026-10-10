<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Creates (or promotes) the default administrator. Safe to run repeatedly:
     *   php artisan db:seed --class=AdminSeeder
     *
     * Change this password immediately outside of local development.
     */
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@acc.test'],
            ['name' => 'ACC Admin', 'password' => 'password']
        )->forceFill(['role' => 'admin'])->save();
    }
}
