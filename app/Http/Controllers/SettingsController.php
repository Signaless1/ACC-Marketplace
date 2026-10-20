<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Settings/Edit');
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Same normalisation as registration: any common way of typing a
        // Philippine mobile number becomes +639XXXXXXXXX before it is checked.
        if ($request->has('phone')) {
            $typed = $request->input('phone');

            $request->merge([
                'phone' => PhoneNumber::normalize($typed) ?? (is_string($typed) ? trim($typed) : $typed),
            ]);
        }

        $validated = $request->validate([
            'name' => RegisterRequest::nameRules(),
            'bio' => ['nullable', 'string', 'max:500'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'remove_avatar' => ['nullable', 'boolean'],
            // Optional on this form so older clients keep working, but if it is
            // sent it cannot be blanked out: every account keeps a number.
            'phone' => ['sometimes', ...RegisterRequest::phoneRules($user->id)],
        ], [
            'phone.required' => 'Enter your mobile number, like 0917 123 4567.',
            'phone.unique' => 'This mobile number is already registered to another account.',
        ]);

        $data = [
            'name' => $validated['name'],
            'bio' => $validated['bio'] ?? null,
        ];

        if (array_key_exists('phone', $validated)) {
            $data['phone'] = $validated['phone'];
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $data['avatar_path'] = $request->file('avatar')->store('avatars', 'public');
        } elseif ($request->boolean('remove_avatar') && $user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $data['avatar_path'] = null;
        }

        $user->update($data);

        return back()->with('success', 'Profile updated.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => [
                'required',
                'confirmed',
                'different:current_password',
                RegisterRequest::passwordRule(),
            ],
        ]);

        $request->user()->update([
            'password' => $validated['password'],
        ]);

        // Rotate the session id after a credential change.
        $request->session()->regenerate();

        return back()->with('success', 'Password changed successfully.');
    }
}
