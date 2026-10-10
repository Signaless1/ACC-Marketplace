<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
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
                'reports' => fn ($q) => $q->where('reporter_id', $userId)->select('id', 'order_id', 'status'),
            ])
            ->latest()
            ->get();

        $sellingOrders = Order::query()
            ->where('seller_id', $userId)
            ->with([
                'listing.category',
                'listing.images',
                'buyer:id,name,avatar_path',
                'review',
                'reports' => fn ($q) => $q->where('reporter_id', $userId)->select('id', 'order_id', 'status'),
            ])
            ->latest()
            ->get();

        return Inertia::render('Orders/Index', [
            'buyingOrders' => $buyingOrders,
            'sellingOrders' => $sellingOrders,
            'transactionReasons' => \App\Models\Report::TRANSACTION_REASONS,
        ]);
    }

    public function store(
        Request $request,
        Listing $listing
    ): RedirectResponse {
        $buyer = $request->user();

        $validated = $request->validate([
            'quantity' => [
                'nullable',
                'integer',
                'min:'.Listing::QUANTITY_MIN,
                'max:'.Listing::QUANTITY_MAX,
            ],
        ]);

        $quantity = (int) ($validated['quantity'] ?? 1);

        // The listing row is locked for the duration of the transaction so
        // two buyers cannot both reserve the same units at once.
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

            if ($locked->status !== 'available') {
                return 'This listing is no longer available.';
            }

            if ($quantity > $locked->quantity) {
                return $locked->quantity === 1
                    ? 'Only 1 unit is left.'
                    : "Only {$locked->quantity} units are left.";
            }

            Order::create([
                'listing_id' => $locked->id,
                'buyer_id' => $buyer->id,
                'seller_id' => $locked->user_id,
                // Unit price at the time of ordering.
                'price' => $locked->price,
                'quantity' => $quantity,
                'status' => 'pending',
            ]);

            // Units are held for this buyer. When none are left the listing
            // shows as reserved until an order is cancelled or completed.
            $remaining = $locked->quantity - $quantity;

            $locked->update([
                'quantity' => $remaining,
                'status' => $remaining > 0 ? 'available' : 'reserved',
            ]);

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
            'This order can no longer be confirmed.'
        );

        return $error
            ? back()->with('error', $error)
            : back()->with('success', 'Order confirmed successfully.');
    }

    public function complete(
        Request $request,
        Order $order
    ): RedirectResponse {
        Gate::authorize('complete', $order);

        $error = $this->transition(
            $order,
            'completed',
            'Only confirmed orders can be completed.'
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

        $error = $this->transition(
            $order,
            'cancelled',
            'This order can no longer be cancelled.'
        );

        return $error
            ? back()->with('error', $error)
            : back()->with('success', 'Order cancelled.');
    }

    /**
     * Move an order to a new status and keep the listing's stock and status
     * in sync, all inside a single transaction with the rows locked.
     */
    private function transition(
        Order $order,
        string $to,
        string $errorMessage
    ): ?string {
        return DB::transaction(function () use ($order, $to, $errorMessage) {
            $locked = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->first();

            if (! $locked || ! in_array($to, self::TRANSITIONS[$locked->status] ?? [], true)) {
                return $errorMessage;
            }

            $locked->update(['status' => $to]);

            $listing = Listing::query()
                ->whereKey($locked->listing_id)
                ->lockForUpdate()
                ->first();

            if (! $listing) {
                return null;
            }

            if ($to === 'cancelled') {
                // Give the held units back and reopen the listing.
                $listing->update([
                    'quantity' => $listing->quantity + $locked->quantity,
                    'status' => 'available',
                ]);
            }

            if ($to === 'completed') {
                $othersStillActive = Order::query()
                    ->where('listing_id', $listing->id)
                    ->whereKeyNot($locked->id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->exists();

                // Every unit was held (listing is "reserved") and nothing
                // else is in flight, so the listing is now sold out.
                if ($listing->status === 'reserved' && ! $othersStillActive) {
                    $listing->update(['status' => 'sold', 'quantity' => 0]);
                }
            }

            return null;
        });
    }
}
