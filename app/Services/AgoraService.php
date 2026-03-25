<?php

namespace App\Services;

class AgoraService
{
    private $appId;
    private $appCertificate;

    public function __construct()
    {
        $this->appId = env('AGORA_APP_ID');
        $this->appCertificate = env('AGORA_APP_CERTIFICATE');
    }

    /**
     * Generate an Agora token
     *
     * @param string $channelName
     * @param int $uid
     * @param int $role (1 for publisher, 2 for subscriber)
     * @param int $expireTimeInSeconds
     * @return string
     */
    public function generateToken($channelName, $uid = 0, $role = 1, $expireTimeInSeconds = 3600)
    {
        // Require the builder from the newly installed package
        if (class_exists('CyberDeep\LaravelAgoraTokenGenerator\Services\Token\RtcTokenBuilder2')) {
            $currentTimestamp = time();
            $privilegeExpiredTs = $currentTimestamp + $expireTimeInSeconds;

            return \CyberDeep\LaravelAgoraTokenGenerator\Services\Token\RtcTokenBuilder2::buildTokenWithUid(
                $this->appId,
                $this->appCertificate,
                $channelName,
                $uid,
                $role,
                $privilegeExpiredTs,
                $privilegeExpiredTs
            );
        }

        // Return a mock/placeholder token if the SDK is not present
        if (empty($this->appCertificate)) {
            // For testing without app certificate
            return "NO_CERTIFICATE_MOCK_TOKEN_{$channelName}";
        }
        
        return "MOCK_TOKEN_FOR_{$channelName}_" . time();
    }
}
