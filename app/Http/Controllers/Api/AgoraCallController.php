<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\AgoraService;

class AgoraCallController extends Controller
{
    protected $agoraService;

    public function __construct(AgoraService $agoraService)
    {
        $this->agoraService = $agoraService;
    }

    public function createToken(Request $request)
    {
        $request->validate([
            'sender_id' => 'required|integer',
            'receiver_id' => 'required|integer',
        ]);

        $channelName = 'channel_' . uniqid(); 
        
        $token = $this->agoraService->generateToken($channelName);

        $call = \App\Models\AgoraCall::create([
            'sender_id' => $request->sender_id,
            'receiver_id' => $request->receiver_id,
            'channel_name' => $channelName,
            'token' => $token,
            'status' => 'pending'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Token generated successfully',
            'data' => $call
        ]);
    }

    public function respondCall(Request $request)
    {
        $request->validate([
            'call_id' => 'required|exists:agora_calls,id',
            'status' => 'required|in:accept,reject,cancel'
        ]);

        $call = \App\Models\AgoraCall::findOrFail($request->call_id);
        $call->status = $request->status;
        $call->save();

        return response()->json([
            'success' => true,
            'message' => "Call status updated to {$request->status}",
            'data' => $call
        ]);
    }
}
