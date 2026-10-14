<?php

namespace App\Http\Controllers;

use App\Support\LiveStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiveController extends Controller
{
    /**
     * Tiny JSON endpoint polled in the background by the app shell.
     * It runs a handful of indexed COUNT queries instead of a whole page.
     */
    public function __invoke(Request $request): JsonResponse
    {
        return response()
            ->json(LiveStatus::all($request->user()))
            ->header('Cache-Control', 'no-store');
    }
}
