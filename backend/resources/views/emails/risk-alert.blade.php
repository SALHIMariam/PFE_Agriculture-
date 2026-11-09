<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Alerte agricole AgriNova</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f5; padding: 24px; color: #1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <tr>
            <td style="background-color: #b91c1c; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">🚨 ALERTE AGRICOLE</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h2 style="margin-top: 0; font-size: 18px;">Bonjour {{ $user->first_name ?: $user->name }},</h2>
                <p style="font-size: 14px; line-height: 1.6;">
                    Votre région (<strong>{{ $governorate }}</strong>) présente un risque élevé de
                    développement de :
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                    <tr>
                        <td style="padding: 16px;">
                            <p style="margin: 0 0 8px 0; font-size: 16px;"><strong>{{ $crop }} — {{ $disease }}</strong></p>
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #b91c1c;">{{ $riskScore }}% de risque</p>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Période : prochains 7 jours</p>
                        </td>
                    </tr>
                </table>

                <p style="font-size: 14px; line-height: 1.6;">
                    ⚠️ Nous vous recommandons de surveiller vos plants de près et d'envisager une
                    nouvelle analyse dans les prochains jours.
                </p>

                <div style="text-align: center; margin: 28px 0;">
                    <a href="{{ $dashboardUrl }}" style="background-color: #40916c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; display: inline-block;">
                        Voir mon tableau de bord
                    </a>
                </div>

                <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
                    Cette alerte est générée automatiquement par AgriNova à partir de vos analyses
                    récentes et des prévisions météo de votre gouvernorat.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
