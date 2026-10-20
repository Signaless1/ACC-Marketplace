<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppealRequest;
use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\SuspensionAppeal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppealController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Appeal');
    }

    public function store(AppealRequest $request): RedirectResponse
    {
        $user = $request->authenticate();

        if (! $user->isSuspended()) {
            throw ValidationException::withMessages([
                'email' => 'This account is not suspended, so there is nothing to appeal. You can log in normally.',
            ]);
        }

        if ($user->appeals()->where('status', 'pending')->exists()) {
            throw ValidationException::withMessages([
                'message' => 'You already have an appeal waiting for review. An administrator will get to it.',
            ]);
        }

        $cooldown = (int) config('marketplace.appeals.cooldown_days', 7);

        $recentlyDenied = $user->appeals()
            ->where('status', 'denied')
            ->where('decided_at', '>=', now()->subDays($cooldown))
            ->exists();

        if ($recentlyDenied) {
            throw ValidationException::withMessages([
                'message' => "Your last appeal was refused recently. You can appeal again {$cooldown} days after that decision.",
            ]);
        }

        $statement = trim($request->string('message')->toString());

        DB::transaction(function () use ($user, $statement) {
            SuspensionAppeal::create([
                'user_id' => $user->id,
                'message' => $statement,
                'status' => 'pending',
            ]);

            // A suspended person cannot answer reports from inside the app, so
            // the appeal doubles as their answer to every open report that still
            // has none. The admin then reads both sides on the report itself.
            Report::query()
                ->where('reported_user_id', $user->id)
                ->whereIn('status', Report::OPEN_STATUSES)
                ->whereNull('respondent_statement')
                ->get()
                ->each(function (Report $report) use ($statement, $user) {
                    $report->update([
                        'respondent_statement' => $statement,
                        'responded_at' => now(),
                    ]);

                    ReportEvent::record($report, 'responded', $user->id, 'Sent with a suspension appeal.');
                });
        });

        return redirect()
            ->route('login')
            ->with('success', 'Your appeal was sent. An administrator will review it, and the decision will show when you try to log in.');
    }
}
