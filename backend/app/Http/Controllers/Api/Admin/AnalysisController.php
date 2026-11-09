<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnalysisResource;
use App\Models\Analysis;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AnalysisController extends Controller
{
    /**
     * Liste de toutes les analyses (tous farmers, tous statuts de validation)
     * pour la vue de supervision admin.
     *
     * Filtres optionnels :
     *   ?validation_status= / ?status=  pending | validated | rejected
     *   ?search=            portion du diagnostic (predicted_class)
     *   ?farmer=            portion du nom du farmer
     *   ?confidence_min=    confiance minimale en % (0-100 → >= /100)
     *   ?confidence_max=    confiance maximale en % (0-100 → <= /100)
     *   ?date_from=         date de création minimale (YYYY-MM-DD)
     *   ?date_to=           date de création maximale (YYYY-MM-DD)
     *   ?per_page=          taille de page (défaut 20, max 100)
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Analysis::query()
            ->with(['user', 'expert', 'cnnExpert', 'recoExpert'])
            ->withCount('messages');

        // Opérateur insensible à la casse : `ilike` sur PostgreSQL (prod),
        // `like` ailleurs (sqlite en test — déjà insensible à la casse ASCII).
        $like = $query->getConnection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $status = $request->query('status', $request->query('validation_status'));
        if (in_array($status, ['pending', 'validated', 'rejected'], true)) {
            $query->where('validation_status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where('predicted_class', $like, "%{$search}%");
        }

        if ($farmer = $request->input('farmer')) {
            $query->whereHas('user', function ($q) use ($farmer, $like) {
                $q->where('name', $like, "%{$farmer}%")
                    ->orWhere('first_name', $like, "%{$farmer}%")
                    ->orWhere('last_name', $like, "%{$farmer}%");
            });
        }

        if ($request->filled('confidence_min')) {
            $query->where('confidence', '>=', (float) $request->input('confidence_min') / 100);
        }
        if ($request->filled('confidence_max')) {
            $query->where('confidence', '<=', (float) $request->input('confidence_max') / 100);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $perPage = min(max(1, (int) $request->input('per_page', 20)), 100);

        // Dernière activité en premier : la plus récente entre la soumission
        // et les validations/rejets de l'expert. Volontairement pas
        // `updated_at`, que le pré-calcul Assistant AI (CopilotService::prepare,
        // copilot:prepare-all) modifie sans aucune action de l'expert.
        $analyses = $query
            ->orderByRaw($this->lastActivityExpression($query->getConnection()->getDriverName()).' DESC')
            ->orderByDesc('id')
            ->paginate($perPage);

        return AnalysisResource::collection($analyses);
    }

    /**
     * SQL de la date de dernière activité d'une analyse. Chaque colonne
     * nullable est ramenée à created_at : GREATEST renvoie NULL sur MySQL
     * dès qu'un argument est NULL, et sqlite n'a que MAX() scalaire.
     */
    private function lastActivityExpression(string $driver): string
    {
        $columns = collect(['expert_validated_at', 'cnn_validated_at', 'reco_validated_at'])
            ->map(fn ($c) => "COALESCE(analyses.{$c}, analyses.created_at)")
            ->prepend('analyses.created_at')
            ->implode(', ');

        return $driver === 'sqlite' ? "MAX({$columns})" : "GREATEST({$columns})";
    }
}
