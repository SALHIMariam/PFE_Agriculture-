<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ExpertAccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $tempPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre compte Expert — Elastic Solutions',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.expert-account-created',
            with: [
                'user' => $this->user,
                'tempPassword' => $this->tempPassword,
                'loginUrl' => rtrim(config('app.frontend_url'), '/') . '/agrinova-login',
            ],
        );
    }
}
