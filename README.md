# 🏐 VolleyProno

Application web complète de pronostics de volley-ball avec système de classement et synchronisation FFVB.

## 🚀 Fonctionnalités

- **Authentification** : Inscription/Connexion avec JWT
- **Groupes** : Création et gestion de groupes d'amis
- **Pronostics** : Prédiction des résultats de matchs
- **Classement** : Système de points et classement automatique
- **Synchronisation FFVB** : Récupération automatique des matchs officiels
- **Verrouillage** : Pronostics verrouillés 24h avant le match

## 🛠️ Stack Technique

### Backend
- **Node.js** + **TypeScript**
- **Express** (API REST)
- **Prisma** (ORM)
- **MySQL** (Base de données)
- **JWT** (Authentification)
- **Jest** (Tests)

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **TailwindCSS** (Styling)
- **Zustand** (State management)
- **React Router** (Navigation)

### DevOps
- **Docker** + **Docker Compose**
- **GitHub Actions** (CI/CD)
- **MySQL** (Base de données)

## 📦 Installation

### Prérequis
- Node.js 20+
- Docker & Docker Compose
- MySQL 8.0+

### Démarrage rapide

1. **Cloner le projet**
```bash
git clone <repository-url>
cd volleyProno
```

2. **Démarrer avec Docker**
```bash
docker compose up -d
```

3. **Initialiser la base de données**
```bash
cd backend
npm run db:generate
npm run db:push
npm run db:seed
```

4. **Accéder à l'application**
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- MySQL: localhost:3307

## 🔧 Développement

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Tests
```bash
# Backend
cd backend
npm test
npm run test:coverage

# Frontend
cd frontend
npm test
```

## 📊 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token

### Groupes
- `POST /api/groups` - Créer un groupe
- `GET /api/groups` - Lister les groupes de l'utilisateur
- `GET /api/groups/:id` - Détails d'un groupe
- `POST /api/groups/join` - Rejoindre un groupe
- `POST /api/groups/:id/regenerate-invite` - Régénérer le code d'invitation

### Matchs
- `POST /api/matches/:groupId` - Créer un match
- `GET /api/matches/:groupId` - Lister les matchs d'un groupe
- `PUT /api/matches/:id` - Mettre à jour un match
- `POST /api/matches/:groupId/sync` - Synchroniser avec FFVB

### Pronostics
- `POST /api/predictions/:matchId` - Créer/Mettre à jour un pronostic
- `GET /api/predictions/:groupId` - Pronostics de l'utilisateur
- `GET /api/predictions/match/:matchId` - Pronostics d'un match
- `POST /api/predictions/:matchId/calculate-points` - Calculer les points

### Classement
- `GET /api/ranking/:groupId` - Classement du groupe
- `GET /api/ranking/:groupId/stats` - Statistiques utilisateur

## 🎯 Système de Points

- **Score exact** : 5 points
- **Bon vainqueur** : 2 points
- **Différence correcte** : 1 point
- **Mauvais pronostic** : 0 point

## 🔄 Jobs Cron

- **Verrouillage** : Toutes les heures (24h avant le match)
- **Synchronisation FFVB** : Toutes les 2 heures
- **Calcul des points** : Toutes les heures (matchs terminés)

## 📝 Données d'exemple

Le script de seed crée :
- 4 utilisateurs de test
- 2 groupes avec membres
- 5 matchs (passés et futurs)
- Pronostics avec points calculés

### Comptes de test
- `admin@volleyprono.com` / `password123`
- `alice@example.com` / `password123`
- `bob@example.com` / `password123`
- `charlie@example.com` / `password123`

### Codes d'invitation
- Groupe 1: `PROA2024`
- Groupe 2: `LIGUEB2024`

## 🧪 Tests

### Backend
```bash
cd backend
npm test                    # Tests unitaires et intégration
npm run test:watch         # Mode watch
npm run test:coverage     # Avec couverture
```

### Frontend
```bash
cd frontend
npm test                   # Tests unitaires
npm run test:coverage     # Avec couverture
```

## 🚀 Déploiement

### Docker
```bash
docker compose up -d
```

### Variables d'environnement
```env
# Backend
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://user:password@mysql:3306/volleyprono
JWT_SECRET=your-secret-key

# Frontend
VITE_API_URL=http://localhost:4000
```

## 📋 Collection Postman

Importez la collection `postman/VolleyProno-API.postman_collection.json` pour tester l'API.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
