<?php

namespace App\Mail;

use App\Models\Meeting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MeetingInvitation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Meeting $meeting)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Invitation : {$this->meeting->title} — ".$this->meeting->scheduled_at->format('d/m/Y à H:i'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.meeting-invitation',
            with: [
                'meeting' => $this->meeting,
            ],
        );
    }
}
