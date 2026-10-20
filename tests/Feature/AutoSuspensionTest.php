<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\User;
use App\Support\ReportModeration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AutoSuspensionTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        // Pin every rule so these tests never depend on what is in .env.
        config([
            'marketplace.reports.auto_suspend_threshold' => 2,
            'marketplace.reports.window_days' => 30,
            'marketplace.reports.min_reporter_age_hours' => 0,
            'marketplace.reports.daily_limit' => 50,
        ]);
    }

    /** File a real report through the app, the way a person would. */
    private function fileReport(User $reporter, User $target, array $data = [])
    {
        return $this->actingAs($reporter)->post("/users/{$target->id}/report", array_merge([
            'reason' => 'scam',
            'description' => 'They asked me to pay first and then stopped replying.',
        ], $data));
    }

    /** Insert a report directly, for setting up situations that need a specific history. */
    private function makeReport(User $reporter, User $target, array $attributes = []): Report
    {
        $report = new Report();
        $report->forceFill(array_merge([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $target->id,
            'reason' => 'scam',
            'description' => 'This person asked me to pay before showing the item.',
            'status' => 'pending',
        ], $attributes))->save();

        return $report;
    }

    // ---------------------------------------------------------------
    // The rule itself
    // ---------------------------------------------------------------

    public function test_two_different_people_reporting_suspends_the_account_automatically(): void
    {
        $target = User::factory()->create();
        $one = User::factory()->create();
        $two = User::factory()->create();

        $this->fileReport($one, $target)->assertSessionHas('success');
        $this->assertFalse($target->fresh()->isSuspended(), 'One report must never be enough.');

        $this->fileReport($two, $target)->assertSessionHas('success');

        $target = $target->fresh();
        $this->assertTrue($target->isSuspended());
        $this->assertTrue($target->isAutoSuspended());
        $this->assertSame('auto', $target->suspension_type);
        $this->assertStringContainsString('Automatically suspended', $target->suspension_reason);

        // A suspended member is locked out immediately, and cannot log back in.
        $this->actingAs($target)->get('/dashboard')->assertRedirect('/login');
        auth()->logout();

        $this->post('/login', ['email' => $target->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_the_threshold_can_be_raised_but_never_lowered_below_two(): void
    {
        config(['marketplace.reports.auto_suspend_threshold' => 1]);
        $this->assertSame(2, ReportModeration::threshold());

        config(['marketplace.reports.auto_suspend_threshold' => 0]);
        $this->assertSame(2, ReportModeration::threshold());

        config(['marketplace.reports.auto_suspend_threshold' => 3]);
        $this->assertSame(3, ReportModeration::threshold());

        // With the floor in force, a single report suspends nobody.
        config(['marketplace.reports.auto_suspend_threshold' => 1]);
        $target = User::factory()->create();
        $this->fileReport(User::factory()->create(), $target);

        $this->assertFalse($target->fresh()->isSuspended());
    }

    public function test_a_higher_threshold_needs_more_people(): void
    {
        config(['marketplace.reports.auto_suspend_threshold' => 3]);

        $target = User::factory()->create();

        foreach (range(1, 2) as $i) {
            $this->fileReport(User::factory()->create(), $target);
        }
        $this->assertFalse($target->fresh()->isSuspended());

        $this->fileReport(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_the_same_person_reporting_twice_counts_once(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);
        $reporter = User::factory()->create();

        $this->actingAs($reporter)->post("/listings/{$listing->id}/report", [
            'reason' => 'scam',
            'description' => 'The listing photos are stolen from another website.',
        ])->assertSessionHas('success');

        // A second, genuinely different report about the same seller.
        $this->fileReport($reporter, $seller)->assertSessionHas('success');

        $this->assertSame(2, Report::query()->count());
        $this->assertSame(1, ReportModeration::qualifyingReporterCount($seller));
        $this->assertFalse($seller->fresh()->isSuspended());
    }

    // ---------------------------------------------------------------
    // Reports that do not count (they still reach the admins)
    // ---------------------------------------------------------------

    public function test_reports_without_details_or_evidence_do_not_count(): void
    {
        $target = User::factory()->create();

        $this->fileReport(User::factory()->create(), $target, ['description' => null]);
        $this->fileReport(User::factory()->create(), $target, ['description' => null]);

        $this->assertSame(2, Report::query()->count(), 'Both still reach the admins.');
        $this->assertSame(0, ReportModeration::qualifyingReporterCount($target));
        $this->assertFalse($target->fresh()->isSuspended());
    }

    public function test_an_attached_file_counts_as_substance_even_without_a_long_description(): void
    {
        $target = User::factory()->create();

        $this->fileReport(User::factory()->create(), $target, [
            'description' => null,
            'attachments' => [UploadedFile::fake()->create('screenshot.jpg', 100, 'image/jpeg')],
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, ReportModeration::qualifyingReporterCount($target));
        $this->assertFalse($target->fresh()->isSuspended());

        $this->fileReport(User::factory()->create(), $target);

        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_vague_reasons_never_count_towards_a_suspension(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs(User::factory()->create())->post("/listings/{$listing->id}/report", [
            'reason' => 'duplicate',
            'description' => 'This is the same listing posted three times.',
        ])->assertSessionHas('success');

        $this->fileReport(User::factory()->create(), $seller, [
            'reason' => 'other',
            'description' => 'Something about this person feels off to me.',
        ])->assertSessionHas('success');

        $this->assertSame(2, Report::query()->count());
        $this->assertSame(0, ReportModeration::qualifyingReporterCount($seller));
        $this->assertFalse($seller->fresh()->isSuspended());
    }

    public function test_dismissed_and_false_reports_do_not_count_but_upheld_ones_do(): void
    {
        $target = User::factory()->create();

        $this->makeReport(User::factory()->create(), $target, ['status' => 'dismissed']);
        $this->makeReport(User::factory()->create(), $target, ['status' => 'dismissed', 'bad_faith' => true]);
        $this->assertSame(0, ReportModeration::qualifyingReporterCount($target));

        // An upheld report is the strongest signal there is.
        $this->makeReport(User::factory()->create(), $target, ['status' => 'resolved']);
        $this->makeReport(User::factory()->create(), $target, ['status' => 'pending']);

        $this->assertSame(2, ReportModeration::qualifyingReporterCount($target));
        $this->assertSame('suspended', ReportModeration::evaluate($target));
    }

    public function test_reporters_must_be_in_good_standing(): void
    {
        $target = User::factory()->create();
        $first = User::factory()->create();
        $noPhone = User::factory()->withoutPhone()->create();

        $this->fileReport($first, $target);
        $this->fileReport($noPhone, $target);

        // An account with no phone number on file is not counted...
        $this->assertSame(1, ReportModeration::qualifyingReporterCount($target));
        $this->assertFalse($target->fresh()->isSuspended());

        // ...and neither is a reporter who has since been suspended themselves.
        $first->forceFill(['suspended_at' => now(), 'suspension_type' => 'manual'])->save();
        $this->assertSame(0, ReportModeration::qualifyingReporterCount($target));

        $this->fileReport(User::factory()->create(), $target);
        $this->assertFalse($target->fresh()->isSuspended());

        $this->fileReport(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_brand_new_accounts_do_not_count_when_a_minimum_age_is_set(): void
    {
        config(['marketplace.reports.min_reporter_age_hours' => 24]);

        $target = User::factory()->create();
        $one = User::factory()->create();
        $two = User::factory()->create();

        // Two accounts made a minute ago cannot knock someone out together.
        $this->fileReport($one, $target);
        $this->fileReport($two, $target);

        $this->assertSame(2, Report::query()->count());
        $this->assertFalse($target->fresh()->isSuspended());

        // Once the accounts have some age, the same reports carry weight.
        User::query()->whereIn('id', [$one->id, $two->id])->update(['created_at' => now()->subDays(3)]);

        $this->assertSame('suspended', ReportModeration::evaluate($target));
        $this->assertTrue($target->fresh()->isAutoSuspended());
    }

    public function test_reports_outside_the_window_do_not_count(): void
    {
        $target = User::factory()->create();

        $this->makeReport(User::factory()->create(), $target, ['created_at' => now()->subDays(40)]);
        $this->makeReport(User::factory()->create(), $target);

        $this->assertSame(1, ReportModeration::qualifyingReporterCount($target));
        $this->assertNull(ReportModeration::evaluate($target));
        $this->assertFalse($target->fresh()->isSuspended());
    }

    public function test_admins_are_never_suspended_by_reports(): void
    {
        $admin = $this->makeAdmin();

        $this->fileReport(User::factory()->create(), $admin);
        $this->fileReport(User::factory()->create(), $admin);

        $this->assertSame(2, Report::query()->count());
        $this->assertFalse($admin->fresh()->isSuspended());
        $this->assertNull(ReportModeration::evaluate($admin));
    }

    // ---------------------------------------------------------------
    // Not a weapon: disputes and retaliation
    // ---------------------------------------------------------------

    public function test_a_two_sided_dispute_never_suspends_either_person(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $order = $this->makeOrder($this->makeListing($seller), $buyer, 'confirmed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'no_show',
            'description' => 'The seller did not come to the agreed meeting place.',
        ])->assertSessionHas('success');

        $this->actingAs($seller)->post("/orders/{$order->id}/report", [
            'reason' => 'no_show',
            'description' => 'I waited at the agreed place and the buyer never came.',
        ])->assertSessionHas('success');

        $this->assertSame(2, Report::query()->count());
        $this->assertFalse($seller->fresh()->isSuspended());
        $this->assertFalse($buyer->fresh()->isSuspended());
    }

    public function test_a_counter_report_does_not_count_against_someone_who_complained_first(): void
    {
        $seller = User::factory()->create();
        $buyerOne = User::factory()->create();
        $buyerTwo = User::factory()->create();
        $buyerThree = User::factory()->create();

        // The seller complained about buyerOne first...
        $this->makeReport($seller, $buyerOne, ['created_at' => now()->subDay()]);
        // ...and buyerOne's report back is retaliation, so it is set aside.
        $this->makeReport($buyerOne, $seller);
        $this->makeReport($buyerTwo, $seller);

        $this->assertSame(1, ReportModeration::qualifyingReporterCount($seller));
        $this->assertNull(ReportModeration::evaluate($seller));
        $this->assertFalse($seller->fresh()->isSuspended());

        // Another independent person is a different matter.
        $this->makeReport($buyerThree, $seller);

        $this->assertSame('suspended', ReportModeration::evaluate($seller));
    }

    // ---------------------------------------------------------------
    // A precaution, not a verdict
    // ---------------------------------------------------------------

    public function test_dismissing_a_report_lifts_the_automatic_suspension(): void
    {
        $admin = $this->makeAdmin();
        $target = User::factory()->create();
        $one = User::factory()->create();
        $two = User::factory()->create();

        $this->fileReport($one, $target);
        $this->fileReport($two, $target);
        $this->assertTrue($target->fresh()->isAutoSuspended());

        $report = Report::query()->where('reporter_id', $two->id)->firstOrFail();

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'dismissed',
            'decision_note' => 'The messages show a normal conversation.',
        ])->assertSessionHas('success', fn ($message) => str_contains($message, 'lifted'));

        $target = $target->fresh();
        $this->assertFalse($target->isSuspended());
        $this->assertNull($target->suspension_type);
        $this->assertNull($target->suspension_reason);

        $this->assertTrue(
            ReportEvent::query()->where('report_id', $report->id)->where('event', 'auto_lifted')->exists()
        );
    }

    public function test_an_admins_own_suspension_is_never_lifted_automatically(): void
    {
        $admin = $this->makeAdmin();
        $target = User::factory()->create();
        $one = User::factory()->create();
        $two = User::factory()->create();

        $this->actingAs($admin)->post("/admin/users/{$target->id}/suspend", ['reason' => 'Selling stolen goods.'])
            ->assertSessionHas('success');
        $this->assertSame('manual', $target->fresh()->suspension_type);

        $first = $this->makeReport($one, $target);
        $second = $this->makeReport($two, $target);

        foreach ([$first, $second] as $report) {
            $this->actingAs($admin)->patch("/admin/reports/{$report->id}", ['status' => 'dismissed']);
        }

        $this->assertTrue($target->fresh()->isSuspended(), 'Only automatic suspensions are lifted automatically.');
    }

    public function test_confirming_an_automatic_suspension_makes_it_the_admins_decision(): void
    {
        $admin = $this->makeAdmin();
        $target = User::factory()->create();
        $one = User::factory()->create();
        $two = User::factory()->create();

        $this->fileReport($one, $target);
        $this->fileReport($two, $target);
        $this->assertTrue($target->fresh()->isAutoSuspended());

        $first = Report::query()->where('reporter_id', $one->id)->firstOrFail();
        $second = Report::query()->where('reporter_id', $two->id)->firstOrFail();

        $this->actingAs($admin)->patch("/admin/reports/{$first->id}", [
            'status' => 'resolved',
            'suspend_user' => true,
            'suspension_reason' => 'Confirmed: asked buyers to pay before meeting.',
        ])->assertSessionHas('success');

        $target = $target->fresh();
        $this->assertSame('manual', $target->suspension_type);
        $this->assertSame('Confirmed: asked buyers to pay before meeting.', $target->suspension_reason);

        // Dismissing the other report no longer matters: it is the admin's call now.
        $this->actingAs($admin)->patch("/admin/reports/{$second->id}", ['status' => 'dismissed']);

        $this->assertTrue($target->fresh()->isSuspended());
    }

    public function test_reinstating_someone_starts_the_count_again(): void
    {
        $admin = $this->makeAdmin();
        $target = User::factory()->create();

        $this->fileReport(User::factory()->create(), $target);
        $this->fileReport(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isAutoSuspended());

        $this->travel(1)->minutes();
        $this->actingAs($admin)->post("/admin/users/{$target->id}/unsuspend")->assertSessionHas('success');

        $target = $target->fresh();
        $this->assertFalse($target->isSuspended());
        $this->assertNotNull($target->reinstated_at);

        // The two earlier reports no longer count: one new report is not enough...
        $this->travel(1)->minutes();
        $this->fileReport(User::factory()->create(), $target);
        $this->assertFalse($target->fresh()->isSuspended());
        $this->assertSame(1, ReportModeration::qualifyingReporterCount($target->fresh()));

        // ...but two new, independent ones are.
        $this->travel(1)->minutes();
        $this->fileReport(User::factory()->create(), $target);
        $this->assertTrue($target->fresh()->isAutoSuspended());
    }

    public function test_the_audit_trail_records_what_the_algorithm_did(): void
    {
        $target = User::factory()->create();

        $this->fileReport(User::factory()->create(), $target);
        $this->fileReport(User::factory()->create(), $target);

        $this->assertSame(2, ReportEvent::query()->where('event', 'filed')->count());
        $this->assertSame(2, ReportEvent::query()->where('event', 'auto_suspended')->count());

        $this->actingAs($this->makeAdmin())->get('/admin/reports?status=all')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Reports')
                ->where('autoSuspend.threshold', 2)
                ->where('reports.data.0.qualifying_reports', 2)
                ->where('reports.data.0.reported_user.suspension_type', 'auto')
                ->where('reports.data.0.reporter_standing.filed', 1));
    }
}
