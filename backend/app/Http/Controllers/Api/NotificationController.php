<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Notification-preference key => `type` substrings it suppresses when the
     * farmer switches that preference OFF. Mirrors the 4 channel toggles kept
     * in the profile "Notifications" card, mapped onto the real
     * NotificationService type names (risk_alert, expert_reply,
     * analysis_validated/rejected, cnn_*, reco_*, …). Needles are kept specific
     * enough that "reco_*" stays owned by new_recommendations only.
     *
     * @var array<string, list<string>>
     */
    private const PREFERENCE_TYPE_FILTERS = [
        'disease_alerts' => ['alert'],
        'high_risk' => ['risk'],
        'expert_validation' => ['expert', 'analysis_valid', 'analysis_reject', 'cnn_valid', 'cnn_reject'],
        'new_recommendations' => ['reco'],
    ];

    /**
     * Catégories de la page « Toutes les notifications » => sous-chaînes de
     * `type` qu'elles regroupent.
     *
     * @var array<string, list<string>>
     */
    private const CATEGORY_TYPE_FILTERS = [
        'alerts' => ['risk', 'alert'],
        'analyses' => ['analysis', 'cnn_', 'reco_'],
        'messages' => ['message', 'reply'],
        'calendar' => ['calendar'],
    ];

    /**
     * GET /api/notifications
     *
     * Sans `page` : les 50 plus récentes (cloche du header, inchangé).
     * Avec `page` : pagination pour la page « Toutes les notifications »,
     * filtres optionnels `status=unread` et `category=alerts|analyses|messages|calendar`.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $prefs = $user->notification_preferences ?? [];

        $unreadCount = $this->applyPreferenceFilter($user->appNotifications(), $prefs)
            ->where('is_read', false)
            ->count();

        if (! $request->has('page')) {
            $notifications = $this->applyPreferenceFilter($user->appNotifications(), $prefs)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();

            return response()->json([
                'notifications' => NotificationResource::collection($notifications),
                'unread_count' => $unreadCount,
            ]);
        }

        $validated = $request->validate([
            'page' => ['integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['nullable', 'in:all,unread'],
            'category' => ['nullable', 'in:all,'.implode(',', array_keys(self::CATEGORY_TYPE_FILTERS))],
        ]);

        $query = $this->applyPreferenceFilter($user->appNotifications(), $prefs);

        if (($validated['status'] ?? 'all') === 'unread') {
            $query->where('is_read', false);
        }

        $needles = self::CATEGORY_TYPE_FILTERS[$validated['category'] ?? 'all'] ?? null;
        if ($needles) {
            $query->where(function ($q) use ($needles) {
                foreach ($needles as $needle) {
                    $q->orWhere('type', 'like', "%{$needle}%");
                }
            });
        }

        $page = $query->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20);

        return response()->json([
            'notifications' => NotificationResource::collection($page->items()),
            'unread_count' => $unreadCount,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /**
     * Hide notifications whose `type` matches a channel the user turned off.
     *
     * @param  array<string, mixed>  $prefs
     */
    private function applyPreferenceFilter(HasMany $query, array $prefs): HasMany
    {
        foreach (self::PREFERENCE_TYPE_FILTERS as $key => $needles) {
            if (($prefs[$key] ?? true) === false) {
                foreach ($needles as $needle) {
                    $query->where('type', 'not like', "%{$needle}%");
                }
            }
        }

        return $query;
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'notification' => new NotificationResource($notification),
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()
            ->appNotifications()
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues.',
        ]);
    }

    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        $notification->delete();

        return response()->json([
            'message' => 'Notification supprimée.',
        ]);
    }
}
