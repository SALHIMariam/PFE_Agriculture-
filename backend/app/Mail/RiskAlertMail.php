<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RiskAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $crop,
        public string $disease,
        public string $governorate,
        public int $riskScore,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🚨 Alerte agricole — risque élevé de ".mb_strtolower($this->disease)." ({$this->crop})",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.risk-alert',
            with: [
                'user' => $this->user,
                'crop' => $this->crop,
                'disease' => $this->disease,
                'governorate' => $this->governorate,
                'riskScore' => $this->riskScore,
                'dashboardUrl' => rtrim(config('app.frontend_url'), '/') . '/dashboard',
            ],
        );
    }
}
