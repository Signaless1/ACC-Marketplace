<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use App\Support\MessagePurger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class MessageDeletionTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
    }

    /** @return array{0: User, 1: User, 2: Conversation, 3: \App\Models\Listing} */
    private function chat(): array
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);
        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");

        return [$seller, $buyer, Conversation::firstOrFail(), $listing];
    }

    private function say(Conversation $conversation, User $sender, string $body): Message
    {
        return $conversation->messages()->create(['sender_id' => $sender->id, 'body' => $body]);
    }

    private function sendPhoto(Conversation $conversation, User $sender): Message
    {
        $this->actingAs($sender)->post("/messages/{$conversation->id}", [
            'body' => 'Look at this',
            'attachments' => [UploadedFile::fake()->create('photo.jpg', 200, 'image/jpeg')],
        ])->assertSessionHasNoErrors();

        return $conversation->messages()->latest('id')->firstOrFail();
    }

    private function deleteMessage(User $user, Conversation $conversation, Message $message, ?string $scope)
    {
        return $this->actingAs($user)->delete(
            "/messages/{$conversation->id}/{$message->id}",
            $scope === null ? [] : ['scope' => $scope]
        );
    }

    // ---------------------------------------------------------------
    // Delete for me
    // ---------------------------------------------------------------

    public function test_deleting_for_me_removes_it_from_my_view_only(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Hello there');

        $this->deleteMessage($buyer, $conversation, $message, 'me')->assertSessionHas('success');

        $this->actingAs($buyer)->get("/messages/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page->has('conversation.messages', 0));

        $this->actingAs($seller)->get("/messages/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->has('conversation.messages', 1)
                ->where('conversation.messages.0.body', 'Hello there')
                ->where('conversation.messages.0.deleted', false));

        // Nothing was destroyed.
        $this->assertSame('Hello there', $message->fresh()->body);
        $this->assertNull($message->fresh()->deleted_for_everyone_at);
    }

    public function test_deleting_for_me_twice_is_harmless(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Hello there');

        $this->deleteMessage($buyer, $conversation, $message, 'me')->assertSessionHas('success');
        $this->deleteMessage($buyer, $conversation, $message, 'me')->assertSessionHas('success');

        $this->assertDatabaseCount('message_deletions', 1);
    }

    public function test_a_photo_deleted_for_me_stays_available_to_the_other_person(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->sendPhoto($conversation, $buyer);
        $attachment = $message->attachments()->firstOrFail();

        $this->deleteMessage($buyer, $conversation, $message, 'me');

        $this->actingAs($buyer)->get("/attachments/{$attachment->id}")->assertNotFound();
        $this->actingAs($seller)->get("/attachments/{$attachment->id}")->assertOk();
    }

    // ---------------------------------------------------------------
    // Delete for everyone
    // ---------------------------------------------------------------

    public function test_deleting_for_everyone_leaves_a_placeholder_for_both_people(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Send the money first');

        $this->deleteMessage($buyer, $conversation, $message, 'everyone')->assertSessionHas('success');

        foreach ([$buyer, $seller] as $viewer) {
            $this->actingAs($viewer)->get("/messages/{$conversation->id}")
                ->assertOk()
                ->assertDontSee('Send the money first')
                ->assertInertia(fn (Assert $page) => $page
                    ->has('conversation.messages', 1)
                    ->where('conversation.messages.0.deleted', true)
                    ->where('conversation.messages.0.body', null)
                    ->where('conversation.messages.0.attachments', []));
        }

        // The words are kept for admins (see the purge tests), not thrown away.
        $this->assertSame('Send the money first', $message->fresh()->body);
        $this->assertNotNull($message->fresh()->deleted_for_everyone_at);
    }

    public function test_photos_and_videos_are_deleted_together_with_the_message(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->sendPhoto($conversation, $buyer);
        $attachment = $message->attachments()->firstOrFail();

        $this->actingAs($seller)->get("/attachments/{$attachment->id}")->assertOk();

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');

        // Even somebody who still has the file's address cannot open it any more...
        $this->actingAs($seller)->get("/attachments/{$attachment->id}")->assertNotFound();
        $this->actingAs($buyer)->get("/attachments/{$attachment->id}")->assertNotFound();

        // ...but an admin reviewing a dispute still can.
        $this->actingAs($this->makeAdmin())->get("/attachments/{$attachment->id}")->assertOk();
    }

    public function test_deleting_a_video_for_everyone_works_the_same_way(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'attachments' => [UploadedFile::fake()->create('clip.mp4', 3000, 'video/mp4')],
        ])->assertSessionHasNoErrors();

        $message = $conversation->messages()->latest('id')->firstOrFail();
        $attachment = $message->attachments()->firstOrFail();
        $this->assertSame('video', $attachment->kind);

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');

        $this->actingAs($seller)->get("/attachments/{$attachment->id}")->assertNotFound();
        $this->actingAs($seller)->get("/messages/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page->where('conversation.messages.0.attachments', []));
    }

    public function test_deleting_for_everyone_twice_keeps_the_first_timestamp(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Hello there');

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');
        $first = $message->fresh()->deleted_for_everyone_at;

        $this->travel(10)->minutes();
        $this->deleteMessage($buyer, $conversation, $message, 'everyone')->assertSessionHas('success');

        $this->assertEquals($first, $message->fresh()->deleted_for_everyone_at);
    }

    // ---------------------------------------------------------------
    // Who may delete what
    // ---------------------------------------------------------------

    public function test_you_can_only_delete_messages_you_sent(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $theirs = $this->say($conversation, $buyer, 'From the buyer');
        $stranger = User::factory()->create();

        // The seller cannot remove the buyer's message, for themselves or anyone.
        $this->deleteMessage($seller, $conversation, $theirs, 'me')->assertForbidden();
        $this->deleteMessage($seller, $conversation, $theirs, 'everyone')->assertForbidden();

        // Someone outside the conversation cannot touch it at all.
        $this->deleteMessage($stranger, $conversation, $theirs, 'everyone')->assertForbidden();

        $this->assertNull($theirs->fresh()->deleted_for_everyone_at);
        $this->assertDatabaseCount('message_deletions', 0);
    }

    public function test_a_message_must_belong_to_the_conversation_in_the_address(): void
    {
        [, $buyer, $conversation, $listing] = $this->chat();
        $otherSeller = User::factory()->create();
        $otherListing = $this->makeListing($otherSeller, ['title' => 'Another thing']);
        $this->actingAs($buyer)->post("/listings/{$otherListing->id}/message");
        $otherConversation = Conversation::query()->where('listing_id', $otherListing->id)->firstOrFail();

        $mine = $this->say($conversation, $buyer, 'In the first chat');

        // Same person, wrong conversation in the URL.
        $this->deleteMessage($buyer, $otherConversation, $mine, 'everyone')->assertNotFound();

        $this->assertNull($mine->fresh()->deleted_for_everyone_at);
    }

    public function test_guests_cannot_delete_messages(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Hello there');

        auth()->logout();

        $this->delete("/messages/{$conversation->id}/{$message->id}", ['scope' => 'everyone'])
            ->assertRedirect('/login');

        $this->assertNull($message->fresh()->deleted_for_everyone_at);
    }

    public function test_the_scope_can_travel_in_the_address_the_way_the_app_sends_it(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Hello there');

        $this->actingAs($buyer)
            ->delete("/messages/{$conversation->id}/{$message->id}?scope=everyone")
            ->assertSessionHas('success')
            ->assertSessionHasNoErrors();

        $this->assertNotNull($message->fresh()->deleted_for_everyone_at);
    }

    public function test_the_scope_must_be_me_or_everyone(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Hello there');

        $this->deleteMessage($buyer, $conversation, $message, null)->assertSessionHasErrors('scope');
        $this->deleteMessage($buyer, $conversation, $message, 'banana')->assertSessionHasErrors('scope');

        $this->assertNull($message->fresh()->deleted_for_everyone_at);
        $this->assertDatabaseCount('message_deletions', 0);
    }

    // ---------------------------------------------------------------
    // Everywhere else that shows messages
    // ---------------------------------------------------------------

    public function test_unread_counts_and_previews_ignore_deleted_messages(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Is this still available?');

        $this->actingAs($seller)->get('/messages')
            ->assertInertia(fn (Assert $page) => $page
                ->where('conversations.0.unread_messages_count', 1)
                ->where('conversations.0.latest_message.body', 'Is this still available?'));

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');

        // No longer unread news, and the list stops showing the words.
        $this->actingAs($seller)->get('/messages')
            ->assertDontSee('Is this still available?')
            ->assertInertia(fn (Assert $page) => $page
                ->where('conversations.0.unread_messages_count', 0)
                ->where('conversations.0.latest_message.deleted', true)
                ->where('conversations.0.latest_message.body', null));

        $this->actingAs($seller)->getJson('/live')
            ->assertOk()
            ->assertJsonPath('unreadMessageCount', 0);
    }

    public function test_the_preview_falls_back_to_the_newest_message_i_have_not_deleted(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $this->say($conversation, $buyer, 'First message');
        $second = $this->say($conversation, $buyer, 'Second message');

        $this->deleteMessage($buyer, $conversation, $second, 'me');

        $this->actingAs($buyer)->get('/messages')
            ->assertInertia(fn (Assert $page) => $page
                ->where('conversations.0.latest_message.body', 'First message'));
    }

    public function test_the_dashboard_preview_shows_a_placeholder_for_a_deleted_message(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'My secret words');

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');

        $this->actingAs($seller)->get('/dashboard')
            ->assertDontSee('My secret words')
            ->assertInertia(fn (Assert $page) => $page->where(
                'recentConversations',
                fn ($rows) => collect($rows)->contains(fn ($row) => $row['preview'] === 'This message was deleted')
            ));
    }

    // ---------------------------------------------------------------
    // The transaction document (what both people and admins can read)
    // ---------------------------------------------------------------

    public function test_the_transaction_report_respects_deletions_but_admins_still_see_everything(): void
    {
        [$seller, $buyer, $conversation, $listing] = $this->chat();
        $order = $this->makeOrder($listing, $buyer, 'confirmed');

        $this->say($conversation, $buyer, 'Kept message');
        $removed = $this->say($conversation, $buyer, 'Deleted for everyone');
        $private = $this->say($conversation, $buyer, 'Deleted just for me');

        $this->deleteMessage($buyer, $conversation, $removed, 'everyone');
        $this->deleteMessage($buyer, $conversation, $private, 'me');

        // The seller sees what the buyer left in place, a placeholder where the
        // buyer deleted for everyone, and still sees the message the buyer only
        // deleted "for me" (that choice affects the buyer's own view alone).
        $this->actingAs($seller)->get("/orders/{$order->id}/report")
            ->assertDontSee('Deleted for everyone')
            ->assertInertia(fn (Assert $page) => $page
                ->has('summary.messages', 3)
                ->where('summary.messages.0.body', 'Kept message')
                ->where('summary.messages.1.deleted', true)
                ->where('summary.messages.1.body', null)
                // Deleted only "for me" by the buyer: still visible to the seller.
                ->where('summary.messages.2.body', 'Deleted just for me'));

        // The buyer sees their own view: the private deletion is gone.
        $this->actingAs($buyer)->get("/orders/{$order->id}/report")
            ->assertDontSee('Deleted just for me')
            ->assertInertia(fn (Assert $page) => $page->has('summary.messages', 2));

        // The admin sees all of it, with the deleted one flagged.
        $this->actingAs($this->makeAdmin())->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->has('summary.messages', 3)
                ->where('summary.messages.1.body', 'Deleted for everyone')
                ->where('summary.messages.1.deleted', true));
    }

    // ---------------------------------------------------------------
    // Keeping evidence, then letting go of it
    // ---------------------------------------------------------------

    public function test_the_purge_removes_old_deleted_content_and_files_for_good(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->sendPhoto($conversation, $buyer);
        $attachment = $message->attachments()->firstOrFail();

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');
        $message->forceFill(['deleted_for_everyone_at' => now()->subDays(45)])->save();

        Storage::disk('local')->assertExists($attachment->path);

        $this->assertSame(1, MessagePurger::run());

        $this->assertNull($message->fresh()->body);
        $this->assertNull(Attachment::query()->find($attachment->id));
        Storage::disk('local')->assertMissing($attachment->path);

        // Nothing left to do on the next run.
        $this->assertSame(0, MessagePurger::run());
    }

    public function test_recently_deleted_messages_are_kept_during_the_retention_period(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Still on file');

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');
        $message->forceFill(['deleted_for_everyone_at' => now()->subDays(5)])->save();

        $this->assertSame(0, MessagePurger::run());
        $this->assertSame('Still on file', $message->fresh()->body);
    }

    public function test_messages_deleted_only_for_one_person_are_never_purged(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'The other person still sees this');

        $this->deleteMessage($buyer, $conversation, $message, 'me');

        $this->travel(90)->days();

        $this->assertSame(0, MessagePurger::run());
        $this->assertSame('The other person still sees this', $message->fresh()->body);
    }

    public function test_the_purge_waits_while_a_report_between_the_two_people_is_open(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Evidence I would like to erase');

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');
        $message->forceFill(['deleted_for_everyone_at' => now()->subDays(45)])->save();

        $report = Report::create([
            'reporter_id' => $seller->id,
            'reported_user_id' => $buyer->id,
            'reason' => 'harassment',
            'description' => 'They sent me threatening messages and then deleted them.',
        ]);

        // Open report: the evidence stays however old the deletion is.
        $this->assertSame(0, MessagePurger::run());
        $this->assertSame('Evidence I would like to erase', $message->fresh()->body);

        // Once the report is decided, the normal retention rules apply again.
        $report->update(['status' => 'dismissed']);

        $this->assertSame(1, MessagePurger::run());
        $this->assertNull($message->fresh()->body);
    }

    public function test_the_purge_command_runs_from_artisan(): void
    {
        [, $buyer, $conversation] = $this->chat();
        $message = $this->say($conversation, $buyer, 'Old news');

        $this->deleteMessage($buyer, $conversation, $message, 'everyone');
        $message->forceFill(['deleted_for_everyone_at' => now()->subDays(60)])->save();

        $this->artisan('messages:purge-deleted')->assertSuccessful();

        $this->assertNull($message->fresh()->body);
    }
}
