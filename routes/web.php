<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

Route::get('/login', function () {
    return view('app');
})->name('login');

Route::get('/register', function () {
    return view('app');
})->name('register');

Route::post('/login', [AuthController::class, 'login']);

Route::post('/register', [AuthController::class, 'register']);

Route::post('/logout', [AuthController::class, 'logout']);

Route::get('/auth/user', [AuthController::class, 'user']);