<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Votre compte Expert — Elastic Solutions</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f5; padding: 24px; color: #1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <tr>
            <td style="background-color: #40916c; padding: 24px; text-align: center;">
                <span style="color: #ffffff; font-size: 24px; font-weight: 800; font-family: Arial, sans-serif; letter-spacing: 0.5px;">Elastic Solutions</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h2 style="margin-top: 0; font-size: 18px;">Bonjour {{ $user->name }},</h2>
                <p style="font-size: 14px; line-height: 1.6;">
                    Un compte <strong>Expert</strong> a été créé pour vous sur la plateforme Elastic Solutions
                    par un administrateur. Voici vos identifiants de connexion :
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f4f6f5; border-radius: 8px;">
                    <tr>
                        <td style="padding: 16px;">
                            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>E-mail :</strong> {{ $user->email }}</p>
                            <p style="margin: 0; font-size: 14px;"><strong>Mot de passe temporaire :</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">{{ $tempPassword }}</code></p>
                        </td>
                    </tr>
                </table>

                <p style="font-size: 14px; line-height: 1.6;">
                    Pour des raisons de sécurité, un changement de mot de passe vous sera demandé
                    dès votre première connexion.
                </p>

                <div style="text-align: center; margin: 28px 0;">
                    <a href="{{ $loginUrl }}" style="background-color: #40916c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; display: inline-block;">
                        Se connecter à Elastic Solutions
                    </a>
                </div>

                <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
                    Si vous n'êtes pas à l'origine de cette demande, veuillez contacter
                    l'administrateur de la plateforme Elastic Solutions.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
