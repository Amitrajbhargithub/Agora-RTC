<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgoraCall extends Model
{
    protected $fillable = [
        'sender_id',
        'receiver_id',
        'token',
        'channel_name',
        'status',
    ];
}
