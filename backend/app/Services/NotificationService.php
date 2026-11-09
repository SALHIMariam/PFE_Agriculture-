<?php

namespace App\Services;

use App\Mail\RiskAlertMail;
use App\Models\Analysis;
use App\Models\CalendarNote;
use App\Models\Notification;
use App\Support\DiseaseLabels;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class NotificationService
{
    /**
     * Early-warning notification for a predicted disease risk in the
     * farmer's governorate over the next 7 days.
     *
     * $level is 'informative' (40-69% risk) or 'urgent' (>=70%): urgent
     * alerts also get emailed, on top of the in-app notification every
     * level gets. A mail failure is logged but never thrown — the in-app
     * notification (already saved) must not be undone by it.
     *
     * @param  array{disease: string, crop: string, governorate: string}  $forecast
     */
    public function notifyRiskAlert(User $user, array $forecast, string $level, int $riskScore): void
    {
        $crop = $forecast['crop'];
        $cropLabel = DiseaseLabels::crop($crop);
        $diseaseLabel = DiseaseLabels::disease($forecast['disease'], $crop);
        $disease = mb_strtolower($diseaseLabel)." ({$cropLabel})";

        if ($level === 'urgent') {
            $title = '🚨 Alerte agricole — risque élevé';
            $body = "Votre région présente un risque élevé de {$disease}. "
                ."Risque estimé : {$riskScore} %. Période : 7 prochains jours. "
                .'⚠️ Nous vous recommandons de surveiller vos plants.';
        } else {
            $title = '📋 Risque à surveiller';
            $body = "Un risque modéré de {$disease} est prévu dans votre région "
                ."pour les 7 prochains jours (risque estimé : {$riskScore} %).";
        }

        Notification::create([
            'user_id' => $user->id,
            'type' => 'risk_alert',
            'title' => $title,
            'body' => $body,
            'data' => [
                'disease' => $forecast['disease'],
                'crop' => $crop,
                'governorate' => $forecast['governorate'],
                'risk_score' => $riskScore,
                'level' => $level,
            ],
        ]);

        if ($level === 'urgent') {
            try {
                Mail::to($user->email)->send(new RiskAlertMail(
                    $user,
                    $cropLabel,
                    $diseaseLabel,
                    $forecast['governorate'],
                    $riskScore,
                ));
            } catch (Throwable $e) {
                Log::error("Échec de l'envoi de l'e-mail d'alerte risque.", [
                    'user_id' => $user->id,
                    'disease' => $forecast['disease'],
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function notifyExpertNewMessage(Analysis $analysis, User $sender): void
    {
        $this->notifyRole('expert', [
            'type' => 'new_message',
            'title' => "Nouveau message de {$sender->full_name}",
            'body' => "Message reçu sur l'analyse #{$analysis->id}",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerExpertReply(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'expert_reply',
            'title' => "L'expert a répondu",
            'body' => 'Nouveau message sur votre analyse',
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyExpertsNewAnalysis(Analysis $analysis): void
    {
        $farmerName = $analysis->user?->full_name ?: 'Un farmer';

        $this->notifyRole('expert', [
            'type' => 'new_analysis',
            'title' => 'Nouvelle analyse à valider',
            'body' => "{$farmerName} - {$analysis->predicted_class}",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerValidated(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'analysis_validated',
            'title' => '✓ Analyse validée',
            'body' => "L'expert a validé la recommandation IA",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerRejected(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'analysis_rejected',
            'title' => '✗ Analyse rejetée',
            'body' => "L'expert a rejeté la recommandation IA",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerCnnValidated(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'cnn_validated',
            'title' => '✓ Diagnostic validé',
            'body' => "Votre diagnostic a été validé par l'expert",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerCnnRejected(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'cnn_rejected',
            'title' => '✗ Diagnostic corrigé',
            'body' => "L'expert a corrigé votre diagnostic",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerRecoValidated(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'reco_validated',
            'title' => '✓ Recommandation validée',
            'body' => "La recommandation IA a été validée par l'expert",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    public function notifyFarmerRecoRejected(Analysis $analysis): void
    {
        Notification::create([
            'user_id' => $analysis->user_id,
            'type' => 'reco_rejected',
            'title' => '✗ Recommandation rejetée',
            'body' => "L'expert a rejeté la recommandation IA",
            'data' => ['analysis_id' => $analysis->id],
        ]);
    }

    /**
     * A calendar note was added — notify every admin and expert except its
     * author. A failure here is logged, never thrown: the note has already
     * been saved and storeNote must still return 201.
     */
    public function notifyCalendarNote(CalendarNote $note, User $author): void
    {
        try {
            $notePreview = Str::limit($note->content, 60);

            $recipients = User::role(['admin', 'expert'])->get()
                ->filter(fn (User $u) => $u->id !== $author->id);

            foreach ($recipients as $recipient) {
                Notification::create([
                    'user_id' => $recipient->id,
                    'type' => 'calendar_note',
                    'title' => '📅 Nouvelle note calendrier',
                    'body' => "\"{$notePreview}\" — par {$author->full_name}",
                    'data' => [
                        'note_id' => $note->id,
                        'date' => $note->date->format('Y-m-d'),
                        'author_id' => $author->id,
                        'author_name' => $author->full_name,
                    ],
                    'is_read' => false,
                ]);
            }
        } catch (Throwable $e) {
            Log::error('Échec de la création des notifications de note calendrier.', [
                'note_id' => $note->id,
                'author_id' => $author->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array{type:string,title:string,body:string,data:array}  $payload
     */
    private function notifyRole(string $role, array $payload): void
    {
        foreach (User::role($role)->get() as $recipient) {
            Notification::create([
                'user_id' => $recipient->id,
                ...$payload,
            ]);
        }
    }
}
