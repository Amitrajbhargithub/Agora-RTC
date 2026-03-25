<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard', [
            'users' => \App\Models\User::where('id', '!=', auth()->id())->get()
        ]);
    })->name('dashboard');

    Route::post('/agora/create-token', [\App\Http\Controllers\Api\AgoraCallController::class, 'createToken']);
    Route::post('/agora/respond-call', [\App\Http\Controllers\Api\AgoraCallController::class, 'respondCall']);
    Route::get('/agora/poll-call', function () {
        $incoming = \App\Models\AgoraCall::where('receiver_id', auth()->id())
            ->where('status', 'pending')
            ->first();

        $outgoing = \App\Models\AgoraCall::where('sender_id', auth()->id())
            ->whereNotIn('status', ['pending'])
            ->where('updated_at', '>=', now()->subSeconds(30))
            ->latest()
            ->first();

        return response()->json([
            'incoming' => $incoming,
            'outgoing' => $outgoing
        ]);
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
