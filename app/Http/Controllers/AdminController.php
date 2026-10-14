<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /** The admin overview now lives on the main dashboard. */
    public function dashboard(): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /*
    |--------------------------------------------------------------------------
    | Users
    |--------------------------------------------------------------------------
    */

    public function users(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $status = $request->query('status', 'all');

        $users = User::query()
            ->withCount('listings')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(fn ($q) => $q
                    ->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like));
            })
            ->when($status === 'suspended', fn ($q) => $q->whereNotNull('suspended_at'))
            ->when($status === 'active', fn ($q) => $q->whereNull('suspended_at'))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => ['q' => $search, 'status' => $status],
        ]);
    }

    public function suspendUser(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id || $user->isAdmin()) {
            return back()->with('error', 'You cannot suspend this account.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:300'],
        ], [
            'reason.required' => 'Give a reason so the user knows why they were suspended.',
        ]);

        $user->forceFill([
            'suspended_at' => now(),
            'suspension_reason' => $validated['reason'],
        ])->save();

        return back()->with('success', "{$user->name} has been suspended.");
    }

    public function unsuspendUser(User $user): RedirectResponse
    {
        $user->forceFill([
            'suspended_at' => null,
            'suspension_reason' => null,
        ])->save();

        return back()->with('success', "{$user->name} has been reinstated.");
    }

    /*
    |--------------------------------------------------------------------------
    | Listings
    |--------------------------------------------------------------------------
    */

    public function listings(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $visibility = $request->query('visibility', 'all');

        $listings = Listing::query()
            ->with(['seller:id,name,email', 'category:id,name', 'images', 'remover:id,name'])
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(fn ($q) => $q
                    ->where('title', 'like', $like)
                    ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', $like)));
            })
            ->when($visibility === 'removed', fn ($q) => $q->whereNotNull('hidden_at'))
            ->when($visibility === 'visible', fn ($q) => $q->whereNull('hidden_at'))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Listings', [
            'listings' => $listings,
            'filters' => ['q' => $search, 'visibility' => $visibility],
            'reasons' => Listing::REMOVAL_REASONS,
        ]);
    }

    /**
     * Take a listing down with a stated reason. This does NOT suspend the
     * seller; suspending is a separate, deliberate action.
     */
    public function removeListing(Request $request, Listing $listing): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', Rule::in(array_keys(Listing::REMOVAL_REASONS))],
            'note' => [
                'nullable',
                'string',
                'max:500',
                Rule::requiredIf(fn () => $request->input('reason') === 'other'),
            ],
        ], [
            'reason.required' => 'Choose a reason for removing this listing.',
            'note.required' => 'Add a short note explaining the reason.',
        ]);

        $this->applyRemoval($listing, $validated['reason'], $validated['note'] ?? null, $request->user());

        return back()->with('success', 'Listing removed. The seller can see the reason.');
    }

    public function restoreListing(Listing $listing): RedirectResponse
    {
        $listing->update([
            'hidden_at' => null,
            'removed_reason' => null,
            'removed_note' => null,
            'removed_by' => null,
        ]);

        return back()->with('success', 'Listing restored.');
    }

    public function destroyListing(Listing $listing): RedirectResponse
    {
        $listing->load('images');

        foreach ($listing->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $listing->delete();

        return back()->with('success', 'Listing deleted permanently.');
    }

    /*
    |--------------------------------------------------------------------------
    | Transactions
    |--------------------------------------------------------------------------
    */

    public function orders(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $status = $request->query('status', 'all');

        $orders = Order::query()
            ->with(['listing:id,title', 'buyer:id,name', 'seller:id,name'])
            ->withCount('reports')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(function ($q) use ($like, $search) {
                    $q->whereHas('listing', fn ($l) => $l->where('title', 'like', $like))
                        ->orWhereHas('buyer', fn ($b) => $b->where('name', 'like', $like))
                        ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', $like));

                    // Allow searching by order number: "ACC-000042" or "42".
                    $digits = ltrim(preg_replace('/\D/', '', $search) ?? '', '0');
                    if ($digits !== '') {
                        $q->orWhere('id', (int) $digits);
                    }
                });
            })
            ->when(
                in_array($status, ['pending', 'confirmed', 'completed', 'cancelled'], true),
                fn ($q) => $q->where('status', $status)
            )
            ->when($status === 'reported', fn ($q) => $q->has('reports'))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'filters' => ['q' => $search, 'status' => $status],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Reports
    |--------------------------------------------------------------------------
    */

    public function reports(Request $request): Response
    {
        $status = $request->query('status', 'pending');

        if (! in_array($status, [...Report::STATUSES, 'all'], true)) {
            $status = 'pending';
        }

        $reports = Report::query()
            ->with([
                'reporter:id,name',
                'listing:id,title,hidden_at,user_id,removed_reason',
                'reportedUser:id,name,suspended_at',
                'reviewer:id,name',
                'order:id,listing_id,buyer_id,seller_id,price,quantity,status,created_at',
                'order.buyer:id,name',
                'order.seller:id,name',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $counts = Report::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('Admin/Reports', [
            'reports' => $reports,
            'status' => $status,
            'counts' => $counts,
            'reasons' => Report::allReasons(),
            'removalReasons' => Listing::REMOVAL_REASONS,
        ]);
    }

    public function updateReport(Request $request, Report $report): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Report::STATUSES)],
            'admin_note' => ['nullable', 'string', 'max:1000'],

            'escalated_to' => [
                'nullable',
                'string',
                'max:150',
                Rule::requiredIf(fn () => $request->input('status') === 'escalated'),
            ],

            // Each action is explicit and carries its own reason.
            'remove_listing' => ['nullable', 'boolean'],
            'removal_reason' => [
                'nullable',
                Rule::in(array_keys(Listing::REMOVAL_REASONS)),
                Rule::requiredIf(fn () => $request->boolean('remove_listing')),
            ],
            'removal_note' => ['nullable', 'string', 'max:500'],

            'suspend_user' => ['nullable', 'boolean'],
            'suspension_reason' => [
                'nullable',
                'string',
                'max:300',
                Rule::requiredIf(fn () => $request->boolean('suspend_user')),
            ],
        ], [
            'escalated_to.required' => 'Say who the report is being escalated to (office or person).',
            'removal_reason.required' => 'Pick a reason for removing the listing.',
            'suspension_reason.required' => 'Give a reason for suspending the user.',
        ]);

        if ($request->boolean('remove_listing') && $report->listing) {
            $this->applyRemoval(
                $report->listing,
                $validated['removal_reason'],
                $validated['removal_note'] ?? null,
                $request->user()
            );
        }

        if ($request->boolean('suspend_user') && $report->reportedUser) {
            $target = $report->reportedUser;

            if (! $target->isAdmin() && $target->id !== $request->user()->id) {
                $target->forceFill([
                    'suspended_at' => now(),
                    'suspension_reason' => $validated['suspension_reason'],
                ])->save();
            }
        }

        $update = [
            'status' => $validated['status'],
            'admin_note' => $validated['admin_note'] ?? $report->admin_note,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ];

        if ($validated['status'] === 'escalated') {
            $update['escalated_to'] = $validated['escalated_to'];
            $update['escalated_at'] = $report->escalated_at ?? now();
        }

        $report->update($update);

        return back()->with('success', 'Report updated.');
    }

    private function applyRemoval(Listing $listing, string $reason, ?string $note, User $admin): void
    {
        $listing->update([
            'hidden_at' => now(),
            'removed_reason' => $reason,
            'removed_note' => $note,
            'removed_by' => $admin->id,
        ]);
    }
}
