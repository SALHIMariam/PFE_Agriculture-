<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChangeUserRoleRequest;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Liste de tous les utilisateurs (avec filtres optionnels).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Filtres optionnels
        if ($request->filled('role')) {
            $query->role($request->role);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('farm', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->paginate($request->get('per_page', 15));

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
     * Création d'un utilisateur par l'admin.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $role = $data['role'] ?? 'farmer';
        unset($data['role']);

        $user = User::create($data);
        $user->assignRole($role);

        return response()->json([
            'message' => 'Utilisateur créé avec succès.',
            'user'    => new UserResource($user),
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
        $user->delete();

        return response()->json([
            'message' => 'Utilisateur supprimé avec succès.',
        ]);
    }

    /**
     * Activer / Désactiver un utilisateur.
     */
    public function toggleStatus(User $user): JsonResponse
    {
        $user->update(['is_active' => ! $user->is_active]);

        return response()->json([
            'message' => $user->is_active ? 'Utilisateur activé.' : 'Utilisateur désactivé.',
            'user'    => new UserResource($user),
        ]);
    }

    /**
     * Changer le rôle d'un utilisateur.
     */
    public function changeRole(ChangeUserRoleRequest $request, User $user): JsonResponse
    {
        $authUser = $request->user();
        $newRole = $request->validated('role');

        // Protection 1 : Empêcher qu'un admin retire son propre rôle admin
        if ($authUser->id === $user->id && $newRole !== 'admin') {
            return response()->json([
                'message' => 'Vous ne pouvez pas retirer votre propre rôle admin.',
            ], 422);
        }

        // Protection 2 : Empêcher la suppression du dernier admin
        if ($user->hasRole('admin') && $newRole !== 'admin') {
            $adminsCount = User::role('admin')->count();

            if ($adminsCount <= 1) {
                return response()->json([
                    'message' => 'Impossible de rétrograder le dernier administrateur.',
                ], 422);
            }
        }

        $user->syncRoles([$newRole]);

        return response()->json([
            'message' => 'Rôle mis à jour avec succès.',
            'user'    => new UserResource($user),
        ]);
    }
}
