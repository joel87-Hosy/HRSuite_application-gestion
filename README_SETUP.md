# HRSuite - Guide de Configuration et Déploiement

## 📋 Prérequis

- Node.js 16+
- npm ou yarn
- Git

## 🚀 Installation Locale

### Backend (Express + Turso)

1. **Accéder au dossier backend**

```bash
cd backend
npm install
```

2. **Variables d'environnement** (le fichier `.env` est déjà configuré)

```env
TURSO_DATABASE_URL=libsql://hrsuite-db-joel87-hosy.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=<your-token>
JWT_SECRET=hrsuite_jwt_secret_key_dev_2026
PORT=5000
```

3. **Lancer le serveur**

```bash
npm start
```

Le serveur écoute sur `http://localhost:5000`

### Frontend (React)

1. **Accéder au dossier frontend** (depuis la racine du projet)

```bash
cd frontend
npm install
```

2. **Variables d'environnement** (`.env.development` est créé)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

3. **Lancer l'app React**

```bash
npm start
```

L'app s'ouvre sur `http://localhost:3000`

## 🗄️ Base de Données

### Tables Turso

- `users` - Authentification (email, passwordHash, role, name)
- `employees` - Employés (13 colonnes incluant email, birthDate, phone, etc.)
- `leaves` - Demandes de congés (+ leaveType, interimName, etc.)
- `contracts` - Contrats de travail
- `payrolls` - Feuilles de paie
- `notifications` - Système de notifs

### Admin par défaut

```
Email: admin@insuite.ci
Password: password123
```

⚠️ **À changer après la première connexion!**

## 🔐 Sécurité

- JWT tokens 8h d'expiration
- Mots de passe hashés avec bcrypt (salt 8)
- CORS actif sur `localhost:3000` et production
- Rôles: admin, rh, manager, employee

## 📦 Déploiement Production

### Frontend

```bash
cd frontend
npm run build
npm run deploy  # GitHub Pages
```

### Backend (sur Render/Heroku)

1. Configurer les variables d'environnement en production
2. Déployer avec `git push`
3. Le serveur se lance automatiquement

## ⚡ Endpoints Clés

| Méthode | Route                     | Description              |
| ------- | ------------------------- | ------------------------ |
| POST    | `/api/register`           | Créer un utilisateur     |
| POST    | `/api/login`              | Connexion                |
| GET     | `/api/employees`          | Lister tous les employés |
| POST    | `/api/employees`          | Créer un employé         |
| POST    | `/api/leaves`             | Demander un congé        |
| PUT     | `/api/leaves/:id/approve` | Approuver un congé       |

## 🐛 Dépannage

**Backend ne démarre pas?**

- Vérifier que `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` sont définis
- Vérifier que le port 5000 est libre

**Frontend ne peut pas atteindre l'API?**

- Vérifier que le backend tourne sur 5000
- Vérifier `REACT_APP_API_URL` dans `.env.development`

**Erreur de base de données?**

- Les tables se créent automatiquement au démarrage
- Vérifier la connexion Turso

---

✅ Configuration complète! Prêt à développer 🚀
