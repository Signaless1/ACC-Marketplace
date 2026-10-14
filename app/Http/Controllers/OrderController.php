<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * Allowed status transitions. Anything not listed here is rejected
     * server-side, regardless of what the frontend shows.
     */
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $buyingOrders = Order::query()
            ->where('buyer_id', $userId)
            ->with([
                'listing.category',
                'listing.images',
                'seller:id,name,avatar_path',
                'review',
            ])
            ->withCount(['reports as my_reports_count' => fn ($q) => $q->where('reporter_id', $userId)])
            ->latest()
            ->get();

        $sellingOrders = Order::query()
            ->where('seller_id', $userId)
            ->with([
                'listing.category',
                'listing.images',
                'buyer:id,name,avatar_path',
                'review',
            ])
            ->withCount(['reports as my_reports_count' => fn ($q) => $q->where('reporter_id', $userId)])
            ->latest()
            ->get();

        return Inertia::render('Orders/Index', [
            'buyingOrders' => $buyingOrders,
            'sellingOrders' => $sellingOrders,
        ]);
    }

    public function store(
        Request $request,
        Listing $listing
    ): RedirectResponse {
        $validated = $request->validate([
            'quantity' => ['nullable', 'integer', 'min:1', 'max:'.Listing::MAX_QUANTITY],
        ]);

        $quantity = (int) ($validated['quantity'] ?? 1);
        $buyer = $request->user();

        // The listing row is locked for the whole transaction so two buyers
        // cannot reserve the same units at once.
        $error = DB::transaction(function () use ($listing, $buyer, $quantity) {
            $locked = Listing::query()
                ->whereKey($listing->id)
                ->lockForUpdate()
                ->first();

            if (! $locked || $locked->hidden_at !== null) {
                return 'This listing is not available.';
            }

            if ($locked->user_id === $buyer->id) {
                return 'You cannot order your own listing.';
            }

            if ($locked->quantity < 1) {
                return 'This listing is no longer available.';
            }

            if ($quantity > $locked->quantity) {
                return "Only {$locked->quantity} left. Lower the quantity and try again.";
            }

            $order = Order::create([
                'listing_id' => $locked->id,
                'buyer_id' => $buyer->id,
                'seller_id' => $locked->user_id,
                'price' => $locked->price,
                'quantity' => $quantity,
                'status' => 'pending',
            ]);

            OrderEvent::record($order, 'placed', $buyer->id);

            $locked->decrement('quantity', $quantity);
            $locked->refresh()->syncStatus();

            return null;
        });

        if ($error) {
            return back()->with('error', $error);
        }

        return redirect()
            ->route('orders.index')
            ->with('success', 'Your order request has been sent to the seller.');
    }

    public function confirm(
        Request $request,
        Order $order
    ): RedirectResponse {
        Gate::authorize('confirm', $order);

        $error = $this->transition(
            $order,
            'confirmed',
            'This order can no longer be confirmed.',
            $request->user()->id,
            ['confirmed_at' => now()]
        );

        return $error
            ? back()->with('error', $error)
            : back()->with('success', 'Order confirmed. Arrange the meet-up in Messages.');
    }

    public function complete(
        Request $request,
        Order $order
    ): RedirectResponse {
        Gate::authorize('complete', $order);

        $error = $this->transition(
            $order,
            'completed',
            'Only confirmed orders can be completed.',
            $request->user()->id,
            ['completed_at' => now()]
        );

        return $error
            ? back()->with('error', $error)
            : back()->with('success', 'Order marked as completed.');
    }

    public function cancel(
        Request $request,
        Order $order
    ): RedirectResponse {
        Gate::authorize('cancel', $order);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $error = $this->transition(
            $order,
            'cancelled',
            'This order can no longer be cancelled.',
            $request->user()->id,
            [
                'cancelled_at' => now(),
                'cancelled_by' => $request->user()->id,
                'cancel_reason' => $validated['reason'] ?? null,
            ],
            restoreStock: true
        );

        return $error
            ? back()->with('error', $error)
            : back()->with('success', 'Order cancelled.');
    }

    /**
     * Move an order to a new status inside one transaction, with the order
     * and listing rows locked, then bring the listing's stock and status in line.
     *
     * @param  int  $actorId  the user who made the change (for the audit trail)
     * @param  array<string, mixed>  $attributes  extra columns to write (timestamps, reason…)
     */
    private function transition(
        Order $order,
        string $to,
        string $errorMessage,
        int $actorId,
        array $attributes = [],
        bool $restoreStock = false
    ): ?string {
        return DB::transaction(function () use ($order, $to, $errorMessage, $actorId, $attributes, $restoreStock) {
            $locked = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->first();

            if (! $locked || ! in_array($to, self::TRANSITIONS[$locked->status] ?? [], true)) {
                return $errorMessage;
            }

            $locked->update(['status' => $to] + $attributes);

            // Audit trail: placed | confirmed | completed | cancelled.
            OrderEvent::record($locked, $to, $actorId);

            $listing = Listing::query()
                ->whereKey($locked->listing_id)
                ->lockForUpdate()
                ->first();

            if ($listing) {
                if ($restoreStock) {
                    $listing->increment('quantity', $locked->quantity);
                    $listing->refresh();
                }

                $listing->syncStatus();
            }

            return null;
        });
    }
}
