<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\MeetingCancellation;
use App\Mail\MeetingInvitation;
use App\Models\Meeting;
use App\Models\User;
use App\Services\GoogleCalendarService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MeetingController extends Controller
{
    public function __construct(
        private GoogleCalendarService $googleCalendar
    ) {}

    /** GET /api/meetings?from=&to= — meetings planifiés visibles au calendrier (expert + admin). */
    public function index(Request $request): JsonResponse
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = Meeting::with(['creator:id,name', 'invitees:id,name,email'])
            ->where('status', 'scheduled');

        if ($from && $to) {
            $query->whereBetween('scheduled_at', [$from.' 00:00:00', $to.' 23:59:59']);
        }

        return response()->json(['meetings' => $query->orderBy('scheduled_at')->get()]);
    }

    /** GET /api/meetings/experts — liste des experts invitables (admin uniquement). */
    public function experts(): JsonResponse
    {
        $experts = User::role('expert')->select('id', 'name', 'email')->get();

        return response()->json(['experts' => $experts]);
    }

    /** POST /api/meetings — créer un meeting et inviter des experts (admin uniquement). */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'meet_link' => ['nullable', 'url', 'max:500'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'expert_ids' => ['required', 'array', 'min:1'],
            'expert_ids.*' => ['integer', 'exists:users,id'],
            'send_now' => ['nullable', 'boolean'],
        ]);

        $experts = User::whereIn('id', $data['expert_ids'])
            ->select('id', 'email', 'name')
            ->get();

        // Priorité : lien custom > Google Meet auto > Jitsi fallback
        $meetLink = $data['meet_link'] ?? null;
        $meetSource = 'manual';

        if (! $meetLink) {
            if ($this->googleCalendar->isAuthorized()) {
                try {
                    $meetLink = $this->googleCalendar->createMeetEvent(
                        title: $data['title'],
                        description: $data['description'] ?? '',
                        scheduledAt: Carbon::parse($data['scheduled_at']),
                        durationMinutes: $data['duration_minutes'] ?? 30,
                        attendeeEmails: $experts->pluck('email')->toArray(),
                    );
                    $meetSource = 'google';
                } catch (\Exception $e) {
                    Log::warning(
                        'Google Meet auto-creation failed — falling back to Jitsi',
                        ['error' => $e->getMessage()]
                    );
                    $meetLink = $this->generateJitsiLink($data['title']);
                    $meetSource = 'jitsi';
                }
            } else {
                $meetLink = $this->generateJitsiLink($data['title']);
                $meetSource = 'jitsi';
            }
        }

        $meeting = Meeting::create([
            'created_by' => auth()->id(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'meet_link' => $meetLink,
            'scheduled_at' => $data['scheduled_at'],
            'duration_minutes' => $data['duration_minutes'] ?? 30,
        ]);

        $meeting->invitees()->attach($data['expert_ids']);

        if (!empty($data['send_now'])) {
            $this->sendInvitationEmails($meeting);
        }

        return response()->json([
            'meeting' => $meeting->load(['creator:id,name', 'invitees:id,name,email']),
            'meet_source' => $meetSource,
        ], 201);
    }

    private function generateJitsiLink(string $title): string
    {
        $slug = preg_replace('/[^a-zA-Z0-9]/', '-', $title);
        $slug = trim(preg_replace('/-+/', '-', $slug), '-');
        $slug = substr($slug, 0, 40);
        $unique = substr(md5(uniqid('', true)), 0, 8);

        return "https://meet.jit.si/AgriNova-{$slug}-{$unique}";
    }

    /** POST /api/meetings/{meeting}/send — (re)envoyer les invitations (admin uniquement). */
    public function send(Meeting $meeting): JsonResponse
    {
        $this->sendInvitationEmails($meeting);

        return response()->json([
            'message' => 'Invitations envoyées à '.$meeting->invitees->count().' expert(s).',
        ]);
    }

    /** DELETE /api/meetings/{meeting} — annuler un meeting et notifier les invités (admin uniquement). */
    public function destroy(Meeting $meeting): JsonResponse
    {
        $meeting->update(['status' => 'cancelled']);

        foreach ($meeting->invitees as $expert) {
            Mail::to($expert->email)->queue(new MeetingCancellation($meeting));
        }

        return response()->json(['message' => 'Réunion annulée.']);
    }

    private function sendInvitationEmails(Meeting $meeting): void
    {
        $meeting->loadMissing('invitees');

        foreach ($meeting->invitees as $expert) {
            Mail::to($expert->email)->queue(new MeetingInvitation($meeting));
            $meeting->invitees()->updateExistingPivot($expert->id, [
                'notified_at' => now(),
            ]);
        }

        $meeting->update(['reminder_sent' => true]);
    }
}
