<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SettingsController;

Route::get('/', function () {
    return inertia('Home');
})->name('home');

Route::get('/login', function () {
    return inertia('Login');
})->middleware('guest')->name('login');

Route::get('/register', function () {
    return inertia('Register');
})->middleware('guest')->name('register');

Route::get('/marketplace', [MarketplaceController::class, 'index'])
    ->name('marketplace');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1');
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:10,1');
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/auth/user', [AuthController::class, 'user']);

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');
});

Route::middleware('auth')->group(function () {
    Route::get('/listings', [ListingController::class, 'index'])
        ->name('listings.index');

    Route::get('/listings/create', [ListingController::class, 'create'])
        ->name('listings.create');

    Route::post('/listings', [ListingController::class, 'store'])
        ->name('listings.store');

    Route::get('/listings/{listing}/edit', [ListingController::class, 'edit'])
        ->name('listings.edit');

    Route::put('/listings/{listing}', [ListingController::class, 'update'])
        ->name('listings.update');

    Route::delete('/listings/{listing}', [ListingController::class, 'destroy'])
        ->name('listings.destroy');

    Route::get('/listings/{listing}', [ListingController::class, 'show'])
        ->name('listings.show');

    /*
    |--------------------------------------------------------------------------
    | Messaging
    |--------------------------------------------------------------------------
    */

    Route::post('/listings/{listing}/message', [MessageController::class, 'start'])
        ->name('messages.start');

    Route::get('/messages', [MessageController::class, 'index'])
        ->name('messages.index');

    // JSON endpoints polled in the background (declared before the
    // {conversation} routes so "summary"/"list" are not treated as ids).
    Route::get('/messages/summary', [MessageController::class, 'summary'])
        ->name('messages.summary');

    Route::get('/messages/list', [MessageController::class, 'list'])
        ->name('messages.list');

    Route::get('/messages/{conversation}/poll', [MessageController::class, 'poll'])
        ->name('messages.poll');

    Route::get('/messages/{conversation}', [MessageController::class, 'show'])
        ->name('messages.show');

    Route::post('/messages/{conversation}', [MessageController::class, 'store'])
        ->name('messages.store');

    /*
    |--------------------------------------------------------------------------
    | Orders
    |--------------------------------------------------------------------------
    */

    Route::get('/orders', [OrderController::class, 'index'])
        ->name('orders.index');

    Route::post('/listings/{listing}/order', [OrderController::class, 'store'])
        ->name('orders.store');

    Route::post('/orders/{order}/message', [MessageController::class, 'startFromOrder'])
        ->name('messages.order.start');

    Route::post('/orders/{order}/confirm', [OrderController::class, 'confirm'])
        ->name('orders.confirm');

    Route::post('/orders/{order}/complete', [OrderController::class, 'complete'])
        ->name('orders.complete');

    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel'])
        ->name('orders.cancel');
    /*
    |--------------------------------------------------------------------------
    | Reviews
    |--------------------------------------------------------------------------
    */

    Route::get('/reviews', [ReviewController::class, 'index'])
        ->name('reviews.index');

    Route::post('/orders/{order}/review', [ReviewController::class, 'store'])
        ->name('reviews.store');

    Route::post('/reviews/{review}/reply', [ReviewController::class, 'reply'])
        ->name('reviews.reply');

    /*
    |--------------------------------------------------------------------------
    | Profiles & Settings
    |--------------------------------------------------------------------------
    */

    Route::get('/users/{user}', [ProfileController::class, 'show'])
        ->name('profile.show');

    Route::get('/settings', [SettingsController::class, 'edit'])
        ->name('settings.edit');

    Route::post('/settings/profile', [SettingsController::class, 'updateProfile'])
        ->name('settings.profile');

    Route::put('/settings/password', [SettingsController::class, 'updatePassword'])
        ->middleware('throttle:6,1')
        ->name('settings.password');

    /*
    |--------------------------------------------------------------------------
    | Favorites
    |--------------------------------------------------------------------------
    */

    Route::get('/favorites', [FavoriteController::class, 'index'])
        ->name('favorites.index');

    Route::post('/listings/{listing}/favorite', [FavoriteController::class, 'toggle'])
        ->name('favorites.toggle');

    /*
    |--------------------------------------------------------------------------
    | Reports
    |--------------------------------------------------------------------------
    */

    Route::post('/listings/{listing}/report', [ReportController::class, 'storeListing'])
        ->middleware('throttle:10,1')
        ->name('reports.listing');

    Route::post('/users/{user}/report', [ReportController::class, 'storeUser'])
        ->middleware('throttle:10,1')
        ->name('reports.user');

    Route::post('/orders/{order}/report', [ReportController::class, 'storeOrder'])
        ->middleware('throttle:10,1')
        ->name('reports.order');

    // Printable case file (reporter or admin).
    Route::get('/reports/{report}', [ReportController::class, 'show'])
        ->name('reports.show');
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', [AdminController::class, 'dashboard'])->name('dashboard');

        Route::get('/users', [AdminController::class, 'users'])->name('users');
        Route::post('/users/{user}/suspend', [AdminController::class, 'suspendUser'])->name('users.suspend');
        Route::post('/users/{user}/unsuspend', [AdminController::class, 'unsuspendUser'])->name('users.unsuspend');

        Route::get('/listings', [AdminController::class, 'listings'])->name('listings');
        Route::post('/listings/{listing}/hide', [AdminController::class, 'hideListing'])->name('listings.hide');
        Route::post('/listings/{listing}/restore', [AdminController::class, 'restoreListing'])->name('listings.restore');
        Route::delete('/listings/{listing}', [AdminController::class, 'destroyListing'])->name('listings.destroy');

        Route::get('/reports', [AdminController::class, 'reports'])->name('reports');
        Route::patch('/reports/{report}', [AdminController::class, 'updateReport'])->name('reports.update');
        Route::post('/reports/{report}/escalate', [AdminController::class, 'escalateReport'])->name('reports.escalate');
    });
