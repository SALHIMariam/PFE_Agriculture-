<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnalysisResource;
use App\Models\Analysis;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExpertAnalysisController extends Controller
{
    /**
     * Liste des analyses à traiter par l'expert. Filtre optionnel
     * ?filter=pending|validated|rejected|all (défaut : pending).
     *
     * La catégorisation combine les deux validations indépendantes (CNN et
     * recommandation) :
     * - pending   : les deux sont encore "pending"
     * - validated : les deux sont "validated"
     * - rejected  : au moins une des deux est "rejected"
     * - all       : toutes les analyses, sans filtre
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filter = $request->query('filter', 'pending');

        $analyses = Analysis::query()
            ->with(['user', 'expert', 'cnnExpert', 'recoExpert'])
            ->withCount('messages')
            ->where('status', 'done')
            ->when($filter === 'pending', function ($query) {
                $query->where('cnn_validation_status', 'pending')
                    ->where('reco_validation_status', 'pending');
            })
            ->when($filter === 'validated', function ($query) {
                $query->where('cnn_validation_status', 'validated')
                    ->where('reco_validation_status', 'validated');
            })
            ->when($filter === 'rejected', function ($query) {
                $query->where(function ($inner) {
                    $inner->where('cnn_validation_status', 'rejected')
                        ->orWhere('reco_validation_status', 'rejected');
                });
            })
            ->orderByDesc('messages_count')
            ->orderByDesc('created_at')
            ->paginate(15);

        return AnalysisResource::collection($analyses);
    }
}
