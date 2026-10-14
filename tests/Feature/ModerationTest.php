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

        $this->actingAs($user)->get('/admin/users')->assertForbidden();
        $this->actingAs($user)->get('/admin/reports')->assertForbidden();
        $this->actingAs($user)->get('/admin/orders')->assertForbidden();
    }

    public function test_guest_is_redirected_from_admin_area(): void
    {
        $this->get('/admin/reports')->assertRedirect();
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
            'remove_listing' => true,
            'removal_reason' => 'scam',
        ])->assertSessionHas('success');

        $report->refresh();
        $this->assertSame('resolved', $report->status);
        $this->assertSame($admin->id, $report->reviewed_by);

        $listing->refresh();
        $this->assertNotNull($listing->hidden_at);
        $this->assertSame('scam', $listing->removed_reason);
        $this->assertSame($admin->id, $listing->removed_by);

        // Removing the listing must NOT suspend the seller.
        $this->assertFalse($seller->fresh()->isSuspended());
    }

    public function test_admin_can_suspend_user_and_suspended_user_is_logged_out(): void
    {
        $admin = $this->makeAdmin();
        $user = User::factory()->create();

        $this->actingAs($admin)->post("/admin/users/{$user->id}/suspend", [
            'reason' => 'Repeated scam reports.',
        ]);
        $this->assertTrue($user->fresh()->isSuspended());
        $this->assertSame('Repeated scam reports.', $user->fresh()->suspension_reason);

        $this->actingAs($user->fresh())->get('/marketplace')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_admin_cannot_suspend_admins_or_themselves(): void
    {
        $admin = $this->makeAdmin();
        $other = $this->makeAdmin();

        $this->actingAs($admin)->post("/admin/users/{$other->id}/suspend", ['reason' => 'testing reasons'])->assertSessionHas('error');
        $this->actingAs($admin)->post("/admin/users/{$admin->id}/suspend", ['reason' => 'testing reasons'])->assertSessionHas('error');

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

    public function test_suspending_a_user_requires_a_reason(): void
    {
        $admin = $this->makeAdmin();
        $user = User::factory()->create();

        $this->actingAs($admin)->post("/admin/users/{$user->id}/suspend", [])
            ->assertSessionHasErrors('reason');

        $this->assertFalse($user->fresh()->isSuspended());
    }

    public function test_admin_removes_listing_with_reason_without_suspending_seller(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", [])
            ->assertSessionHasErrors('reason');

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", [
            'reason' => 'prohibited',
            'note' => 'Not allowed on campus.',
        ])->assertSessionHas('success');

        $listing->refresh();
        $this->assertNotNull($listing->hidden_at);
        $this->assertSame('prohibited', $listing->removed_reason);
        $this->assertSame('Not allowed on campus.', $listing->removed_note);
        $this->assertFalse($seller->fresh()->isSuspended());

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/restore");
        $this->assertNull($listing->fresh()->hidden_at);
        $this->assertNull($listing->fresh()->removed_reason);
    }

    public function test_other_reason_requires_a_note(): void
    {
        $admin = $this->makeAdmin();
        $listing = $this->makeListing(User::factory()->create());

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", ['reason' => 'other'])
            ->assertSessionHasErrors('note');
    }

    public function test_seller_sees_why_their_listing_was_removed(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", ['reason' => 'duplicate']);

        $this->actingAs($seller)->get("/listings/{$listing->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('listing.removed_reason', 'duplicate')
                ->where('listing.removed_reason_label', 'Duplicate listing'));
    }

    public function test_report_actions_need_their_own_reasons(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);
        $report = Report::create([
            'reporter_id' => User::factory()->create()->id,
            'listing_id' => $listing->id,
            'reported_user_id' => $seller->id,
            'reason' => 'scam',
        ]);

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved',
            'remove_listing' => true,
        ])->assertSessionHasErrors('removal_reason');

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved',
            'suspend_user' => true,
        ])->assertSessionHasErrors('suspension_reason');

        $this->assertNull($listing->fresh()->hidden_at);
        $this->assertFalse($seller->fresh()->isSuspended());
    }

    public function test_admin_can_escalate_a_report_to_an_authority(): void
    {
        $admin = $this->makeAdmin();
        $report = Report::create([
            'reporter_id' => User::factory()->create()->id,
            'reported_user_id' => User::factory()->create()->id,
            'reason' => 'harassment',
        ]);

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", ['status' => 'escalated'])
            ->assertSessionHasErrors('escalated_to');

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'escalated',
            'escalated_to' => 'Student Affairs Office',
        ])->assertSessionHas('success');

        $report->refresh();
        $this->assertSame('escalated', $report->status);
        $this->assertSame('Student Affairs Office', $report->escalated_to);
        $this->assertNotNull($report->escalated_at);
    }

    public function test_admin_overview_redirects_to_the_dashboard(): void
    {
        $this->actingAs($this->makeAdmin())->get('/admin')->assertRedirect('/dashboard');
    }
}
