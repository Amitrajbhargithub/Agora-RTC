<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('agora')->group(function () {
    Route::post('/create-token', [\App\Http\Controllers\Api\AgoraCallController::class, 'createToken']);
    Route::post('/respond-call', [\App\Http\Controllers\Api\AgoraCallController::class, 'respondCall']);
});
