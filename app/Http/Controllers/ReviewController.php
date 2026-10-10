<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Order;
use App\Models\Review;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $received = Review::query()
            ->where('seller_id', $userId)
            ->with(['reviewer:id,name,avatar_path', 'listing:id,title', 'attachments'])
            ->latest()
            ->paginate(10, ['*'], 'received_page')
            ->withQueryString();

        $written = Review::query()
            ->where('reviewer_id', $userId)
            ->with(['seller:id,name,avatar_path', 'listing:id,title', 'attachments'])
            ->latest()
            ->paginate(10, ['*'], 'written_page')
            ->withQueryString();

        $pending = Order::query()
            ->where('buyer_id', $userId)
            ->where('status', 'completed')
            ->doesntHave('review')
            ->with(['listing:id,title', 'seller:id,name'])
            ->latest()
            ->get();

        return Inertia::render('Reviews/Index', [
            'received' => $received,
            'written' => $written,
            'pending' => $pending,
        ]);
    }

    public function store(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('review', $order);

        if ($order->status !== 'completed') {
            return back()->with(
                'error',
                'You can only review completed orders.'
            );
        }

        if ($order->review()->exists()) {
            return back()->with(
                'error',
                'You have already reviewed this order.'
            );
        }

        $validated = $request->validate([
            // Rating of the seller.
            'rating' => ['required', 'integer', 'between:1,5'],
            // Rating of the product itself.
            'product_rating' => ['nullable', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'attachments' => ['nullable', 'array', 'max:4'],
            'attachments.*' => Attachment::mediaRules(),
        ]);

        try {
            $review = Review::create([
                'order_id' => $order->id,
                'listing_id' => $order->listing_id,
                'reviewer_id' => $request->user()->id,
                'seller_id' => $order->seller_id,
                'rating' => $validated['rating'],
                'product_rating' => $validated['product_rating'] ?? null,
                'comment' => $validated['comment'] ?? null,
            ]);
        } catch (UniqueConstraintViolationException) {
            // Two simultaneous submissions: the DB unique key on order_id wins.
            return back()->with('error', 'You have already reviewed this order.');
        }

        foreach ($request->file('attachments', []) as $file) {
            $review->attachments()->create(
                Attachment::storeUpload($file, 'review-attachments')
            );
        }

        return back()->with('success', 'Thanks! Your review has been posted.');
    }

    /**
     * The seller of a review can answer it once (and edit the answer).
     */
    public function reply(Request $request, Review $review): RedirectResponse
    {
        abort_unless($review->seller_id === $request->user()->id, 403);

        $validated = $request->validate([
            'reply' => ['required', 'string', 'min:2', 'max:500'],
        ]);

        $review->update([
            'seller_reply' => $validated['reply'],
            'seller_replied_at' => now(),
        ]);

        return back()->with('success', 'Your reply has been posted.');
    }
}
