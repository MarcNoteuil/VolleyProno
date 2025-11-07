# 📧 Configuration Email - Guide Rapide

## 🚀 Configuration Gmail (5 minutes)

### Étape 1 : Créer un mot de passe d'application Gmail

1. Allez sur votre compte Google : https://myaccount.google.com/
2. Activez l'**authentification à deux facteurs** (2FA) si ce n'est pas déjà fait
3. Allez sur : https://myaccount.google.com/apppasswords
4. Sélectionnez :
   - **Application** : "Mail"
   - **Appareil** : "Autre (nom personnalisé)" → tapez "VolleyProno"
5. Cliquez sur **"Générer"**
6. **Copiez le mot de passe de 16 caractères** (ex: `abcd efgh ijkl mnop`)

### Étape 2 : Configurer le fichier .env

1. Dans le dossier `backend/`, créez un fichier `.env` (copiez `.env.example`)
2. Ajoutez vos informations Gmail :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**⚠️ Important** : 
- Utilisez le **mot de passe d'application** (16 caractères), pas votre mot de passe Gmail normal
- Supprimez les espaces dans le mot de passe d'application (ex: `abcdefghijklmnop`)

### Étape 3 : Redémarrer le serveur

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez-le
npm run dev
```

### Étape 4 : Tester

1. Allez sur votre site : http://localhost:5173
2. Cliquez sur "Mot de passe oublié ?"
3. Entrez votre email
4. Vérifiez votre boîte mail ! 📬

---

## 🧪 Alternative : Mailtrap (pour tests uniquement)

Mailtrap est un service gratuit qui capture les emails sans les envoyer vraiment.

1. Créez un compte gratuit : https://mailtrap.io/
2. Allez dans "Inboxes" → "SMTP Settings"
3. Copiez les identifiants dans votre `.env` :

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre-user-mailtrap
SMTP_PASS=votre-pass-mailtrap
```

4. Les emails apparaîtront dans votre boîte Mailtrap au lieu d'être envoyés

---

## ❌ Problèmes courants

### "Invalid login" ou "Authentication failed"
- ✅ Vérifiez que vous utilisez un **mot de passe d'application**, pas votre mot de passe Gmail
- ✅ Vérifiez que l'authentification à deux facteurs est activée
- ✅ Vérifiez qu'il n'y a pas d'espaces dans le mot de passe

### "Connection timeout"
- ✅ Vérifiez votre connexion internet
- ✅ Vérifiez que le port 587 n'est pas bloqué par un firewall

### "Rate limit exceeded"
- ✅ Gmail limite à 500 emails/jour pour les comptes gratuits
- ✅ Attendez quelques heures ou utilisez un autre service SMTP

---

## 🔒 Sécurité

**⚠️ IMPORTANT** : Ne commitez **JAMAIS** votre fichier `.env` sur GitHub !

Le fichier `.env` contient des mots de passe sensibles. Assurez-vous qu'il est dans `.gitignore`.

---

## 📝 Exemple de fichier .env complet

```env
# Base de données
DATABASE_URL=mysql://volley:volley@localhost:3307/volleyprono

# JWT
JWT_SECRET=mon-secret-super-securise

# Serveur
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mon-email@gmail.com
SMTP_PASS=abcdefghijklmnop
```

