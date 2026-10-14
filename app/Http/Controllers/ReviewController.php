<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Review;
use App\Support\Attachments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    private const MAX_FILES = 4;

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
            return back()->with('error', 'You can only review completed orders.');
        }

        if ($order->review()->exists()) {
            return back()->with('error', 'You have already reviewed this order.');
        }

        $validated = $request->validate(
            [
                'product_rating' => ['required', 'integer', 'between:1,5'],
                'rating' => ['required', 'integer', 'between:1,5'],
                'comment' => ['nullable', 'string', 'max:1000'],
                ...Attachments::rules('attachments', self::MAX_FILES, Attachments::REVIEW_TYPES),
            ],
            [
                'product_rating.required' => 'Please rate the product.',
                'rating.required' => 'Please rate the seller.',
                ...Attachments::messages('attachments', self::MAX_FILES, Attachments::REVIEW_TYPES),
            ]
        );

        $review = Review::create([
            'order_id' => $order->id,
            'listing_id' => $order->listing_id,
            'reviewer_id' => $request->user()->id,
            'seller_id' => $order->seller_id,
            'product_rating' => $validated['product_rating'],
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        Attachments::store(
            $review,
            $request->file('attachments', []),
            'public',
            'review-attachments'
        );

        return back()->with('success', 'Thanks! Your review has been posted.');
    }
}
