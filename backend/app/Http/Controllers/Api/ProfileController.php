<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Support\NotificationPreferences;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /** Languages the platform ships translations for. */
    public const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'];

    /**
     * Afficher le profil connecté
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()->load('latestLogin')),
        ]);
    }

    /**
     * Modifier le profil connecté
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json([
            'message' => 'Profil mis à jour avec succès.',
            'user'    => new UserResource($user->fresh()->load('latestLogin')),
        ]);
    }

    /**
     * Préférences de notification granulaires.
     * PUT /api/user/notification-preferences
     */
    public function updateNotificationPreferences(Request $request): JsonResponse
    {
        $known = array_merge(
            NotificationPreferences::CHANNEL_KEYS,
            NotificationPreferences::ALERT_KEYS,
        );

        $rules = ['notification_preferences' => ['required', 'array']];
        foreach ($known as $key) {
            $rules["notification_preferences.$key"] = ['sometimes', 'boolean'];
        }

        $validated = $request->validate($rules);

        $user = $request->user();
        $user->update([
            'notification_preferences' => NotificationPreferences::merge(
                $user->notification_preferences,
                $validated['notification_preferences'],
            ),
        ]);

        return response()->json([
            'message' => 'Préférences de notification enregistrées.',
            'notification_preferences' => $user->fresh()->notification_preferences,
        ]);
    }

    /**
     * Préférences générales (langue).
     * PUT /api/user/preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'language' => ['required', 'string', Rule::in(self::SUPPORTED_LANGUAGES)],
        ]);

        $user = $request->user();
        $user->update(['language' => $validated['language']]);

        return response()->json([
            'message' => 'Préférences enregistrées.',
            'user'    => new UserResource($user->fresh()->load('latestLogin')),
        ]);
    }

    /**
     * Uploader / remplacer la photo de profil.
     * POST /api/profile/avatar (multipart, champ "avatar")
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate(['avatar' => ['required', 'image', 'max:2048']]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        return response()->json(['avatar_url' => Storage::url($path)]);
    }

    /**
     * Changer le mot de passe
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
            ], 422);
        }

        $user->update(['password' => $request->password]);

        return response()->json([
            'message' => 'Mot de passe modifié avec succès.',
        ]);
    }

    /**
     * Changement de mot de passe forcé (premier login des comptes Expert).
     */
    public function forcePasswordChange(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|min:8|confirmed']);

        $user = $request->user();
        $user->update([
            'password'              => $request->password,
            'must_change_password'  => false,
        ]);

        return response()->json([
            'message' => 'Mot de passe modifié avec succès.',
            'user'    => new UserResource($user->fresh()->load('latestLogin')),
        ]);
    }
}
