<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Meeting annulé — AgriNova</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f5; padding: 24px; color: #1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <tr>
            <td style="background-color: #dc2626; padding: 24px 32px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Meeting annulé</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #1a1a1a;">{{ $meeting->title }}</h2>
                <p style="font-size: 15px; color: #444; line-height: 1.6;">
                    Le meeting prévu le <strong>{{ $meeting->scheduled_at->format('d/m/Y à H:i') }}</strong>
                    a été annulé par {{ $meeting->creator->name }}.
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
