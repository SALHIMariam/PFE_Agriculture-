<?php

namespace App\Services;

use Carbon\Carbon;
use Google\Client;
use GuzzleHttp\Client as GuzzleClient;
use Google\Service\Calendar;
use Google\Service\Calendar\ConferenceData;
use Google\Service\Calendar\ConferenceSolutionKey;
use Google\Service\Calendar\CreateConferenceRequest;
use Google\Service\Calendar\Event;
use Google\Service\Calendar\EventAttendee;
use Google\Service\Calendar\EventDateTime;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client();
        // Without this, a slow/unreachable Google API leaves the PHP request thread
        // blocked indefinitely (no default timeout on the underlying Guzzle client).
        $this->client->setHttpClient(new GuzzleClient(['timeout' => 10, 'connect_timeout' => 5]));
        $this->client->setApplicationName('AgriDetect');
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect_uri'));
        $this->client->addScope(Calendar::CALENDAR_EVENTS);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');
    }

    public function getAuthUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    public function handleCallback(string $code): void
    {
        $token = $this->client->fetchAccessTokenWithAuthCode($code);

        if (isset($token['error'])) {
            throw new \RuntimeException(
                'Erreur OAuth Google : '.($token['error_description'] ?? $token['error'])
            );
        }

        Cache::forever('google_calendar_token', json_encode($token));
        Log::info('Google Calendar OAuth token stored.');
    }

    public function isAuthorized(): bool
    {
        return Cache::has('google_calendar_token');
    }

    public function disconnect(): void
    {
        Cache::forget('google_calendar_token');
    }

    private function getAuthorizedClient(): Client
    {
        $tokenJson = Cache::get('google_calendar_token');

        if (! $tokenJson) {
            throw new \RuntimeException(
                'Google Calendar non autorisé. Connectez votre compte Google depuis le calendrier.'
            );
        }

        $token = json_decode($tokenJson, true);
        $this->client->setAccessToken($token);

        if ($this->client->isAccessTokenExpired()) {
            if (empty($token['refresh_token'])) {
                Cache::forget('google_calendar_token');
                throw new \RuntimeException(
                    'Session Google expirée. Veuillez reconnecter votre compte Google.'
                );
            }

            $newToken = $this->client->fetchAccessTokenWithRefreshToken(
                $token['refresh_token']
            );
            $newToken['refresh_token'] = $token['refresh_token'];
            Cache::forever('google_calendar_token', json_encode($newToken));
            $this->client->setAccessToken($newToken);
        }

        return $this->client;
    }

    /**
     * Crée un événement Google Calendar avec une salle Google Meet intégrée.
     * Retourne le lien meet.google.com/xxx-xxxx-xxx généré par Google.
     */
    public function createMeetEvent(
        string $title,
        string $description,
        Carbon $scheduledAt,
        int $durationMinutes,
        array $attendeeEmails
    ): string {
        $client = $this->getAuthorizedClient();
        $service = new Calendar($client);

        $endAt = $scheduledAt->copy()->addMinutes($durationMinutes);
        $tz = config('app.timezone', 'Africa/Tunis');

        $event = new Event([
            'summary' => $title,
            'description' => $description,
            'start' => new EventDateTime([
                'dateTime' => $scheduledAt->toRfc3339String(),
                'timeZone' => $tz,
            ]),
            'end' => new EventDateTime([
                'dateTime' => $endAt->toRfc3339String(),
                'timeZone' => $tz,
            ]),
            'attendees' => array_map(
                fn ($email) => new EventAttendee(['email' => $email]),
                $attendeeEmails
            ),
            'conferenceData' => new ConferenceData([
                'createRequest' => new CreateConferenceRequest([
                    'requestId' => uniqid('agridetect-', true),
                    'conferenceSolutionKey' => new ConferenceSolutionKey([
                        'type' => 'hangoutsMeet',
                    ]),
                ]),
            ]),
            'reminders' => [
                'useDefault' => false,
                'overrides' => [
                    ['method' => 'email', 'minutes' => 30],
                    ['method' => 'popup', 'minutes' => 15],
                ],
            ],
        ]);

        $calendarId = config('services.google.calendar_id', 'primary');
        $createdEvent = $service->events->insert(
            $calendarId,
            $event,
            ['conferenceDataVersion' => 1, 'sendUpdates' => 'all']
        );

        $entryPoints = $createdEvent->getConferenceData()?->getEntryPoints() ?? [];
        foreach ($entryPoints as $ep) {
            if ($ep->getEntryPointType() === 'video') {
                $link = $ep->getUri();
                Log::info('Google Meet created', [
                    'event_id' => $createdEvent->getId(),
                    'meet_link' => $link,
                ]);

                return $link;
            }
        }

        throw new \RuntimeException('Google Meet link was not generated by Google Calendar API.');
    }
}
