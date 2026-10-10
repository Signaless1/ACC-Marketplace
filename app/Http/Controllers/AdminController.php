<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Listing;
use App\Models\ModerationLog;
use App\Models\Order;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function dashboard(): Response
    {
        $averageRating = Review::query()->avg('rating');

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users' => User::count(),
                'suspended_users' => User::whereNotNull('suspended_at')->count(),
                'listings' => Listing::count(),
                'active_listings' => Listing::where('status', 'available')
                    ->whereNull('hidden_at')
                    ->count(),
                'hidden_listings' => Listing::whereNotNull('hidden_at')->count(),
                'sold_listings' => Listing::where('status', 'sold')->count(),
                'orders' => Order::count(),
                'pending_orders' => Order::where('status', 'pending')->count(),
                'completed_orders' => Order::where('status', 'completed')->count(),
                'cancelled_orders' => Order::where('status', 'cancelled')->count(),
                'pending_reports' => Report::where('status', 'pending')->count(),
                'average_rating' => $averageRating
                    ? round((float) $averageRating, 1)
                    : null,
            ],
            'popularCategories' => Category::query()
                ->withCount('listings')
                ->orderByDesc('listings_count')
                ->take(5)
                ->get(['id', 'name']),
            'recentReports' => Report::query()
                ->where('status', 'pending')
                ->with(['reporter:id,name', 'listing:id,title', 'reportedUser:id,name'])
                ->latest()
                ->take(5)
                ->get(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Users
    |--------------------------------------------------------------------------
    */

    public function users(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));

        $users = User::query()
            ->withCount('listings')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(fn ($q) => $q
                    ->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like));
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => ['q' => $search],
        ]);
    }

    public function suspendUser(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id || $user->isAdmin()) {
            return back()->with('error', 'You cannot suspend this account.');
        }

        $user->forceFill(['suspended_at' => now()])->save();

        return back()->with('success', "{$user->name} has been suspended.");
    }

    public function unsuspendUser(User $user): RedirectResponse
    {
        $user->forceFill(['suspended_at' => null])->save();

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
            ->with(['seller:id,name,email', 'category:id,name', 'images'])
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(fn ($q) => $q
                    ->where('title', 'like', $like)
                    ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', $like)));
            })
            ->when($visibility === 'hidden', fn ($q) => $q->whereNotNull('hidden_at'))
            ->when($visibility === 'visible', fn ($q) => $q->whereNull('hidden_at'))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Listings', [
            'listings' => $listings,
            'filters' => [
                'q' => $search,
                'visibility' => $visibility,
            ],
            'removalReasons' => Listing::REMOVAL_REASONS,
            'recentActions' => ModerationLog::query()
                ->with('admin:id,name')
                ->latest('id')
                ->take(8)
                ->get(),
        ]);
    }

    /**
     * Take a listing down for a stated reason. This only affects the
     * listing: the seller's account is NOT suspended (that is a separate,
     * deliberate action in the Users page or on a report).
     */
    public function hideListing(Request $request, Listing $listing): RedirectResponse
    {
        $validated = $this->validateRemoval($request);

        $this->takeDown($request, $listing, $validated['reason'], $validated['note'] ?? null);

        return back()->with('success', 'Listing hidden. The seller can see the reason.');
    }

    public function restoreListing(Request $request, Listing $listing): RedirectResponse
    {
        $listing->update([
            'hidden_at' => null,
            'removed_reason' => null,
            'removed_note' => null,
            'removed_by' => null,
        ]);

        $this->log($request, $listing, 'restored', null, null);

        return back()->with('success', 'Listing restored.');
    }

    public function destroyListing(Request $request, Listing $listing): RedirectResponse
    {
        $validated = $this->validateRemoval($request);

        $this->log($request, $listing, 'deleted', $validated['reason'], $validated['note'] ?? null);

        $listing->load('images');

        foreach ($listing->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $listing->delete();

        return back()->with('success', 'Listing removed permanently.');
    }

    /**
     * @return array{reason: string, note?: string|null}
     */
    private function validateRemoval(Request $request): array
    {
        return $request->validate([
            'reason' => ['required', Rule::in(array_keys(Listing::REMOVAL_REASONS))],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
    }

    private function takeDown(Request $request, Listing $listing, string $reason, ?string $note): void
    {
        $listing->update([
            'hidden_at' => now(),
            'removed_reason' => $reason,
            'removed_note' => $note,
            'removed_by' => $request->user()->id,
        ]);

        $this->log($request, $listing, 'hidden', $reason, $note);
    }

    private function log(Request $request, Listing $listing, string $action, ?string $reason, ?string $note): void
    {
        ModerationLog::create([
            'admin_id' => $request->user()->id,
            'listing_id' => $listing->id,
            'listing_title' => $listing->title,
            'seller_id' => $listing->user_id,
            'action' => $action,
            'reason' => $reason,
            'note' => $note,
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
                'listing:id,title,hidden_at,user_id',
                'reportedUser:id,name,suspended_at',
                'reviewer:id,name',
                'order:id,status,quantity,price',
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
            'authorities' => Report::AUTHORITIES,
        ]);
    }

    public function updateReport(Request $request, Report $report): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Report::STATUSES)],
            'admin_note' => ['nullable', 'string', 'max:1000'],
            'hide_listing' => ['nullable', 'boolean'],
            'removal_reason' => ['nullable', Rule::in(array_keys(Listing::REMOVAL_REASONS))],
            'suspend_user' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('hide_listing') && $report->listing) {
            // Use the reason the admin picked, else the report's own reason
            // when it maps onto a removal reason, else "other".
            $reason = $validated['removal_reason']
                ?? (array_key_exists($report->reason, Listing::REMOVAL_REASONS) ? $report->reason : 'other');

            $this->takeDown($request, $report->listing, $reason, $validated['admin_note'] ?? null);
        }

        if ($request->boolean('suspend_user') && $report->reportedUser) {
            $target = $report->reportedUser;

            if (! $target->isAdmin() && $target->id !== $request->user()->id) {
                $target->forceFill(['suspended_at' => now()])->save();
            }
        }

        $report->update([
            'status' => $validated['status'],
            'admin_note' => $validated['admin_note'] ?? $report->admin_note,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Report updated.');
    }

    /**
     * Record that the case was referred to a figure of authority. The
     * printable case file (Reports/Show) is what gets handed over.
     */
    public function escalateReport(Request $request, Report $report): RedirectResponse
    {
        $validated = $request->validate([
            'escalated_to' => ['required', 'string', 'max:120'],
            'escalation_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $report->update([
            'escalated_to' => $validated['escalated_to'],
            'escalation_note' => $validated['escalation_note'] ?? null,
            'escalated_at' => now(),
            'status' => $report->status === 'pending' ? 'reviewing' : $report->status,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => $report->reviewed_at ?? now(),
        ]);

        return back()->with('success', "Case referred to {$validated['escalated_to']}.");
    }
}
