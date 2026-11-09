<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Invitation Meeting AgriNova</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f5; padding: 24px; color: #1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <tr>
            <td style="background-color: #1a6b4a; padding: 24px 32px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">📹 Invitation Meeting</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #1a1a1a;">{{ $meeting->title }}</h2>
                <p style="margin: 0 0 8px; font-size: 15px; color: #444; line-height: 1.6;">
                    Vous êtes invité(e) par <strong>{{ $meeting->creator->name }}</strong>
                </p>

                <table role="presentation" cellpadding="8" cellspacing="0" style="margin: 16px 0; font-size: 14px; color: #333;">
                    <tr>
                        <td style="font-weight: bold;">📅 Date</td>
                        <td>{{ $meeting->scheduled_at->format('d/m/Y') }}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">🕐 Heure</td>
                        <td>{{ $meeting->scheduled_at->format('H:i') }}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">⏱ Durée</td>
                        <td>{{ $meeting->duration_minutes }} minutes</td>
                    </tr>
                </table>

                @if($meeting->description)
                    <p style="margin: 16px 0; font-size: 14px; color: #555; line-height: 1.6;">
                        {{ $meeting->description }}
                    </p>
                @endif

                <div style="text-align: center; margin: 28px 0;">
                    <a href="{{ $meeting->meet_link }}" style="background-color: #1a6b4a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: bold; display: inline-block;">
                        Rejoindre le Google Meet
                    </a>
                </div>

                <p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
                    Lien direct : {{ $meeting->meet_link }}
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #999;">
                {{ config('app.name') }}
            </td>
        </tr>
    </table>
</body>
</html>
