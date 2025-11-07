# 🔒 Guide de Sécurité pour Projet Public - VolleyProno

## ⚠️ PROBLÈME DÉTECTÉ : Identifiants SMTP exposés

GitGuardian a détecté que des identifiants SMTP ont été exposés dans votre dépôt public GitHub. C'est un **problème de sécurité critique** car n'importe qui peut voir et utiliser ces identifiants.

## 🚨 Pourquoi c'est dangereux ?

Si vos identifiants SMTP sont exposés publiquement :
- **N'importe qui peut envoyer des emails depuis votre compte Gmail**
- **Votre compte Gmail peut être compromis**
- **Des emails de spam peuvent être envoyés en votre nom**
- **Votre réputation peut être endommagée**

## ✅ BONNES PRATIQUES pour un Projet Public

### 1. ❌ NE JAMAIS Commiter ces fichiers :

- **`.env`** (tous les fichiers `.env*` sauf `.env.example`)
- **`docker-compose.yml`** (si il contient des secrets)
- **Fichiers avec des mots de passe, tokens, clés API**
- **Fichiers de configuration avec des secrets**

### 2. ✅ Fichiers Sûrs à Commiter :

- **`.env.example`** ou **`.env.example.txt`** (sans vraies valeurs)
- **Code source** (sans secrets hardcodés)
- **Documentation** (sans vraies valeurs)

### 3. 📝 Comment gérer les secrets ?

#### Option A : Variables d'environnement (recommandé)

**✅ BON** :
```typescript
const password = process.env.SMTP_PASS;
```

**❌ MAUVAIS** :
```typescript
const password = "ymmdzfihcljxczyi"; // JAMAIS faire ça !
```

#### Option B : Fichier `.env` (local uniquement)

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez-le au `.gitignore`
3. Ne le commitez JAMAIS

```env
# .env (local uniquement, dans .gitignore)
SMTP_HOST=smtp.gmail.com
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-secret
```

#### Option C : Variables d'environnement du serveur (production)

En production, utilisez les variables d'environnement du serveur :
- **Heroku** : Variables d'environnement dans le dashboard
- **Vercel** : Variables d'environnement dans les settings
- **Docker** : Variables d'environnement dans `docker-compose.yml` (mais pas les valeurs !)

### 4. 🔍 Vérification Avant Commit

Avant chaque commit, vérifiez :

```bash
# Vérifier qu'aucun fichier .env n'est tracké
git ls-files | grep "\.env"

# Vérifier qu'aucun secret n'est dans le code
git diff --cached | grep -i "password\|secret\|token\|api_key"

# Vérifier qu'aucun email personnel n'est hardcodé
git diff --cached | grep -i "@gmail\|@outlook"
```

### 5. 🛡️ Checklist de Sécurité

Avant de pusher sur GitHub :

- [ ] Aucun fichier `.env` n'est tracké dans Git
- [ ] Aucun mot de passe hardcodé dans le code
- [ ] Aucun token/secret dans le code source
- [ ] Les variables d'environnement sont utilisées partout
- [ ] Le fichier `.gitignore` est à jour
- [ ] Les fichiers `.env.example` ne contiennent pas de vraies valeurs

## 🔧 Actions Immédiates à Faire

### 1. Révoquer les identifiants SMTP exposés

**URGENT** : Si vos identifiants SMTP ont été exposés :

1. **Allez sur Gmail** : https://myaccount.google.com/apppasswords
2. **Révoquez le mot de passe d'application** qui a été exposé
3. **Générez un nouveau mot de passe d'application**
4. **Mettez à jour votre fichier `.env` local** avec le nouveau mot de passe

### 2. Nettoyer l'historique Git (si nécessaire)

Si les identifiants sont dans l'historique Git, vous devez les supprimer :

```bash
# Installer git-filter-repo (si pas déjà installé)
pip install git-filter-repo

# Supprimer docker-compose.yml de l'historique (si il contient des secrets)
git filter-repo --path docker-compose.yml --invert-paths

# OU supprimer un fichier .env de l'historique
git filter-repo --path .env --invert-paths

# Forcer le push (ATTENTION : réécrit l'historique)
git push origin --force --all
```

**⚠️ ATTENTION** : Cette opération réécrit l'historique Git. Tous les collaborateurs devront re-cloner le dépôt.

### 3. Vérifier que tout est propre

```bash
# Vérifier qu'aucun secret n'est dans l'historique
git log --all --source -S "ymmdzfihcljxczyi"

# Si des résultats apparaissent, les secrets sont encore dans l'historique
```

## 📚 Ressources

- **GitGuardian** : https://www.gitguardian.com/ (détection automatique de secrets)
- **OWASP Top 10** : https://owasp.org/www-project-top-ten/ (vulnérabilités courantes)
- **Git Secrets** : https://github.com/awslabs/git-secrets (prévention des secrets)

## 🆘 En Cas de Compromission

Si vos identifiants ont été compromis :

1. **Révoquez immédiatement** les identifiants exposés
2. **Changez tous les mots de passe** associés
3. **Vérifiez l'activité** de votre compte (emails envoyés, connexions suspectes)
4. **Activez l'authentification à deux facteurs** si ce n'est pas déjà fait
5. **Nettoyez l'historique Git** pour supprimer les secrets

## 💡 Conseils Généraux

- **Toujours utiliser des variables d'environnement** pour les secrets
- **Ne jamais hardcoder** de mots de passe dans le code
- **Vérifier avant chaque commit** qu'aucun secret n'est inclus
- **Utiliser des outils** comme GitGuardian pour détecter automatiquement les secrets
- **En cas de doute, ne pas commiter** le fichier

