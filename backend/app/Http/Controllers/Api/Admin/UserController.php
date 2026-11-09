<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Liste de tous les utilisateurs (avec filtres optionnels).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Opérateur insensible à la casse : `ilike` sur PostgreSQL (prod),
        // `like` ailleurs (sqlite en test — déjà insensible à la casse ASCII).
        $likeOperator = $query->getConnection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        // Filtres optionnels
        if ($request->filled('role')) {
            $query->role($request->role);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('governorate')) {
            $query->where('governorate', $request->input('governorate'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('name', $likeOperator, "%{$search}%")
                  ->orWhere('first_name', $likeOperator, "%{$search}%")
                  ->orWhere('last_name', $likeOperator, "%{$search}%")
                  ->orWhere('email', $likeOperator, "%{$search}%")
                  ->orWhere('farm', $likeOperator, "%{$search}%");
            });
        }

        $perPage = min(max(1, (int) $request->get('per_page', 15)), 50);
        $users = $query->latest()->paginate($perPage);

        return response()->json([
            'users' => UserResource::collection($users),
            'meta'  => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    /**
     * Détail d'un utilisateur.
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Création d'un compte Expert par l'admin.
     *
     * Le rôle est toujours `expert`, codé en dur ici — jamais déterminé par
     * une valeur envoyée par le client — afin qu'une requête forgée ne
     * puisse pas obtenir un rôle plus privilégié.
     */
    public function store(StoreUserRequest $request, EmailService $emailService): JsonResponse
    {
        $data = $request->validated();

        $tempPassword = Str::password(12);

        $user = User::create([
            ...$data,
            'password'              => $tempPassword,
            'is_active'              => true,
            'must_change_password'   => true,
        ]);

        $user->assignRole('expert');
        $user->assignRole('farmer');

        $emailSent = $emailService->sendCredentials($user, $tempPassword);

        return response()->json([
            'message'    => 'Compte Expert créé avec succès.',
            'user'       => new UserResource($user),
            'email_sent' => $emailSent,
        ], 201);
    }

    /**
     * Modification d'un utilisateur par l'admin.
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        // Ne pas écraser le mot de passe s'il n'est pas fourni
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès.',
            'user'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Suppression d'un utilisateur.
     */
    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 422);
        }

        if ($user->hasRole('admin') && User::role('admin')->count() === 1) {
            return response()->json([
                'message' => 'Impossible de supprimer le dernier administrateur.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'Utilisateur supprimé avec succès.',
        ]);
    }

    /**
     * Activer / Désactiver un compte Farmer ou Expert.
     *
     * Body : { "is_active": true|false }. Sans body, bascule l'état courant
     * (comportement historique). L'état explicite est préféré côté front :
     * il rend la requête idempotente (double clic, retry réseau).
     */
    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas modifier votre propre statut.',
            ], 422);
        }

        if ($user->hasRole('admin')) {
            return response()->json([
                'message' => "Le statut d'un compte administrateur ne peut pas être modifié.",
            ], 422);
        }

        $user->update([
            'is_active' => $validated['is_active'] ?? ! $user->is_active,
        ]);

        return response()->json([
            'message' => $user->is_active ? 'Compte activé avec succès.' : 'Compte désactivé avec succès.',
            'user'    => new UserResource($user),
        ]);
    }
}
