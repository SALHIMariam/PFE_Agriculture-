<?php

namespace App\Console\Commands;

use App\Mail\MeetingInvitation;
use App\Models\Meeting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendMeetingReminders extends Command
{
    protected $signature = 'meetings:send-reminders';

    protected $description = 'Envoie un rappel email 15 min avant chaque meeting';

    public function handle(): int
    {
        $meetings = Meeting::where('status', 'scheduled')
            ->where('reminder_sent', false)
            ->whereBetween('scheduled_at', [now(), now()->addMinutes(15)])
            ->with('invitees')
            ->get();

        foreach ($meetings as $meeting) {
            foreach ($meeting->invitees as $expert) {
                Mail::to($expert->email)->queue(new MeetingInvitation($meeting));
            }
            $meeting->update(['reminder_sent' => true]);
            $this->info("Rappel envoyé : {$meeting->title}");
        }

        $this->info("{$meetings->count()} réunion(s) rappelée(s).");

        return self::SUCCESS;
    }
}
