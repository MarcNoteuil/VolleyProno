# 🚨 ACTIONS URGENTES - Identifiants SMTP Exposés

## ⚠️ PROBLÈME CRITIQUE

Vos identifiants SMTP ont été exposés publiquement sur GitHub dans le commit `bbd027ae`.

**Identifiants exposés :**
- Email : `noteuil.marc@gmail.com`
- Mot de passe d'application : `ymmdzfihcljxczyi`

## 🔥 ACTION IMMÉDIATE REQUISE

### 1. Révoquer le mot de passe d'application Gmail (URGENT)

1. Allez sur : https://myaccount.google.com/apppasswords
2. Trouvez le mot de passe d'application "VolleyProno" (ou similaire)
3. Cliquez sur **"Révoquer"** ou **"Supprimer"**
4. **Générez un nouveau mot de passe d'application** :
   - Application : "Mail"
   - Appareil : "VolleyProno"
   - Copiez le nouveau mot de passe (16 caractères)

### 2. Mettre à jour votre fichier `.env` local

Dans votre fichier `.env` local (qui n'est PAS sur GitHub) :

```env
SMTP_USER=noteuil.marc@gmail.com
SMTP_PASS=votre-nouveau-mot-de-passe-application
```

### 3. Nettoyer l'historique Git

Les identifiants sont toujours visibles dans l'historique Git. Vous devez les supprimer :

```bash
# Option 1 : Supprimer docker-compose.yml de l'historique (recommandé)
git filter-repo --path docker-compose.yml --invert-paths

# Option 2 : Utiliser git filter-branch (si git-filter-repo n'est pas disponible)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch docker-compose.yml" \
  --prune-empty --tag-name-filter cat -- --all

# Forcer le push (ATTENTION : réécrit l'historique)
git push origin --force --all
```

**⚠️ ATTENTION** : Cette opération réécrit l'historique Git. Tous les collaborateurs devront re-cloner le dépôt.

### 4. Vérifier que tout est propre

```bash
# Vérifier qu'aucun secret n'est dans l'historique
git log --all --source -S "ymmdzfihcljxczyi"
# Si des résultats apparaissent, les secrets sont encore dans l'historique
```

## ✅ Après avoir nettoyé

1. Vérifiez que `docker-compose.yml` est dans `.gitignore` ✅ (déjà fait)
2. Vérifiez que `.env` est dans `.gitignore` ✅ (déjà fait)
3. Ne commitez JAMAIS de fichiers avec des secrets
4. Utilisez toujours des variables d'environnement

## 📚 Guide Complet

Voir `SECURITE_PROJET_PUBLIC.md` pour un guide complet sur les bonnes pratiques de sécurité.

