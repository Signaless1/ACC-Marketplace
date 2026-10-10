<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_name_and_bio(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings/profile', [
            'name' => 'New Name',
            'bio' => 'Hello there',
        ])->assertSessionHas('success');

        $this->assertSame('New Name', $user->fresh()->name);
        $this->assertSame('Hello there', $user->fresh()->bio);
    }

    public function test_user_cannot_escalate_role_through_profile_form(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings/profile', [
            'name' => 'Sneaky',
            'role' => 'admin',
        ]);

        $this->assertSame('user', $user->fresh()->role);
    }

    public function test_password_change_requires_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $this->actingAs($user)->put('/settings/password', [
            'current_password' => 'wrong',
            'password' => 'brand-new-pass1',
            'password_confirmation' => 'brand-new-pass1',
        ])->assertSessionHasErrors('current_password');

        $this->actingAs($user)->put('/settings/password', [
            'current_password' => 'old-password',
            'password' => 'brand-new-pass1',
            'password_confirmation' => 'brand-new-pass1',
        ])->assertSessionHas('success');

        $this->assertTrue(Hash::check('brand-new-pass1', $user->fresh()->password));
    }
}
