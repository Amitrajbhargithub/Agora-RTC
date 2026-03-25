import React, { useState, useEffect } from 'react';
import { User, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import AgoraRTC, {
  AgoraRTCProvider,
  useRTCClient,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  useJoin,
  LocalVideoTrack,
  RemoteUser,
} from 'agora-rtc-react';

export default function VideoCallManager({ users }: { users: User[] }) {
    const { auth } = usePage<SharedData>().props;
    const currentUser = auth.user;
    
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [outgoingCall, setOutgoingCall] = useState<any>(null);
    
    const [activeCall, setActiveCall] = useState<any>(null);
    
    // Agora client
    const client = useRTCClient(AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' }));

    // Polling effect
    useEffect(() => {
        if (activeCall) return; // Don't poll if we're in a call
        
        const poll = async () => {
            try {
                const res = await axios.get('/agora/poll-call');
                
                // Handle incoming calls
                if (res.data.incoming && !incomingCall) {
                    setIncomingCall(res.data.incoming);
                } else if (!res.data.incoming && incomingCall) {
                     // Call was cancelled or answered
                     setIncomingCall(null);
                }
                
                // Handle outgoing calls (if accepted, start call)
                if (res.data.outgoing && outgoingCall && res.data.outgoing.id === outgoingCall.id) {
                    if (res.data.outgoing.status === 'accept') {
                        setActiveCall(res.data.outgoing);
                        setOutgoingCall(null);
                    } else if (res.data.outgoing.status === 'reject') {
                        alert('Call was rejected');
                        setOutgoingCall(null);
                    } else if (res.data.outgoing.status === 'cancel') {
                        setOutgoingCall(null);
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };

        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [activeCall, incomingCall, outgoingCall]);

    // UI actions
    const initiateCall = async (receiver: User) => {
        try {
            const res = await axios.post('/agora/create-token', {
                sender_id: currentUser.id,
                receiver_id: receiver.id
            });
            if (res.data.success) {
                setOutgoingCall(res.data.data);
            }
        } catch (e) {
            console.error("Failed to initiate call", e);
        }
    };

    const respondCall = async (callId: number, status: 'accept' | 'reject' | 'cancel') => {
        try {
            const res = await axios.post('/agora/respond-call', {
                call_id: callId,
                status: status
            });
            if (status === 'accept') {
                setActiveCall(incomingCall);
            }
            setIncomingCall(null);
        } catch (e) {
            console.error("Failed to respond to call", e);
        }
    };

    const cancelOutgoingCall = async () => {
        if (outgoingCall) {
             await respondCall(outgoingCall.id, 'cancel');
             setOutgoingCall(null);
        }
    }
    
    const endCall = () => {
        setActiveCall(null);
        // Also could notify backend to mark call as completed.
    }

    if (activeCall) {
        return (
            <AgoraRTCProvider client={client}>
                <CallInterface call={activeCall} onEndCall={endCall} currentUserId={currentUser.id} />
            </AgoraRTCProvider>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            {/* Incoming Call Dialog */}
            {incomingCall && (
                <div className="rounded-lg bg-blue-100 p-4 dark:bg-blue-900 border border-blue-400 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold">Incoming Video Call</h4>
                        <p>User {incomingCall.sender_id} is calling you.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => respondCall(incomingCall.id, 'accept')} className="bg-green-500 text-white px-4 py-2 rounded">Accept</button>
                        <button onClick={() => respondCall(incomingCall.id, 'reject')} className="bg-red-500 text-white px-4 py-2 rounded">Reject</button>
                    </div>
                </div>
            )}
            
            {/* Outgoing Call Dialog */}
            {outgoingCall && (
                <div className="rounded-lg bg-orange-100 p-4 dark:bg-orange-900 border border-orange-400 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold">Calling User {outgoingCall.receiver_id}...</h4>
                        <p>Waiting for them to accept.</p>
                    </div>
                    <div>
                        <button onClick={cancelOutgoingCall} className="bg-red-500 text-white px-4 py-2 rounded">Cancel</button>
                    </div>
                </div>
            )}

            {/* User List */}
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-xl font-bold mb-4">Available Users</h3>
                <div className="space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="flex justify-between items-center p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-lg border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{user.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => initiateCall(user)}
                                disabled={!!outgoingCall || !!incomingCall}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                                Call User
                            </button>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <p className="text-neutral-500 italic">No other users found. Please create another account to test calling.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Inner Component for handling the Agora Session details
function CallInterface({ call, onEndCall, currentUserId }: { call: any, onEndCall: () => void, currentUserId: number }) {
    const appId = import.meta.env.VITE_AGORA_APP_ID || "12ded9883526468d9e46cfeb4acb77e7"; 
    
    const { isLoading, error } = useJoin({
        appid: appId,
        channel: call.channel_name,
        token: call.token,
        uid: currentUserId,
    });

    const { localMicrophoneTrack } = useLocalMicrophoneTrack();
    const { localCameraTrack } = useLocalCameraTrack();
    usePublish([localMicrophoneTrack, localCameraTrack]);

    const remoteUsers = useRemoteUsers();

    if (isLoading) {
        return <div className="p-10 text-center font-bold text-xl rounded-xl bg-neutral-900 text-white">Connecting to call...</div>;
    }
    if (error) {
        return <div className="p-10 text-center text-red-500 rounded-xl bg-red-100 dark:bg-red-900 font-bold">Failed to join: {error.message}</div>;
    }

    return (
        <div className="flex flex-col rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
            <div className="p-4 bg-neutral-950 flex justify-between items-center">
                <h3 className="text-white font-bold">Video Call</h3>
                <button onClick={onEndCall} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold">End Call</button>
            </div>
            
            <div className="relative aspect-video w-full bg-neutral-900 flex overflow-hidden">
                {/* Remote Video (takes up full space if 1 person) */}
                {remoteUsers.map(user => (
                    <div key={user.uid} className="flex-1 min-w-1/2 h-full border border-neutral-800">
                        <RemoteUser user={user} cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg" />
                    </div>
                ))}
                
                {remoteUsers.length === 0 && (
                    <div className="flex w-full h-full items-center justify-center text-white p-10 font-bold text-xl">
                        Waiting for other person to connect... 
                    </div>
                )}
                
                {/* Local Video (PiP style) */}
                <div className="absolute bottom-4 right-4 w-48 aspect-video bg-black rounded-lg overflow-hidden border-2 border-neutral-700 shadow-xl z-10">
                    <LocalVideoTrack track={localCameraTrack} play={true} className="w-full h-full object-cover" />
                </div>
            </div>
        </div>
    );
}
