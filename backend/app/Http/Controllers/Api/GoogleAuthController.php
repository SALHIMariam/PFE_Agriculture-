<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    public function __construct(
        private GoogleCalendarService $google
    ) {}

    /** GET /auth/google — redirige l'admin vers Google OAuth */
    public function redirect(): RedirectResponse
    {
        return redirect($this->google->getAuthUrl());
    }

    /** GET /api/google/auth-url — retourne l'URL OAuth Google sans rediriger (appelée en AJAX depuis le SPA). */
    public function authUrl(): JsonResponse
    {
        return response()->json([
            'url' => $this->google->getAuthUrl(),
        ]);
    }

    /**
     * GET /auth/google/callback — reçoit le code OAuth de Google.
     *
     * Ouvert dans un popup depuis le SPA (voir Calendar.tsx), donc on ne redirige pas :
     * on renvoie une page qui notifie la fenêtre parente via postMessage puis se ferme,
     * pour ne jamais faire naviguer/rafraîchir l'onglet principal (et sa session Sanctum).
     */
    public function callback(Request $request): Response
    {
        if ($request->has('error')) {
            return $this->popupCloseResponse('GOOGLE_AUTH_ERROR');
        }

        try {
            $this->google->handleCallback($request->string('code')->toString());

            return $this->popupCloseResponse('GOOGLE_AUTH_SUCCESS');
        } catch (\Exception $e) {
            Log::error('Google OAuth callback failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->popupCloseResponse('GOOGLE_AUTH_ERROR');
        }
    }

    private function popupCloseResponse(string $messageType): Response
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $type = json_encode($messageType);
        $origin = json_encode($frontendUrl);

        return response(
            "<script>
                window.opener?.postMessage({type: {$type}}, {$origin});
                window.close();
            </script>",
            200,
            ['Content-Type' => 'text/html']
        );
    }

    /** GET /api/google/status — vérifie si Google est connecté */
    public function status(): JsonResponse
    {
        return response()->json([
            'connected' => $this->google->isAuthorized(),
        ]);
    }

    /** DELETE /api/google/disconnect — déconnecter Google (admin) */
    public function disconnect(): JsonResponse
    {
        $this->google->disconnect();

        return response()->json(['message' => 'Compte Google déconnecté.']);
    }
}
