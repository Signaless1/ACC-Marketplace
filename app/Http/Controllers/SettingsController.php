<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Support\PhilippinePhone;
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

        if ($request->has('phone')) {
            $request->merge([
                'phone' => PhilippinePhone::normalize($request->input('phone'))
                    ?? $request->input('phone'),
            ]);
        }

        $validated = $request->validate([
            'name' => RegisterRequest::nameRules(),
            // Accounts that predate phone numbers can add one here. Once an
            // account has a number it cannot be blanked out.
            'phone' => [
                'sometimes',
                $user->phone ? 'required' : 'nullable',
                ...RegisterRequest::phoneRules($user->id),
            ],
            'bio' => ['nullable', 'string', 'max:500'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'remove_avatar' => ['nullable', 'boolean'],
        ], RegisterRequest::phoneMessages());

        $data = [
            'name' => $validated['name'],
            'bio' => $validated['bio'] ?? null,
        ];

        if (array_key_exists('phone', $validated) && $validated['phone'] !== null) {
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
