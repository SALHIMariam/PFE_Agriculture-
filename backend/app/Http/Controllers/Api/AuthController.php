<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Inscription
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['is_active'] = true;
        $data['name'] = $data['first_name'].' '.$data['last_name'];

        $user = User::create($data);

        // Rôle par défaut : farmer
        $user->assignRole('farmer');

        // Authentifier l'utilisateur via session
        Auth::login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => 'Inscription réussie.',
            'user'    => new UserResource($user),
        ], 201);
    }

    /**
     * Connexion
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Identifiants invalides.',
            ], 401);
        }

        $user = Auth::user();

        // Vérifier si le compte est actif
        if (! $user->is_active) {
            Auth::guard('web')->logout();

            return response()->json([
                'message' => 'Votre compte est désactivé. Contactez l\'administrateur.',
            ], 403);
        }

        // Régénérer la session (protection session fixation)
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Enregistrer l'historique de connexion
        LoginHistory::create([
            'user_id'     => $user->id,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
            'logged_in_at' => now(),
        ]);

        // Comptes Expert créés par l'admin : changement de mot de passe temporaire obligatoire.
        if ($user->must_change_password) {
            return response()->json([
                'must_change_password' => true,
                'user'                 => new UserResource($user),
            ]);
        }

        return response()->json([
            'message'     => 'Connexion réussie.',
            'user'        => new UserResource($user),
        ]);
    }

    /**
     * Déconnexion
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    /**
     * Utilisateur connecté
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }
}
