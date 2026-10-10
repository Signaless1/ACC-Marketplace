<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class ModerationTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_user_can_report_listing_once(): void
    {
        $seller = User::factory()->create();
        $reporter = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($reporter)
            ->post("/listings/{$listing->id}/report", ['reason' => 'scam'])
            ->assertSessionHas('success');

        $this->actingAs($reporter)
            ->post("/listings/{$listing->id}/report", ['reason' => 'spam'])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('reports', 1);
    }

    public function test_invalid_reason_is_rejected(): void
    {
        $seller = User::factory()->create();
        $reporter = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($reporter)
            ->post("/listings/{$listing->id}/report", ['reason' => 'because'])
            ->assertSessionHasErrors('reason');
    }

    public function test_cannot_report_yourself_or_own_listing(): void
    {
        $user = User::factory()->create();
        $listing = $this->makeListing($user);

        $this->actingAs($user)->post("/listings/{$listing->id}/report", ['reason' => 'spam'])
            ->assertSessionHas('error');
        $this->actingAs($user)->post("/users/{$user->id}/report", ['reason' => 'spam'])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('reports', 0);
    }

    public function test_non_admin_cannot_access_admin_area(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/admin')->assertForbidden();
        $this->actingAs($user)->get('/admin/reports')->assertForbidden();
    }

    public function test_guest_is_redirected_from_admin_area(): void
    {
        $this->get('/admin')->assertRedirect();
    }

    public function test_admin_can_resolve_report_and_hide_listing(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $reporter = User::factory()->create();
        $listing = $this->makeListing($seller);

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'listing_id' => $listing->id,
            'reported_user_id' => $seller->id,
            'reason' => 'scam',
        ]);

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved',
            'admin_note' => 'Confirmed scam.',
            'hide_listing' => true,
        ])->assertSessionHas('success');

        $report->refresh();
        $this->assertSame('resolved', $report->status);
        $this->assertSame($admin->id, $report->reviewed_by);
        $this->assertNotNull($listing->fresh()->hidden_at);
    }

    public function test_admin_can_suspend_user_and_suspended_user_is_logged_out(): void
    {
        $admin = $this->makeAdmin();
        $user = User::factory()->create();

        $this->actingAs($admin)->post("/admin/users/{$user->id}/suspend");
        $this->assertTrue($user->fresh()->isSuspended());

        $this->actingAs($user->fresh())->get('/marketplace')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_admin_cannot_suspend_admins_or_themselves(): void
    {
        $admin = $this->makeAdmin();
        $other = $this->makeAdmin();

        $this->actingAs($admin)->post("/admin/users/{$other->id}/suspend")->assertSessionHas('error');
        $this->actingAs($admin)->post("/admin/users/{$admin->id}/suspend")->assertSessionHas('error');

        $this->assertFalse($other->fresh()->isSuspended());
    }

    public function test_hidden_listing_returns_404_to_other_users_but_not_owner(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();
        $listing = $this->makeListing($seller, ['hidden_at' => now()]);

        $this->actingAs($other)->get("/listings/{$listing->id}")->assertNotFound();
        $this->actingAs($seller)->get("/listings/{$listing->id}")->assertOk();
    }

    public function test_user_cannot_edit_or_delete_another_users_listing(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($other)->get("/listings/{$listing->id}/edit")->assertForbidden();
        $this->actingAs($other)->delete("/listings/{$listing->id}")->assertForbidden();
        $this->assertDatabaseHas('listings', ['id' => $listing->id]);
    }
}
