<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Order;
use App\Support\Attachments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    private const MAX_FILES = 5;

    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $conversations = Conversation::query()
            ->where(function ($query) use ($userId) {
                $query
                    ->where('buyer_id', $userId)
                    ->orWhere('seller_id', $userId);
            })
            ->with([
                'listing.category',
                'listing.images',
                'buyer:id,name,avatar_path',
                'seller:id,name,avatar_path',
                'latestMessage.attachments',
            ])
            ->withMax('messages', 'created_at')
            ->withCount([
                'messages as unread_messages_count' => function ($query) use ($userId) {
                    $query
                        ->whereNull('read_at')
                        ->where('sender_id', '!=', $userId)
                        ->liveFor($userId);
                },
            ])
            ->latest('messages_max_created_at')
            ->get();

        return Inertia::render('Messages/Index', [
            'conversations' => $conversations,
            'currentUserId' => $userId,
        ]);
    }

    public function start(
        Request $request,
        Listing $listing
    ): RedirectResponse {
        $buyer = $request->user();

        if ($listing->user_id === $buyer->id) {
            return back()->with(
                'error',
                'You cannot message yourself.'
            );
        }

        $conversation = Conversation::firstOrCreate([
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $listing->user_id,
        ]);

        return redirect()->route(
            'messages.show',
            $conversation
        );
    }

    public function startFromOrder(
        Request $request,
        Order $order
    ): RedirectResponse {
        $userId = $request->user()->id;

        abort_unless(
            $order->buyer_id === $userId ||
            $order->seller_id === $userId,
            403
        );

        $conversation = Conversation::firstOrCreate([
            'listing_id' => $order->listing_id,
            'buyer_id' => $order->buyer_id,
            'seller_id' => $order->seller_id,
        ]);

        return redirect()->route(
            'messages.show',
            $conversation
        );
    }

    public function show(
        Request $request,
        Conversation $conversation
    ): Response {
        $userId = $request->user()->id;

        abort_unless(
            $conversation->buyer_id === $userId ||
            $conversation->seller_id === $userId,
            403
        );

        $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $userId)
            ->update([
                'read_at' => now(),
            ]);

        $conversation->load([
            'listing.category',
            'listing.images',
            'buyer:id,name,avatar_path',
            'seller:id,name,avatar_path',
            // Leave out what this person deleted for themselves. Messages the
            // sender deleted for everyone stay as an empty "deleted" bubble
            // (Message::toArray strips their text and files).
            'messages' => fn ($query) => $query->visibleTo($userId)->orderBy('id'),
            'messages.sender:id,name,avatar_path',
            'messages.attachments',
        ]);

        // The order (if any) between these two people for this listing,
        // so the chat can link to it and offer "Report transaction".
        $order = Order::query()
            ->where('listing_id', $conversation->listing_id)
            ->where('buyer_id', $conversation->buyer_id)
            ->where('seller_id', $conversation->seller_id)
            ->latest()
            ->first(['id', 'status', 'quantity', 'price']);

        return Inertia::render('Messages/Show', [
            'conversation' => $conversation,
            'currentUserId' => $userId,
            'order' => $order,
        ]);
    }

    public function store(
        Request $request,
        Conversation $conversation
    ): RedirectResponse {
        $userId = $request->user()->id;

        abort_unless(
            $conversation->buyer_id === $userId ||
            $conversation->seller_id === $userId,
            403
        );

        $validated = $request->validate(
            [
                'body' => ['nullable', 'string', 'max:5000', 'required_without:attachments'],
                ...Attachments::rules('attachments', self::MAX_FILES, Attachments::CHAT_TYPES),
            ],
            [
                'body.required_without' => 'Type a message or attach a file.',
                ...Attachments::messages('attachments', self::MAX_FILES, Attachments::CHAT_TYPES),
            ]
        );

        $message = $conversation->messages()->create([
            'sender_id' => $userId,
            'body' => $validated['body'] ?? null,
        ]);

        // Chat files are private: stored on the local disk and served through
        // AttachmentController, never directly from /storage.
        Attachments::store(
            $message,
            $request->file('attachments', []),
            'local',
            "message-attachments/{$conversation->id}"
        );

        return back();
    }

    /**
     * Delete one message, either just for the person asking ("me") or, if they
     * sent it, for both people in the chat ("everyone"). Text, photos, videos
     * and files all go together because they belong to the same message.
     */
    public function destroy(
        Request $request,
        Conversation $conversation,
        Message $message
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $conversation->buyer_id === $user->id ||
            $conversation->seller_id === $user->id,
            403
        );

        // The message must belong to this conversation, otherwise someone
        // could pass their own conversation id with another chat's message id.
        abort_unless($message->conversation_id === $conversation->id, 404);

        $validated = $request->validate([
            'scope' => ['required', Rule::in(['me', 'everyone'])],
        ]);

        if ($validated['scope'] === 'everyone') {
            // Only the sender can pull a message back from the other person.
            abort_unless($message->sender_id === $user->id, 403);

            if ($message->deleted_for_everyone_at === null) {
                $message->forceFill(['deleted_for_everyone_at' => now()])->save();
            }

            return back()->with('success', 'Message deleted for everyone.');
        }

        // "Delete for me" works on any message in the chat, sent or received.
        $message->hiddenBy()->syncWithoutDetaching([$user->id]);

        return back()->with('success', 'Message deleted for you.');
    }
}
