<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Support\AutoSuspension;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AutoSuspensionTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function report(User $reporter, User $target, array $overrides = []): Report
    {
        return Report::create(array_merge([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $target->id,
            'reason' => 'scam',
            'status' => 'pending',
        ], $overrides));
    }

    public function test_threshold_is_never_below_two(): void
    {
        $this->assertSame(2, AutoSuspension::threshold());

        config(['moderation.auto_suspend_reports' => 1]);
        $this->assertSame(2, AutoSuspension::threshold());

        config(['moderation.auto_suspend_reports' => 5]);
        $this->assertSame(5, AutoSuspension::threshold());
    }

    public function test_one_report_does_not_suspend(): void
    {
        $target = User::factory()->create();
        $this->report(User::factory()->create(), $target);

        $this->assertFalse($target->fresh()->isSuspended());
    }

    public function test_second_report_from_a_different_person_suspends_automatically(): void
    {
        $target = User::factory()->create();
        $this->report(User::factory()->create(), $target);
        $this->report(User::factory()->create(), $target);

        $target->refresh();
        $this->assertTrue($target->isSuspended());
        $this->assertStringContainsString('Automatically suspended', $target->suspension_reason);
        $this->assertStringContainsString('2 different users', $target->suspension_reason);
    }

    public function test_one_person_reporting_twice_counts_once(): void
    {
        $target = User::factory()->create();
        $listing = $this->makeListing($target);
        $reporter = User::factory()->create();

        // Same person: a user report, then a listing report, then another listing.
        $this->report($reporter, $target);
        $this->report($reporter, $target, ['listing_id' => $listing->id]);
        $this->report($reporter, $target, ['listing_id' => $listing->id, 'reason' => 'spam']);

        $this->assertFalse($target->fresh()->isSuspended());
        $this->assertSame(1, AutoSuspension::reporterCount($target));
    }

    public function test_dismissed_and_resolved_reports_do_not_count(): void
    {
        $target = User::factory()->create();

        $this->report(User::factory()->create(), $target, ['status' => 'dismissed']);
        $this->report(User::factory()->create(), $target, ['status' => 'resolved']);
        $this->assertFalse($target->fresh()->isSuspended());

        // One open report is still just one.
        $this->report(User::factory()->create(), $target);
        $this->assertFalse($target->fresh()->isSuspended());

        $this->report(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_reports_from_suspended_accounts_do_not_count(): void
    {
        $target = User::factory()->create();
        $banned = User::factory()->create(['suspended_at' => now()]);

        $this->report($banned, $target);
        $this->report(User::factory()->create(), $target);

        $this->assertFalse($target->fresh()->isSuspended());
    }

    public function test_admins_are_never_auto_suspended(): void
    {
        $admin = $this->makeAdmin();

        $this->report(User::factory()->create(), $admin);
        $this->report(User::factory()->create(), $admin);

        $this->assertFalse($admin->fresh()->isSuspended());
    }

    public function test_an_existing_suspension_is_not_overwritten(): void
    {
        $target = User::factory()->create([
            'suspended_at' => now()->subDay(),
            'suspension_reason' => 'Manual: abusive messages',
        ]);

        $this->report(User::factory()->create(), $target);
        $this->report(User::factory()->create(), $target);

        $this->assertSame('Manual: abusive messages', $target->fresh()->suspension_reason);
    }

    public function test_it_works_through_the_real_report_endpoints(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs(User::factory()->create())
            ->post("/listings/{$listing->id}/report", ['reason' => 'scam'])
            ->assertSessionHas('success');
        $this->assertFalse($seller->fresh()->isSuspended());

        $this->actingAs(User::factory()->create())
            ->post("/users/{$seller->id}/report", ['reason' => 'harassment'])
            ->assertSessionHas('success');

        $this->assertTrue($seller->fresh()->isSuspended());
    }

    public function test_it_also_works_for_transaction_reports(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $buyerOne = User::factory()->create();
        $buyerTwo = User::factory()->create();

        foreach ([$buyerOne, $buyerTwo] as $buyer) {
            $order = $this->makeOrder($listing, $buyer);
            $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
                'reason' => 'fraud',
                'description' => 'The seller took the money and never showed up.',
            ])->assertSessionHasNoErrors();
        }

        $this->assertTrue($seller->fresh()->isSuspended());
    }

    public function test_auto_suspended_user_is_logged_out_and_cannot_log_back_in(): void
    {
        $target = User::factory()->create(['email' => 'bad@example.com', 'password' => 'password123']);
        $this->report(User::factory()->create(), $target);
        $this->report(User::factory()->create(), $target);

        $this->actingAs($target->fresh())->get('/dashboard')->assertRedirect('/login');
        $this->assertGuest();

        $this->post('/login', ['email' => 'bad@example.com', 'password' => 'password123'])
            ->assertSessionHasErrors('email');
    }

    public function test_admin_can_reinstate_an_auto_suspended_user(): void
    {
        $target = User::factory()->create();
        $this->report(User::factory()->create(), $target);
        $this->report(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isSuspended());

        $this->actingAs($this->makeAdmin())
            ->post("/admin/users/{$target->id}/unsuspend")
            ->assertSessionHas('success');

        $this->assertFalse($target->fresh()->isSuspended());
    }

    public function test_higher_configured_threshold_is_respected(): void
    {
        config(['moderation.auto_suspend_reports' => 3]);
        $target = User::factory()->create();

        $this->report(User::factory()->create(), $target);
        $this->report(User::factory()->create(), $target);
        $this->assertFalse($target->fresh()->isSuspended());

        $this->report(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_reporter_who_triggers_suspension_gets_a_popup_not_a_404(): void
    {
        $target = User::factory()->create();
        $this->report(User::factory()->create(), $target);
        $reporter = User::factory()->create();

        $this->actingAs($reporter)
            ->from("/users/{$target->id}")
            ->post("/users/{$target->id}/report", ['reason' => 'scam'])
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('suspended', ['name' => $target->name]);

        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_visiting_a_suspended_profile_redirects_with_a_popup_for_users_but_not_admins(): void
    {
        $target = User::factory()->create(['suspended_at' => now()]);

        $this->actingAs(User::factory()->create())
            ->get("/users/{$target->id}")
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('suspended', ['name' => $target->name]);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->get("/users/{$target->id}")->assertOk();
    }
}
