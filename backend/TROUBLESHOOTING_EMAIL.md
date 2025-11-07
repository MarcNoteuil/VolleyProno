# 🔧 Dépannage Email - Gmail

## ❌ Problèmes courants et solutions

### 1. Erreur "EAUTH" ou "535" (Authentification échouée)

**Symptômes :**
- Code d'erreur : `EAUTH` ou `535`
- Message : "Invalid login" ou "Username and Password not accepted"

**Solutions :**

#### ✅ Solution 1 : Utiliser un mot de passe d'application Gmail

1. **Activez l'authentification à deux facteurs** (2FA) :
   - Allez sur : https://myaccount.google.com/security
   - Activez "Validation en deux étapes"

2. **Créez un mot de passe d'application** :
   - Allez sur : https://myaccount.google.com/apppasswords
   - Sélectionnez :
     - **Application** : "Mail"
     - **Appareil** : "Autre (nom personnalisé)" → tapez "VolleyProno"
   - Cliquez sur **"Générer"**
   - **Copiez les 16 caractères** (ex: `abcd efgh ijkl mnop`)

3. **Dans votre fichier `.env`** :
   ```env
   SMTP_USER=votre-email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   ```
   ⚠️ **IMPORTANT** : Supprimez tous les espaces du mot de passe (16 caractères sans espaces)

4. **Redémarrez le serveur**

#### ✅ Solution 2 : Vérifier le format du mot de passe

- Le mot de passe doit faire **exactement 16 caractères**
- **Pas d'espaces** dans le `.env`
- **Pas de guillemets** autour de la valeur
- Format correct : `SMTP_PASS=abcdefghijklmnop`
- Format incorrect : `SMTP_PASS="abcdefghijklmnop"` ou `SMTP_PASS=abcd efgh ijkl mnop`

---

### 2. Erreur "ECONNECTION" ou "ETIMEDOUT" (Connexion impossible)

**Symptômes :**
- Code d'erreur : `ECONNECTION`, `ETIMEDOUT`, ou `ESOCKET`
- Message : "Connection timeout" ou "Unable to connect"

**Solutions :**

1. **Vérifiez votre connexion internet**
2. **Vérifiez le port** :
   - Gmail utilise le port **587** (STARTTLS) ou **465** (SSL)
   - Dans votre `.env` : `SMTP_PORT=587`
3. **Vérifiez le firewall** :
   - Le port 587 doit être ouvert
   - Vérifiez que votre antivirus n'bloque pas la connexion
4. **Essayez le port 465** :
   ```env
   SMTP_PORT=465
   ```
   (Le code détectera automatiquement SSL)

---

### 3. Erreur "550" (Email invalide)

**Symptômes :**
- Code d'erreur : `550`
- Message : "Email address rejected" ou "Invalid recipient"

**Solutions :**

1. **Vérifiez que l'email existe** :
   - L'email doit être valide et existant
   - Testez avec votre propre email Gmail d'abord

2. **Vérifiez le format** :
   - Format correct : `user@gmail.com`
   - Pas d'espaces, pas de caractères spéciaux

---

### 4. Gmail bloque l'envoi (Rate limit)

**Symptômes :**
- Erreur après plusieurs envois
- Message : "Too many requests"

**Solutions :**

1. **Limite Gmail** : 500 emails/jour pour les comptes gratuits
2. **Attendez quelques heures** avant de réessayer
3. **Utilisez un autre service SMTP** pour la production (SendGrid, Mailgun, etc.)

---

## 🧪 Test de la configuration

### Étape 1 : Vérifier les logs au démarrage

Quand vous démarrez le serveur, vous devriez voir :
```
📧 Configuration SMTP:
   Host: smtp.gmail.com
   Port: 587
   User: abc***
   Pass: ***
✅ Transporteur SMTP créé avec succès
   Configuration Gmail détectée
```

Si vous voyez `NON DÉFINI`, le fichier `.env` n'est pas chargé.

### Étape 2 : Tester avec le script

```bash
cd backend
npm run test:smtp
```

Ce script va :
1. Afficher votre configuration
2. Tester la connexion SMTP
3. Envoyer un email de test
4. Afficher les erreurs détaillées

### Étape 3 : Vérifier les logs détaillés

Quand une erreur se produit, regardez la console du serveur. Vous verrez :
```
❌ Erreur détaillée lors de l'envoi de l'email:
   Code: EAUTH
   Message: Invalid login
   ResponseCode: 535
   ...
```

Ces informations vous aideront à identifier le problème exact.

---

## ✅ Checklist de configuration Gmail

- [ ] Authentification à deux facteurs activée
- [ ] Mot de passe d'application créé (16 caractères)
- [ ] Fichier `.env` créé dans `backend/`
- [ ] Variables `SMTP_USER` et `SMTP_PASS` définies
- [ ] Mot de passe sans espaces dans `.env`
- [ ] `SMTP_HOST=smtp.gmail.com`
- [ ] `SMTP_PORT=587` (ou 465)
- [ ] Serveur redémarré après modification du `.env`
- [ ] Test effectué avec `npm run test:smtp`

---

## 🔄 Alternative : Mailtrap (pour tests)

Si Gmail pose problème, utilisez Mailtrap pour tester :

1. Créez un compte gratuit : https://mailtrap.io/
2. Allez dans "Inboxes" → "SMTP Settings"
3. Copiez les identifiants dans votre `.env` :
   ```env
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=votre-user-mailtrap
   SMTP_PASS=votre-pass-mailtrap
   ```
4. Les emails apparaîtront dans votre boîte Mailtrap (pas envoyés vraiment)

---

## 📞 Besoin d'aide ?

Si le problème persiste :
1. Lancez `npm run test:smtp` et copiez tout le output
2. Vérifiez les logs du serveur au moment de l'erreur
3. Vérifiez que votre fichier `.env` est bien dans `backend/` (pas à la racine)

