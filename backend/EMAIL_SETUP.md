# Configuration Email - Réinitialisation de mot de passe

## 🔧 Configuration en développement

En mode développement, si les variables SMTP ne sont pas configurées, le système affichera le lien de réinitialisation directement dans la console du serveur au lieu d'envoyer un email.

### Exemple de sortie console :
```
📧 ============================================
📧 MODE DÉVELOPPEMENT - Email non envoyé
📧 ============================================
📧 Email: user@example.com
📧 Pseudo: monpseudo
📧 Lien de réinitialisation:
📧 http://localhost:5173/reset-password?token=abc123...
📧 ============================================
```

**Vous pouvez copier ce lien et l'utiliser directement dans votre navigateur pour tester la réinitialisation.**

## 📧 Configuration SMTP pour la production

Pour envoyer de vrais emails, vous devez configurer les variables d'environnement SMTP dans votre fichier `.env` :

### Option 1 : Gmail (recommandé pour débuter)

1. Activez l'authentification à deux facteurs sur votre compte Gmail
2. Générez un "Mot de passe d'application" :
   - Allez sur https://myaccount.google.com/apppasswords
   - Créez un mot de passe d'application pour "Mail"
   - Copiez le mot de passe généré (16 caractères)

3. Ajoutez dans votre `.env` :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
FRONTEND_URL=https://votre-domaine.com
```

### Option 2 : Autres services SMTP

#### Mailtrap (pour tests)
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre-user-mailtrap
SMTP_PASS=votre-pass-mailtrap
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=votre-api-key-sendgrid
```

#### OVH / Outlook
```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=votre-email@votre-domaine.com
SMTP_PASS=votre-mot-de-passe
```

## ✅ Vérification

Après configuration, redémarrez le serveur. Le système vérifiera automatiquement la configuration SMTP au démarrage.

Si la configuration est correcte, vous verrez dans les logs :
```
✅ Configuration SMTP validée
```

Si la configuration est manquante ou incorrecte :
```
⚠️ Configuration SMTP manquante. Les emails ne seront pas envoyés.
```

## 🚀 En production

Assurez-vous que :
1. Les variables SMTP sont définies dans votre plateforme de déploiement (Heroku, Vercel, Railway, etc.)
2. `FRONTEND_URL` pointe vers votre domaine de production
3. Le port SMTP n'est pas bloqué par un firewall

## 📝 Notes importantes

- **Sécurité** : Ne commitez jamais votre fichier `.env` avec les mots de passe
- **Gmail** : Utilisez un "Mot de passe d'application", pas votre mot de passe Gmail normal
- **Rate Limiting** : Gmail limite à 500 emails/jour pour les comptes gratuits
- **Spam** : Assurez-vous que votre domaine n'est pas blacklisté

