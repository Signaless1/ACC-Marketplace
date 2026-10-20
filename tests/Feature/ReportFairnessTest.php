<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Conversation;
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

class ReportFairnessTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');

        config([
            'marketplace.reports.auto_suspend_threshold' => 2,
            'marketplace.reports.min_reporter_age_hours' => 0,
            'marketplace.reports.daily_limit' => 50,
            'marketplace.reports.refile_cooldown_days' => 7,
            'marketplace.reports.strike_limit' => 3,
            'marketplace.reports.strike_window_days' => 90,
        ]);
    }

    /** @return array{0: User, 1: User, 2: \App\Models\Listing, 3: \App\Models\Order} */
    private function transaction(string $status = 'confirmed'): array
    {
        $seller = User::factory()->create(['name' => 'Sam Seller']);
        $buyer = User::factory()->create(['name' => 'Bea Buyer']);
        $listing = $this->makeListing($seller);
        $order = $this->makeOrder($listing, $buyer, $status);

        return [$seller, $buyer, $listing, $order];
    }

    private function reportOrder(User $by, $order, array $data = [])
    {
        return $this->actingAs($by)->post("/orders/{$order->id}/report", array_merge([
            'reason' => 'no_show',
            'description' => 'We agreed to meet at the library but nobody showed up.',
        ], $data));
    }

    // ---------------------------------------------------------------
    // Fair to both sides: reasons that fit the person filing
    // ---------------------------------------------------------------

    public function test_each_side_is_offered_reasons_that_fit_their_role(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();

        $this->actingAs($buyer)->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->where('viewerRole', 'buyer')
                ->has('reasons.item_not_received')
                ->has('reasons.not_as_described')
                ->missing('reasons.order_abuse'));

        $this->actingAs($seller)->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->where('viewerRole', 'seller')
                ->has('reasons.order_abuse')
                ->has('reasons.payment_issue')
                ->missing('reasons.item_not_received')
                ->missing('reasons.not_as_described'));
    }

    public function test_the_server_enforces_the_reasons_for_each_role(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();

        // Only a buyer can say an item never arrived or was not as described.
        $this->reportOrder($seller, $order, ['reason' => 'item_not_received'])->assertSessionHasErrors('reason');
        $this->reportOrder($seller, $order, ['reason' => 'not_as_described'])->assertSessionHasErrors('reason');

        // Only a seller can say the order itself was fake or abusive.
        $this->reportOrder($buyer, $order, ['reason' => 'order_abuse'])->assertSessionHasErrors('reason');

        $this->assertDatabaseCount('reports', 0);

        // Each can file the reasons that are theirs.
        $this->reportOrder($seller, $order, ['reason' => 'order_abuse'])->assertSessionHas('success');
        $this->reportOrder($buyer, $order, ['reason' => 'not_as_described'])->assertSessionHas('success');

        $this->assertSame(
            ['seller', 'buyer'],
            Report::query()->orderBy('id')->pluck('reporter_role')->all()
        );
    }

    public function test_item_not_received_needs_an_order_the_seller_has_confirmed(): void
    {
        [, $buyer, , $order] = $this->transaction('pending');

        $this->reportOrder($buyer, $order, ['reason' => 'item_not_received'])->assertSessionHas('error');
        $this->assertDatabaseCount('reports', 0);

        $order->update(['status' => 'confirmed']);

        $this->reportOrder($buyer, $order, ['reason' => 'item_not_received'])->assertSessionHas('success');
        $this->assertDatabaseCount('reports', 1);
    }

    // ---------------------------------------------------------------
    // The reported person has a say
    // ---------------------------------------------------------------

    public function test_the_reported_person_sees_the_report_and_can_answer_it_once(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();

        $this->reportOrder($buyer, $order)->assertSessionHas('success');

        $this->actingAs($seller)->get('/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Index')
                ->has('filed', 0)
                ->has('against', 1)
                ->where('against.0.can_respond', true)
                ->where('against.0.reporter', 'Bea Buyer') // in a transaction both know each other
                ->where('against.0.description', 'We agreed to meet at the library but nobody showed up.'));

        $report = Report::firstOrFail();

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", [
            'statement' => 'I was there at 3pm with the item. I have a photo of the place and the time.',
        ])->assertSessionHas('success');

        $report->refresh();
        $this->assertSame('I was there at 3pm with the item. I have a photo of the place and the time.', $report->respondent_statement);
        $this->assertNotNull($report->responded_at);

        // One statement, so what an admin reads is what existed at decision time.
        $this->actingAs($seller)->post("/reports/{$report->id}/respond", [
            'statement' => 'Actually, let me rewrite my whole answer after seeing more.',
        ])->assertSessionHas('error');

        $this->assertStringStartsWith('I was there at 3pm', $report->fresh()->respondent_statement);

        // The reporter can see that the other side answered.
        $this->actingAs($buyer)->get('/reports')
            ->assertInertia(fn (Assert $page) => $page
                ->has('filed', 1)
                ->where('filed.0.other_responded', true));
    }

    public function test_the_reporter_of_a_listing_or_profile_report_stays_anonymous(): void
    {
        $seller = User::factory()->create();
        $reporter = User::factory()->create(['name' => 'Anonymous Annie']);
        $listing = $this->makeListing($seller);

        $this->actingAs($reporter)->post("/listings/{$listing->id}/report", [
            'reason' => 'misleading',
            'description' => 'The photos do not match the item that was described.',
        ])->assertSessionHas('success');

        $this->actingAs($seller)->get('/reports')
            ->assertDontSee('Anonymous Annie')
            ->assertInertia(fn (Assert $page) => $page
                ->where('against.0.reporter', null)
                ->where('against.0.can_respond', true));
    }

    public function test_only_the_reported_person_can_answer(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();
        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $payload = ['statement' => 'This is a long enough statement from the wrong person.'];

        $this->actingAs($buyer)->post("/reports/{$report->id}/respond", $payload)->assertForbidden();
        $this->actingAs(User::factory()->create())->post("/reports/{$report->id}/respond", $payload)->assertForbidden();

        $this->assertNull($report->fresh()->respondent_statement);

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", $payload)->assertSessionHas('success');
    }

    public function test_an_answer_needs_detail_and_cannot_be_added_after_a_decision(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();
        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", ['statement' => 'no'])
            ->assertSessionHasErrors('statement');
        $this->actingAs($seller)->post("/reports/{$report->id}/respond", ['statement' => str_repeat('a', 2001)])
            ->assertSessionHasErrors('statement');

        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", ['status' => 'dismissed']);

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", [
            'statement' => 'This answer comes after the decision was already made.',
        ])->assertSessionHas('error');

        $this->assertNull($report->fresh()->respondent_statement);
    }

    // ---------------------------------------------------------------
    // Evidence is private
    // ---------------------------------------------------------------

    public function test_evidence_is_private_to_whoever_uploaded_it_and_admins(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();

        $this->reportOrder($buyer, $order, [
            'attachments' => [UploadedFile::fake()->create('chat-screenshot.png', 150, 'image/png')],
        ])->assertSessionHasNoErrors();

        $report = Report::firstOrFail();
        $reporterFile = $report->attachments()->firstOrFail();

        // Stored privately, never on the public disk.
        $this->assertSame('local', $reporterFile->disk);
        Storage::disk('local')->assertExists($reporterFile->path);
        Storage::disk('public')->assertMissing($reporterFile->path);

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", [
            'statement' => 'Here is the photo that proves I was at the meeting place.',
            'attachments' => [UploadedFile::fake()->create('meeting-place.jpg', 150, 'image/jpeg')],
        ])->assertSessionHasNoErrors();

        $respondentFile = $report->attachments()->where('user_id', $seller->id)->firstOrFail();

        // Uploaders open their own files; admins open everything.
        $this->actingAs($buyer)->get("/attachments/{$reporterFile->id}")->assertOk();
        $this->actingAs($seller)->get("/attachments/{$respondentFile->id}")->assertOk();
        $this->actingAs($this->makeAdmin())->get("/attachments/{$reporterFile->id}")->assertOk();
        $this->actingAs($this->makeAdmin())->get("/attachments/{$respondentFile->id}")->assertOk();

        // Nobody else can: not the other side, not a stranger.
        $this->actingAs($seller)->get("/attachments/{$reporterFile->id}")->assertForbidden();
        $this->actingAs($buyer)->get("/attachments/{$respondentFile->id}")->assertForbidden();
        $this->actingAs(User::factory()->create())->get("/attachments/{$reporterFile->id}")->assertForbidden();

        auth()->logout();
        $this->get("/attachments/{$reporterFile->id}")->assertRedirect('/login');
    }

    public function test_evidence_files_are_validated(): void
    {
        [, $buyer, , $order] = $this->transaction();

        $this->reportOrder($buyer, $order, [
            'attachments' => [UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload')],
        ])->assertSessionHasErrors('attachments.0');

        $tooMany = array_map(
            fn ($i) => UploadedFile::fake()->create("photo{$i}.jpg", 10, 'image/jpeg'),
            range(1, 6)
        );

        $this->reportOrder($buyer, $order, ['attachments' => $tooMany])->assertSessionHasErrors('attachments');

        $this->assertDatabaseCount('reports', 0);
        $this->assertSame(0, Attachment::query()->count());
    }

    // ---------------------------------------------------------------
    // The outcome is explained to both people; the admin's notes stay private
    // ---------------------------------------------------------------

    public function test_the_decision_is_explained_to_both_sides_but_the_admin_note_stays_private(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();
        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved',
            'admin_note' => 'INTERNAL: seller has two earlier warnings on file.',
            'decision_note' => 'The chat shows the seller cancelled the meeting twice without notice.',
        ])->assertSessionHas('success');

        foreach ([[$buyer, 'filed'], [$seller, 'against']] as [$person, $list]) {
            $this->actingAs($person)->get('/reports')
                ->assertDontSee('INTERNAL', false)
                ->assertInertia(fn (Assert $page) => $page
                    ->where("{$list}.0.outcome", 'Upheld')
                    ->where("{$list}.0.decision_note", 'The chat shows the seller cancelled the meeting twice without notice.'));

            // The compiled transaction shows the same explanation, never the admin's private note.
            $this->actingAs($person)->get("/orders/{$order->id}/report")
                ->assertDontSee('INTERNAL', false)
                ->assertInertia(fn (Assert $page) => $page
                    ->where('summary.reports.0.decision_note', 'The chat shows the seller cancelled the meeting twice without notice.')
                    ->where('summary.reports.0.admin_note', null));
        }

        $this->actingAs($this->makeAdmin())->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.reports.0.admin_note', 'INTERNAL: seller has two earlier warnings on file.'));
    }

    public function test_a_decision_note_is_not_shown_while_the_report_is_still_open(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();
        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", [
            'status' => 'reviewing',
            'decision_note' => 'A draft explanation that is not final yet.',
        ]);

        $this->actingAs($seller)->get('/reports')
            ->assertInertia(fn (Assert $page) => $page
                ->where('against.0.status', 'reviewing')
                ->where('against.0.decision_note', null)
                ->where('against.0.outcome', null));
    }

    // ---------------------------------------------------------------
    // False reports cost the person who files them
    // ---------------------------------------------------------------

    public function test_a_report_dismissed_as_false_is_recorded_and_labelled(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();
        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", [
            'status' => 'dismissed',
            'bad_faith' => true,
            'decision_note' => 'The seller\'s photos prove they were at the meeting place.',
        ])->assertSessionHas('success');

        $this->assertTrue($report->fresh()->bad_faith);
        $this->assertTrue(
            ReportEvent::query()->where('report_id', $report->id)->where('note', 'Marked as a false report.')->exists()
        );

        // The reporter is told plainly. The reported person just hears it was not upheld.
        $this->actingAs($buyer)->get('/reports')
            ->assertInertia(fn (Assert $page) => $page->where('filed.0.outcome', 'Dismissed as a false report'));
        $this->actingAs($seller)->get('/reports')
            ->assertInertia(fn (Assert $page) => $page->where('against.0.outcome', 'Not upheld'));
    }

    public function test_the_false_report_flag_only_applies_to_dismissals(): void
    {
        [, $buyer, , $order] = $this->transaction();
        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved',
            'bad_faith' => true,
        ]);

        $this->assertFalse($report->fresh()->bad_faith);
    }

    public function test_repeated_false_reports_pause_the_ability_to_report(): void
    {
        $abuser = User::factory()->create();

        foreach (range(1, 3) as $i) {
            $target = User::factory()->create();
            $report = new Report();
            $report->forceFill([
                'reporter_id' => $abuser->id,
                'reported_user_id' => $target->id,
                'reason' => 'scam',
                'description' => 'Completely invented accusation number '.$i.'.',
                'status' => 'dismissed',
                'bad_faith' => true,
                'reviewed_at' => now()->subDays(10),
            ])->save();
        }

        $this->assertNotNull(ReportModeration::blockedFromReporting($abuser));

        $victim = User::factory()->create();

        $this->actingAs($abuser)->post("/users/{$victim->id}/report", [
            'reason' => 'scam',
            'description' => 'Yet another invented accusation, this one about a new person.',
        ])->assertSessionHas('error', fn ($message) => str_contains($message, 'paused'));

        $this->assertSame(3, Report::query()->count(), 'No new report was created.');

        // The pause is not forever: strikes expire.
        $this->travel(100)->days();
        $this->assertNull(ReportModeration::blockedFromReporting($abuser));
    }

    public function test_two_false_reports_are_not_yet_enough_to_pause_reporting(): void
    {
        $reporter = User::factory()->create();

        foreach (range(1, 2) as $i) {
            $report = new Report();
            $report->forceFill([
                'reporter_id' => $reporter->id,
                'reported_user_id' => User::factory()->create()->id,
                'reason' => 'scam',
                'description' => 'A mistaken report, number '.$i.', filed in good faith.',
                'status' => 'dismissed',
                'bad_faith' => true,
                'reviewed_at' => now()->subDay(),
            ])->save();
        }

        $this->assertNull(ReportModeration::blockedFromReporting($reporter));
    }

    public function test_there_is_a_daily_limit_on_reports(): void
    {
        config(['marketplace.reports.daily_limit' => 2]);

        $reporter = User::factory()->create();

        foreach (range(1, 2) as $i) {
            $this->actingAs($reporter)->post('/users/'.User::factory()->create()->id.'/report', [
                'reason' => 'spam',
                'description' => 'This person keeps sending me unwanted messages.',
            ])->assertSessionHas('success');
        }

        $this->actingAs($reporter)->post('/users/'.User::factory()->create()->id.'/report', [
            'reason' => 'spam',
            'description' => 'This person keeps sending me unwanted messages.',
        ])->assertSessionHas('error', fn ($message) => str_contains($message, 'limit'));

        $this->assertSame(2, Report::query()->count());

        // Tomorrow is a new day.
        $this->travel(25)->hours();
        $this->actingAs($reporter)->post('/users/'.User::factory()->create()->id.'/report', [
            'reason' => 'spam',
            'description' => 'This person keeps sending me unwanted messages.',
        ])->assertSessionHas('success');
    }

    public function test_a_dismissed_complaint_cannot_be_resubmitted_straight_away(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);
        $reporter = User::factory()->create();
        $admin = $this->makeAdmin();

        $payload = ['reason' => 'scam', 'description' => 'The price is too good to be true, I think it is a scam.'];

        $this->actingAs($reporter)->post("/listings/{$listing->id}/report", $payload)->assertSessionHas('success');
        $report = Report::firstOrFail();

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", ['status' => 'dismissed']);

        // Straight away: no.
        $this->actingAs($reporter)->post("/listings/{$listing->id}/report", $payload)
            ->assertSessionHas('error', fn ($message) => str_contains($message, 'did not uphold'));
        $this->assertSame(1, Report::query()->count());

        // After the cooldown, yes.
        $this->travel(8)->days();
        $this->actingAs($reporter)->post("/listings/{$listing->id}/report", $payload)->assertSessionHas('success');
        $this->assertSame(2, Report::query()->count());
    }

    public function test_details_on_listing_and_user_reports_stay_optional_but_must_be_meaningful_when_given(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs(User::factory()->create())->post("/listings/{$listing->id}/report", [
            'reason' => 'spam',
            'description' => 'too short',
        ])->assertSessionHasErrors('description');

        $this->actingAs(User::factory()->create())->post("/listings/{$listing->id}/report", ['reason' => 'spam'])
            ->assertSessionHas('success');
    }

    // ---------------------------------------------------------------
    // The admin's case file
    // ---------------------------------------------------------------

    public function test_the_case_file_gives_admins_the_whole_story_including_deleted_messages(): void
    {
        [$seller, $buyer, $listing, $order] = $this->transaction();

        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = Conversation::firstOrFail();

        $conversation->messages()->create(['sender_id' => $seller->id, 'body' => 'Pay me first or no deal']);
        $conversation->messages()->create(['sender_id' => $buyer->id, 'body' => 'Okay, where do we meet?']);
        $deleted = $conversation->messages()->oldest('id')->first();
        $deleted->forceFill(['deleted_for_everyone_at' => now()])->save();

        $this->reportOrder($buyer, $order, [
            'reason' => 'fraud',
            'description' => 'They demanded I pay before showing me the item.',
            'attachments' => [UploadedFile::fake()->create('proof.png', 80, 'image/png')],
        ]);
        $report = Report::firstOrFail();

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", [
            'statement' => 'I only asked for a small deposit, which is normal for reservations.',
        ]);

        $admin = $this->makeAdmin();

        $this->actingAs($admin)->getJson("/admin/reports/{$report->id}/case")
            ->assertOk()
            ->assertJsonCount(2, 'messages')
            // The message the seller deleted is still readable by the admin, and flagged.
            ->assertJsonPath('messages.0.body', 'Pay me first or no deal')
            ->assertJsonPath('messages.0.deleted_for_everyone_at', fn ($value) => $value !== null)
            ->assertJsonPath('messages.1.deleted_for_everyone_at', null)
            ->assertJsonPath('evidence.0.by', 'reporter')
            ->assertJsonPath('history.qualifying_reporters', 1)
            ->assertJsonCount(2, 'events'); // filed, responded

        // Ordinary members and guests cannot open it.
        $this->actingAs($buyer)->getJson("/admin/reports/{$report->id}/case")->assertForbidden();

        auth()->logout();
        $this->getJson("/admin/reports/{$report->id}/case")->assertUnauthorized();
    }

    public function test_every_step_of_a_report_is_recorded(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();

        $this->reportOrder($buyer, $order);
        $report = Report::firstOrFail();

        $this->actingAs($seller)->post("/reports/{$report->id}/respond", [
            'statement' => 'I was at the meeting place the whole afternoon, waiting.',
        ]);

        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", ['status' => 'reviewing']);
        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", ['status' => 'dismissed']);
        $this->actingAs($this->makeAdmin())->patch("/admin/reports/{$report->id}", ['status' => 'reviewing']);

        $this->assertSame(
            ['filed', 'responded', 'reviewing', 'dismissed', 'reopened'],
            ReportEvent::query()->where('report_id', $report->id)->orderBy('id')->pluck('event')->all()
        );
    }

    // ---------------------------------------------------------------
    // Privacy of the compiled document
    // ---------------------------------------------------------------

    public function test_the_transaction_document_hides_the_other_partys_email(): void
    {
        [$seller, $buyer, , $order] = $this->transaction();

        $this->actingAs($buyer)->get("/orders/{$order->id}/report")
            ->assertDontSee($seller->email, false)
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.buyer.email', $buyer->email)
                ->where('summary.seller.email', null));

        $this->actingAs($this->makeAdmin())->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.buyer.email', $buyer->email)
                ->where('summary.seller.email', $seller->email));
    }

    public function test_a_page_for_reports_renders_for_a_member_with_none(): void
    {
        $this->actingAs(User::factory()->create())->get('/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Index')
                ->has('filed', 0)
                ->has('against', 0));
    }
}
