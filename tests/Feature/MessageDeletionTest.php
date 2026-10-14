<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class MessageDeletionTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private User $seller;

    private User $buyer;

    private Conversation $conversation;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');

        $this->seller = User::factory()->create();
        $this->buyer = User::factory()->create();
        $listing = $this->makeListing($this->seller);

        $this->actingAs($this->buyer)->post("/listings/{$listing->id}/message");
        $this->conversation = Conversation::firstOrFail();
    }

    private function say(User $from, string $body): Message
    {
        return $this->conversation->messages()->create(['sender_id' => $from->id, 'body' => $body]);
    }

    private function remove(User $as, Message $message, ?string $scope, ?Conversation $in = null)
    {
        $conversation = $in ?? $this->conversation;

        return $this->actingAs($as)->delete(
            "/messages/{$conversation->id}/{$message->id}",
            $scope === null ? [] : ['scope' => $scope]
        );
    }

    /** The messages the person gets when they open the chat. */
    private function visibleTo(User $user): array
    {
        $response = $this->actingAs($user)->get("/messages/{$this->conversation->id}")->assertOk();

        return $response->viewData('page')['props']['conversation']['messages'];
    }

    // -- delete for everyone -------------------------------------------------

    public function test_sender_can_delete_a_text_message_for_everyone(): void
    {
        $message = $this->say($this->buyer, 'secret-text-123');

        $this->remove($this->buyer, $message, 'everyone')->assertSessionHas('success');

        $this->assertNotNull($message->fresh()->deleted_for_everyone_at);

        foreach ([$this->buyer, $this->seller] as $person) {
            $seen = $this->visibleTo($person);
            $this->assertCount(1, $seen, 'a "deleted" placeholder stays in the thread');
            $this->assertTrue($seen[0]['is_deleted']);
            $this->assertNull($seen[0]['body']);
            $this->assertSame([], $seen[0]['attachments']);
        }
    }

    public function test_deleted_text_is_not_present_anywhere_in_the_other_persons_page(): void
    {
        $message = $this->say($this->buyer, 'secret-text-123');
        $this->remove($this->buyer, $message, 'everyone');

        $html = $this->actingAs($this->seller)->get("/messages/{$this->conversation->id}")->content();
        $this->assertStringNotContainsString('secret-text-123', $html);

        $inbox = $this->actingAs($this->seller)->get('/messages')->content();
        $this->assertStringNotContainsString('secret-text-123', $inbox);
    }

    public function test_image_and_video_messages_can_be_deleted_for_everyone(): void
    {
        $this->actingAs($this->buyer)->post("/messages/{$this->conversation->id}", [
            'body' => 'look',
            'attachments' => [
                UploadedFile::fake()->create('photo.jpg', 100, 'image/jpeg'),
                UploadedFile::fake()->create('clip.mp4', 500, 'video/mp4'),
            ],
        ])->assertSessionHasNoErrors();

        $message = $this->conversation->messages()->firstOrFail();
        $this->assertCount(2, $message->attachments);

        $this->remove($this->buyer, $message, 'everyone')->assertSessionHas('success');

        $seen = $this->visibleTo($this->seller)[0];
        $this->assertTrue($seen['is_deleted']);
        $this->assertSame([], $seen['attachments']);
        $this->assertNull($seen['body']);
    }

    public function test_only_the_sender_can_delete_for_everyone(): void
    {
        $message = $this->say($this->buyer, 'hello');

        $this->remove($this->seller, $message, 'everyone')->assertForbidden();

        $this->assertNull($message->fresh()->deleted_for_everyone_at);
        $this->assertFalse($this->visibleTo($this->seller)[0]['is_deleted']);
    }

    public function test_deleting_for_everyone_twice_is_harmless(): void
    {
        $message = $this->say($this->buyer, 'hello');

        $this->remove($this->buyer, $message, 'everyone');
        $first = $message->fresh()->deleted_for_everyone_at;

        $this->travel(5)->minutes();
        $this->remove($this->buyer, $message, 'everyone')->assertSessionHas('success');

        $this->assertEquals($first, $message->fresh()->deleted_for_everyone_at);
    }

    // -- delete for me -------------------------------------------------------

    public function test_delete_for_me_hides_it_only_from_me(): void
    {
        $message = $this->say($this->buyer, 'hello');

        $this->remove($this->buyer, $message, 'me')->assertSessionHas('success');

        $this->assertCount(0, $this->visibleTo($this->buyer));

        $theirs = $this->visibleTo($this->seller);
        $this->assertCount(1, $theirs);
        $this->assertSame('hello', $theirs[0]['body']);
        $this->assertFalse($theirs[0]['is_deleted']);
        $this->assertNull($message->fresh()->deleted_for_everyone_at);
    }

    public function test_either_person_can_delete_a_received_message_for_themselves(): void
    {
        $message = $this->say($this->seller, 'price is firm');

        $this->remove($this->buyer, $message, 'me')->assertSessionHas('success');

        $this->assertCount(0, $this->visibleTo($this->buyer));
        $this->assertCount(1, $this->visibleTo($this->seller));
    }

    public function test_delete_for_me_twice_does_not_error_or_duplicate(): void
    {
        $message = $this->say($this->buyer, 'hello');

        $this->remove($this->buyer, $message, 'me')->assertSessionHas('success');
        $this->remove($this->buyer, $message, 'me')->assertSessionHas('success');

        $this->assertSame(1, $message->hiddenBy()->count());
    }

    public function test_a_deleted_for_everyone_placeholder_can_still_be_cleared_for_me(): void
    {
        $message = $this->say($this->buyer, 'oops');
        $this->remove($this->buyer, $message, 'everyone');

        $this->remove($this->seller, $message, 'me')->assertSessionHas('success');

        $this->assertCount(0, $this->visibleTo($this->seller));
        $this->assertCount(1, $this->visibleTo($this->buyer));
    }

    // -- access control & validation ----------------------------------------

    public function test_outsiders_cannot_delete_anything(): void
    {
        $message = $this->say($this->buyer, 'hello');
        $stranger = User::factory()->create();

        $this->remove($stranger, $message, 'me')->assertForbidden();
        $this->remove($stranger, $message, 'everyone')->assertForbidden();

        $this->assertSame(0, $message->hiddenBy()->count());
        $this->assertNull($message->fresh()->deleted_for_everyone_at);
    }

    public function test_message_id_from_another_conversation_is_rejected(): void
    {
        // The stranger owns a different chat, then tries to delete a message
        // from this one by pairing it with their own conversation id.
        $stranger = User::factory()->create();
        $other = $this->makeListing($this->seller, ['title' => 'Another item']);
        $this->actingAs($stranger)->post("/listings/{$other->id}/message");
        $strangersChat = Conversation::query()->where('buyer_id', $stranger->id)->firstOrFail();

        $message = $this->say($this->buyer, 'private');

        $this->remove($stranger, $message, 'everyone', $strangersChat)->assertNotFound();
        $this->remove($stranger, $message, 'me', $strangersChat)->assertNotFound();

        $this->assertNull($message->fresh()->deleted_for_everyone_at);
        $this->assertSame(0, $message->hiddenBy()->count());
    }

    public function test_scope_is_required_and_must_be_known(): void
    {
        $message = $this->say($this->buyer, 'hello');

        $this->remove($this->buyer, $message, null)->assertSessionHasErrors('scope');
        $this->remove($this->buyer, $message, 'everybody')->assertSessionHasErrors('scope');
        $this->remove($this->buyer, $message, 'admin')->assertSessionHasErrors('scope');

        $this->assertNull($message->fresh()->deleted_for_everyone_at);
        $this->assertSame(0, $message->hiddenBy()->count());
    }

    public function test_guests_are_sent_to_login(): void
    {
        $message = $this->say($this->buyer, 'hello');

        $this->app['auth']->forgetGuards();

        $this->call('DELETE', "/messages/{$this->conversation->id}/{$message->id}", ['scope' => 'me'])
            ->assertRedirect('/login');

        $this->assertSame(0, $message->hiddenBy()->count());
    }

    // -- files stay private after deletion ----------------------------------

    private function sendPhoto(User $from): Message
    {
        $this->actingAs($from)->post("/messages/{$this->conversation->id}", [
            'attachments' => [UploadedFile::fake()->create('photo.jpg', 100, 'image/jpeg')],
        ])->assertSessionHasNoErrors();

        return $this->conversation->messages()->latest('id')->firstOrFail();
    }

    public function test_file_url_stops_working_after_delete_for_everyone(): void
    {
        $message = $this->sendPhoto($this->buyer);
        $attachment = $message->attachments()->firstOrFail();

        $this->actingAs($this->seller)->get("/attachments/{$attachment->id}")->assertOk();

        $this->remove($this->buyer, $message, 'everyone');

        $this->actingAs($this->seller)->get("/attachments/{$attachment->id}")->assertNotFound();
        $this->actingAs($this->buyer)->get("/attachments/{$attachment->id}")->assertNotFound();

        // An admin can still open it: it may be evidence in a report.
        $this->actingAs($this->makeAdmin())->get("/attachments/{$attachment->id}")->assertOk();
    }

    public function test_file_url_stops_working_only_for_the_person_who_deleted_for_me(): void
    {
        $message = $this->sendPhoto($this->buyer);
        $attachment = $message->attachments()->firstOrFail();

        $this->remove($this->seller, $message, 'me');

        $this->actingAs($this->seller)->get("/attachments/{$attachment->id}")->assertNotFound();
        $this->actingAs($this->buyer)->get("/attachments/{$attachment->id}")->assertOk();
    }

    // -- unread counts and previews -----------------------------------------

    public function test_unread_badge_ignores_messages_deleted_before_they_were_read(): void
    {
        $message = $this->say($this->buyer, 'psst');

        $this->actingAs($this->seller)->get('/live')->assertJsonPath('unreadMessageCount', 1);

        $this->remove($this->buyer, $message, 'everyone');

        $this->actingAs($this->seller)->get('/live')
            ->assertJsonPath('unreadMessageCount', 0)
            ->assertJsonPath('latestMessage', null);
    }

    public function test_unread_badge_ignores_messages_the_reader_deleted_for_themselves(): void
    {
        $message = $this->say($this->buyer, 'psst');

        $this->remove($this->seller, $message, 'me');

        $this->actingAs($this->seller)->get('/live')->assertJsonPath('unreadMessageCount', 0);
    }

    public function test_inbox_preview_shows_a_placeholder_when_the_last_message_was_deleted(): void
    {
        $this->say($this->buyer, 'first');
        $last = $this->say($this->buyer, 'second-secret');
        $this->remove($this->buyer, $last, 'everyone');

        $this->actingAs($this->seller)->get('/messages')->assertInertia(
            fn ($page) => $page
                ->where('conversations.0.latest_message.is_deleted', true)
                ->where('conversations.0.latest_message.body', null)
        );
    }

    public function test_inbox_preview_falls_back_to_the_previous_message_after_delete_for_me(): void
    {
        $this->say($this->buyer, 'first');
        $last = $this->say($this->buyer, 'second');
        $this->remove($this->seller, $last, 'me');

        $this->actingAs($this->seller)->get('/messages')->assertInertia(
            fn ($page) => $page->where('conversations.0.latest_message.body', 'first')
        );

        // The sender's own preview is untouched.
        $this->actingAs($this->buyer)->get('/messages')->assertInertia(
            fn ($page) => $page->where('conversations.0.latest_message.body', 'second')
        );
    }

    // -- the compiled transaction document ----------------------------------

    private function summaryMessages(User $viewer, $order): array
    {
        $response = $this->actingAs($viewer)->get("/orders/{$order->id}/report")->assertOk();

        return $response->viewData('page')['props']['summary']['messages'];
    }

    public function test_transaction_document_keeps_deleted_messages_for_admins_only(): void
    {
        $order = $this->makeOrder($this->conversation->listing, $this->buyer);
        $message = $this->say($this->buyer, 'send the money to this account');
        $this->say($this->seller, 'ok');
        $this->remove($this->buyer, $message, 'everyone');

        // Admin: sees it, flagged.
        $admin = $this->summaryMessages($this->makeAdmin(), $order);
        $this->assertCount(2, $admin);
        $this->assertTrue($admin[0]['deleted']);
        $this->assertSame('send the money to this account', $admin[0]['body']);

        // The people in the chat: placeholder only, no content.
        foreach ([$this->buyer, $this->seller] as $party) {
            $theirs = $this->summaryMessages($party, $order);
            $this->assertCount(2, $theirs);
            $this->assertTrue($theirs[0]['deleted']);
            $this->assertNull($theirs[0]['body']);
        }

        $html = $this->actingAs($this->seller)->get("/orders/{$order->id}/report")->content();
        $this->assertStringNotContainsString('send the money to this account', $html);
    }

    public function test_transaction_document_omits_messages_the_viewer_deleted_for_themselves(): void
    {
        $order = $this->makeOrder($this->conversation->listing, $this->buyer);
        $message = $this->say($this->seller, 'private note');
        $this->say($this->buyer, 'visible');

        $this->remove($this->buyer, $message, 'me');

        $this->assertCount(1, $this->summaryMessages($this->buyer, $order));
        $this->assertCount(2, $this->summaryMessages($this->seller, $order));
        $this->assertCount(2, $this->summaryMessages($this->makeAdmin(), $order));
    }
}
