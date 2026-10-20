<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\SuspensionAppeal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AppealTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function suspended(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'suspended_at' => now(),
            'suspension_type' => 'auto',
            'suspension_reason' => 'Automatically suspended: 2 different people reported this account. An administrator is reviewing the reports.',
        ], $overrides));
    }

    private function appeal(User $user, array $data = [])
    {
        return $this->post('/appeal', array_merge([
            'email' => $user->email,
            'password' => 'password',
            'message' => 'Those reports come from a dispute over a refund. I can show the whole chat.',
        ], $data));
    }

    /** The message a suspended person sees when they try to log in. */
    private function loginMessage(User $user): string
    {
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');

        return (string) session('errors')->first('email');
    }

    // ---------------------------------------------------------------
    // Filing an appeal
    // ---------------------------------------------------------------

    public function test_the_appeal_page_is_for_people_who_are_logged_out(): void
    {
        $this->get('/appeal')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Appeal'));

        $this->actingAs(User::factory()->create())->get('/appeal')->assertRedirect('/dashboard');
    }

    public function test_a_suspended_person_can_appeal_with_their_own_password(): void
    {
        $user = $this->suspended();

        $this->appeal($user)
            ->assertRedirect('/login')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('suspension_appeals', ['user_id' => $user->id, 'status' => 'pending']);
        $this->assertGuest();
    }

    public function test_the_appeal_also_answers_open_reports_that_have_no_answer_yet(): void
    {
        $reporter = User::factory()->create();
        $user = $this->suspended();

        $make = fn (array $extra) => Report::create(array_merge([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $user->id,
            'reason' => 'scam',
            'description' => 'They asked me to pay before showing the item.',
        ], $extra));

        $unanswered = $make([]);
        $answered = $make(['respondent_statement' => 'I already answered this one.', 'responded_at' => now()]);
        $closed = $make(['status' => 'dismissed']);

        $this->appeal($user, ['message' => 'This is my full account of what happened with the buyers.'])
            ->assertSessionHas('success');

        $this->assertSame('This is my full account of what happened with the buyers.', $unanswered->fresh()->respondent_statement);
        $this->assertSame('I already answered this one.', $answered->fresh()->respondent_statement);
        $this->assertNull($closed->fresh()->respondent_statement);

        $this->assertTrue(
            ReportEvent::query()->where('report_id', $unanswered->id)->where('event', 'responded')->exists()
        );
    }

    public function test_the_wrong_password_an_unknown_email_or_an_active_account_cannot_appeal(): void
    {
        $user = $this->suspended();
        $active = User::factory()->create();

        $this->appeal($user, ['password' => 'not-the-password'])
            ->assertSessionHasErrors(['email' => 'These credentials do not match our records.']);

        $this->appeal($user, ['email' => 'nobody@example.com'])
            ->assertSessionHasErrors(['email' => 'These credentials do not match our records.']);

        // Right password, but nothing to appeal.
        $this->appeal($active)->assertSessionHasErrors('email');

        $this->assertDatabaseCount('suspension_appeals', 0);
    }

    public function test_an_appeal_needs_a_real_explanation(): void
    {
        $user = $this->suspended();

        $this->appeal($user, ['message' => 'please'])->assertSessionHasErrors('message');
        $this->appeal($user, ['message' => str_repeat('a', 1501)])->assertSessionHasErrors('message');

        $this->assertDatabaseCount('suspension_appeals', 0);
    }

    public function test_only_one_appeal_waits_at_a_time_and_a_refusal_has_a_cooldown(): void
    {
        $user = $this->suspended();
        $admin = $this->makeAdmin();

        $this->appeal($user)->assertSessionHas('success');

        $this->appeal($user)->assertSessionHasErrors('message');
        $this->assertDatabaseCount('suspension_appeals', 1);

        $appeal = SuspensionAppeal::firstOrFail();

        $this->actingAs($admin)->post("/admin/appeals/{$appeal->id}", [
            'decision' => 'deny',
            'note' => 'The reports are backed by messages we have reviewed.',
        ])->assertSessionHas('success');
        auth()->logout();

        // Straight after a refusal: wait.
        $this->appeal($user)->assertSessionHasErrors('message');
        $this->assertDatabaseCount('suspension_appeals', 1);

        // After the cooldown, a new appeal is welcome.
        $this->travel(8)->days();
        $this->appeal($user)->assertSessionHas('success');
        $this->assertDatabaseCount('suspension_appeals', 2);
    }

    // ---------------------------------------------------------------
    // The admin's decision
    // ---------------------------------------------------------------

    public function test_accepting_an_appeal_reinstates_the_person(): void
    {
        $user = $this->suspended();
        $admin = $this->makeAdmin();

        $this->appeal($user);
        $appeal = SuspensionAppeal::firstOrFail();

        $this->actingAs($admin)->post("/admin/appeals/{$appeal->id}", ['decision' => 'accept'])
            ->assertSessionHas('success');

        $user = $user->fresh();
        $this->assertFalse($user->isSuspended());
        $this->assertNull($user->suspension_type);
        $this->assertNotNull($user->reinstated_at);

        $appeal = $appeal->fresh();
        $this->assertSame('accepted', $appeal->status);
        $this->assertSame($admin->id, $appeal->decided_by);
        $this->assertNotNull($appeal->decided_at);

        auth()->logout();
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
    }

    public function test_refusing_an_appeal_needs_a_reason_the_person_can_read(): void
    {
        $user = $this->suspended();
        $admin = $this->makeAdmin();

        $this->appeal($user);
        $appeal = SuspensionAppeal::firstOrFail();

        $this->actingAs($admin)->post("/admin/appeals/{$appeal->id}", ['decision' => 'deny'])
            ->assertSessionHasErrors('note');
        $this->assertSame('pending', $appeal->fresh()->status);

        $this->actingAs($admin)->post("/admin/appeals/{$appeal->id}", [
            'decision' => 'deny',
            'note' => 'Two buyers sent matching screenshots of the same request.',
        ])->assertSessionHas('success');

        $this->assertTrue($user->fresh()->isSuspended());

        auth()->logout();
        $message = $this->loginMessage($user);

        $this->assertStringContainsString('suspended', $message);
        $this->assertStringContainsString('Two buyers sent matching screenshots of the same request', $message);
    }

    public function test_an_appeal_can_only_be_decided_once(): void
    {
        $user = $this->suspended();
        $admin = $this->makeAdmin();

        $this->appeal($user);
        $appeal = SuspensionAppeal::firstOrFail();

        $this->actingAs($admin)->post("/admin/appeals/{$appeal->id}", ['decision' => 'accept']);

        $this->actingAs($admin)->post("/admin/appeals/{$appeal->id}", [
            'decision' => 'deny',
            'note' => 'Changed my mind.',
        ])->assertSessionHas('error');

        $this->assertSame('accepted', $appeal->fresh()->status);
    }

    public function test_only_admins_can_decide_appeals(): void
    {
        $user = $this->suspended();
        $this->appeal($user);
        $appeal = SuspensionAppeal::firstOrFail();

        $this->actingAs(User::factory()->create())->post("/admin/appeals/{$appeal->id}", ['decision' => 'accept'])
            ->assertForbidden();

        auth()->logout();
        $this->post("/admin/appeals/{$appeal->id}", ['decision' => 'accept'])->assertRedirect('/login');

        $this->assertTrue($user->fresh()->isSuspended());
        $this->assertSame('pending', $appeal->fresh()->status);
    }

    // ---------------------------------------------------------------
    // What people see
    // ---------------------------------------------------------------

    public function test_the_login_message_says_where_the_appeal_stands(): void
    {
        $user = $this->suspended();

        $this->assertStringContainsString('You can appeal this decision', $this->loginMessage($user));

        $this->appeal($user);

        $this->assertStringContainsString('waiting for review', $this->loginMessage($user));
    }

    public function test_pending_appeals_reach_the_admins_attention(): void
    {
        $admin = $this->makeAdmin();
        $user = $this->suspended(['name' => 'Pat Appellant']);

        $this->actingAs($admin)->getJson('/live')->assertJsonPath('pendingReportCount', 0);

        auth()->logout();
        $this->appeal($user);

        $this->actingAs($admin)->getJson('/live')->assertJsonPath('pendingReportCount', 1);

        $this->actingAs($admin)->get('/admin/reports')
            ->assertInertia(fn (Assert $page) => $page
                ->has('appeals', 1)
                ->where('appeals.0.user.name', 'Pat Appellant')
                ->where('appeals.0.status', 'pending'));
    }

    // ---------------------------------------------------------------
    // Not a way to guess passwords
    // ---------------------------------------------------------------

    public function test_the_appeal_form_shares_the_login_form_s_attempt_limit(): void
    {
        $user = $this->suspended();

        foreach (range(1, 5) as $attempt) {
            $this->appeal($user, ['password' => "wrong-guess-{$attempt}"])->assertSessionHasErrors('email');
        }

        // The sixth attempt is locked out, even with the right password...
        $this->appeal($user)->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many attempts', (string) session('errors')->first('email'));
        $this->assertDatabaseCount('suspension_appeals', 0);

        // ...and so is the login form, because both count against one limit.
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many login attempts', (string) session('errors')->first('email'));
    }
}
