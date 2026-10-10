<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    /** Columns of a user that are safe to show the other party. */
    private const PUBLIC_USER = ':id,name,avatar_path';

    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        return Inertia::render('Messages/Index', [
            'conversations' => $this->conversationList($userId),
            'currentUserId' => $userId,
        ]);
    }

    /**
     * JSON copy of the conversation list. The inbox polls this so new
     * messages show up without a page refresh.
     */
    public function list(Request $request): JsonResponse
    {
        return response()->json([
            'conversations' => $this->conversationList($request->user()->id),
        ]);
    }

    /**
     * Tiny JSON payload polled from every page: the unread count and the
     * newest unread message (used for the "new message" pop-up).
     */
    public function summary(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $unread = Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $userId)
            ->whereHas('conversation', fn ($q) => $q
                ->where('buyer_id', $userId)
                ->orWhere('seller_id', $userId));

        $latest = (clone $unread)
            ->with(['sender'.self::PUBLIC_USER, 'attachments:id,attachable_id,attachable_type,kind,original_name'])
            ->latest('id')
            ->first();

        return response()->json([
            'unread_count' => (clone $unread)->count(),
            'latest' => $latest ? [
                'id' => $latest->id,
                'conversation_id' => $latest->conversation_id,
                'sender_name' => $latest->sender?->name,
                'sender_avatar_url' => $latest->sender?->avatar_url,
                'preview' => $this->preview($latest),
            ] : null,
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

        $this->authorizeParticipant($conversation, $userId);

        $this->markRead($conversation, $userId);

        $conversation->load([
            'listing.category',
            'listing.images',
            'buyer'.self::PUBLIC_USER,
            'seller'.self::PUBLIC_USER,
            'messages.sender'.self::PUBLIC_USER,
            'messages.attachments',
        ]);

        return Inertia::render('Messages/Show', [
            'conversation' => $conversation,
            'currentUserId' => $userId,
            'limits' => [
                'max_files' => 5,
                'max_megabytes' => (int) (Attachment::MAX_KILOBYTES / 1024),
                'extensions' => Attachment::ALLOWED_EXTENSIONS,
            ],
        ]);
    }

    /**
     * Messages newer than `after`, plus which of my own messages the other
     * person has read. Polled every few seconds by the open chat.
     */
    public function poll(
        Request $request,
        Conversation $conversation
    ): JsonResponse {
        $userId = $request->user()->id;

        $this->authorizeParticipant($conversation, $userId);

        $after = max(0, (int) $request->query('after', 0));

        $this->markRead($conversation, $userId);

        $messages = $conversation->messages()
            ->where('id', '>', $after)
            ->with(['sender'.self::PUBLIC_USER, 'attachments'])
            ->orderBy('id')
            ->limit(100)
            ->get();

        $readIds = $conversation->messages()
            ->where('sender_id', $userId)
            ->whereNotNull('read_at')
            ->latest('id')
            ->limit(200)
            ->pluck('id');

        return response()->json([
            'messages' => $messages,
            'read_ids' => $readIds,
        ]);
    }

    public function store(
        Request $request,
        Conversation $conversation
    ): RedirectResponse|JsonResponse {
        $userId = $request->user()->id;

        $this->authorizeParticipant($conversation, $userId);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => Attachment::fileRules(),
        ]);

        $body = trim((string) ($validated['body'] ?? ''));
        $files = $request->file('attachments', []);

        if ($body === '' && count($files) === 0) {
            throw ValidationException::withMessages([
                'body' => 'Write a message or attach a file.',
            ]);
        }

        $message = $conversation->messages()->create([
            'sender_id' => $userId,
            // The column is NOT NULL; attachment-only messages store ''.
            'body' => $body,
        ]);

        foreach ($files as $file) {
            $message->attachments()->create(
                Attachment::storeUpload($file, 'message-attachments')
            );
        }

        if ($request->expectsJson()) {
            $message->load(['sender'.self::PUBLIC_USER, 'attachments']);

            return response()->json(['message' => $message], 201);
        }

        return back();
    }

    private function authorizeParticipant(Conversation $conversation, int $userId): void
    {
        abort_unless(
            $conversation->buyer_id === $userId ||
            $conversation->seller_id === $userId,
            403
        );
    }

    private function markRead(Conversation $conversation, int $userId): void
    {
        $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $userId)
            ->update(['read_at' => now()]);
    }

    private function preview(Message $message): string
    {
        $body = trim($message->body);

        if ($body !== '') {
            return mb_strimwidth($body, 0, 90, '…');
        }

        $first = $message->attachments->first();

        return match ($first?->kind) {
            'image' => 'Sent a photo',
            'video' => 'Sent a video',
            default => 'Sent a file',
        };
    }

    /**
     * @return Collection<int, Conversation>
     */
    private function conversationList(int $userId): Collection
    {
        $conversations = Conversation::query()
            ->where(function ($query) use ($userId) {
                $query
                    ->where('buyer_id', $userId)
                    ->orWhere('seller_id', $userId);
            })
            ->with([
                'listing.category',
                'listing.images',
                'buyer'.self::PUBLIC_USER,
                'seller'.self::PUBLIC_USER,
                'latestMessage.attachments:id,attachable_id,attachable_type,kind,original_name',
            ])
            ->withMax('messages', 'created_at')
            ->withCount([
                'messages as unread_messages_count' => function ($query) use ($userId) {
                    $query
                        ->whereNull('read_at')
                        ->where('sender_id', '!=', $userId);
                },
            ])
            ->latest('messages_max_created_at')
            ->get();

        return $conversations->each(function (Conversation $conversation) {
            $conversation->setAttribute(
                'last_message_preview',
                $conversation->latestMessage ? $this->preview($conversation->latestMessage) : null
            );
            $conversation->unsetRelation('latestMessage');
        });
    }
}
