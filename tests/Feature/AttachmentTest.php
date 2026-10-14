<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function chat(): array
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);
        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");

        return [$seller, $buyer, Conversation::first()];
    }

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
    }

    public function test_user_can_send_photo_and_video_in_a_message(): void
    {
        [, $buyer, $conversation] = $this->chat();

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'body' => 'Here is the item',
            'attachments' => [
                UploadedFile::fake()->create('photo.jpg', 200, 'image/jpeg'),
                UploadedFile::fake()->create('clip.mp4', 5000, 'video/mp4'),
            ],
        ])->assertSessionHasNoErrors();

        $message = $conversation->messages()->first();
        $this->assertSame('Here is the item', $message->body);
        $this->assertCount(2, $message->attachments);
        $this->assertSame(['image', 'video'], $message->attachments->pluck('kind')->sort()->values()->all());

        // Chat files are private: on the local disk, never the public one.
        foreach ($message->attachments as $attachment) {
            $this->assertSame('local', $attachment->disk);
            Storage::disk('local')->assertExists($attachment->path);
            Storage::disk('public')->assertMissing($attachment->path);
        }
    }

    public function test_message_can_be_attachment_only_but_not_empty(): void
    {
        [, $buyer, $conversation] = $this->chat();

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'attachments' => [UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf')],
        ])->assertSessionHasNoErrors();
        $this->assertNull($conversation->messages()->first()->body);

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", ['body' => '   '])
            ->assertSessionHasErrors('body');
    }

    public function test_dangerous_oversized_and_too_many_files_are_rejected(): void
    {
        [, $buyer, $conversation] = $this->chat();

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'body' => 'x',
            'attachments' => [UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload')],
        ])->assertSessionHasErrors('attachments.0');

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'body' => 'x',
            'attachments' => [UploadedFile::fake()->create('shell.php', 1, 'application/x-php')],
        ])->assertSessionHasErrors('attachments.0');

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'body' => 'x',
            'attachments' => [UploadedFile::fake()->create('huge.mp4', 26000, 'video/mp4')],
        ])->assertSessionHasErrors('attachments.0');

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'body' => 'x',
            'attachments' => array_map(
                fn ($i) => UploadedFile::fake()->create("p{$i}.jpg", 10, 'image/jpeg'),
                range(1, 6)
            ),
        ])->assertSessionHasErrors('attachments');

        $this->assertSame(0, $conversation->messages()->count());
        $this->assertSame(0, Attachment::count());
    }

    public function test_only_the_two_people_in_the_chat_and_admins_can_open_attachments(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'attachments' => [UploadedFile::fake()->create('photo.jpg', 50, 'image/jpeg')],
        ]);

        $attachment = Attachment::first();
        $url = "/attachments/{$attachment->id}";

        $this->actingAs($buyer)->get($url)->assertOk();
        $this->actingAs($seller)->get($url)->assertOk();
        $this->actingAs($this->makeAdmin())->get($url)->assertOk();
        $this->actingAs(User::factory()->create())->get($url)->assertForbidden();

        auth()->logout();
        $this->get($url)->assertRedirect('/login');
    }

    public function test_conversation_page_includes_attachments_and_listing_images(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();

        $listing = $conversation->listing;
        $listing->images()->create(['path' => 'listings/cover.jpg', 'sort_order' => 0]);

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", [
            'body' => 'look',
            'attachments' => [UploadedFile::fake()->create('photo.jpg', 50, 'image/jpeg')],
        ]);

        $this->actingAs($seller)->get("/messages/{$conversation->id}")
            ->assertInertia(fn ($page) => $page
                ->component('Messages/Show')
                // The product image used to be missing here.
                ->where('conversation.listing.images.0.path', 'listings/cover.jpg')
                ->has('conversation.messages.0.attachments', 1)
                ->where('conversation.messages.0.attachments.0.kind', 'image'));
    }

    public function test_conversation_list_shows_latest_message_and_product_image(): void
    {
        [$seller, $buyer, $conversation] = $this->chat();
        $conversation->listing->images()->create(['path' => 'listings/cover.jpg', 'sort_order' => 0]);

        $this->actingAs($buyer)->post("/messages/{$conversation->id}", ['body' => 'Hello there']);

        $this->actingAs($seller)->get('/messages')
            ->assertInertia(fn ($page) => $page
                ->where('conversations.0.listing.images.0.path', 'listings/cover.jpg')
                ->where('conversations.0.latest_message.body', 'Hello there')
                ->where('conversations.0.unread_messages_count', 1));
    }

    public function test_review_can_include_photos_and_video_but_not_office_files(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold']);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", [
            'rating' => 5,
            'product_rating' => 4,
            'comment' => 'Works great',
            'attachments' => [
                UploadedFile::fake()->create('proof.jpg', 100, 'image/jpeg'),
                UploadedFile::fake()->create('demo.mp4', 2000, 'video/mp4'),
            ],
        ])->assertSessionHas('success');

        $review = $order->review;
        $this->assertCount(2, $review->attachments);
        foreach ($review->attachments as $attachment) {
            $this->assertSame('public', $attachment->disk);
            Storage::disk('public')->assertExists($attachment->path);
        }

        $order2 = $this->makeOrder($this->makeListing($seller, ['status' => 'sold']), $buyer, 'completed');
        $this->actingAs($buyer)->post("/orders/{$order2->id}/review", [
            'rating' => 5,
            'product_rating' => 4,
            'attachments' => [UploadedFile::fake()->create('report.docx', 50, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')],
        ])->assertSessionHasErrors('attachments.0');
    }
}
