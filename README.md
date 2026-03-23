# HRSuite Project (Prototype)

Ce dépôt contient un prototype simplifié d'un SIRH (HRSuite) avec backend Node/Express + SQLite et frontend React.

Prérequis

- Node.js 18+ (ou version LTS récente)

Démarrage

1. Backend

```powershell
cd backend
npm install
npm start
```

Le serveur écoute par défaut sur `http://localhost:5000`.

2. Frontend

```powershell
cd frontend
npm install
npm start
```

L'application frontend s'ouvre sur `http://localhost:3000`.

Comptes par défaut

- admin: `admin@insuite.ci` / `password123` (créé automatiquement si la table `users` est vide)

Notes

- Le backend utilise SQLite (`backend/data.db`).
- Pour le développement local, certains antivirus (ex: Kaspersky) peuvent injecter une feuille CSS externe et provoquer des erreurs CORS dans la console — désactivez l'extension Kaspersky ou ajoutez localhost aux exclusions si nécessaire.

Fonctionnalités incluses

- Auth (register/login) simple avec JWT
- CRUD employé (upload photo)
- Workflow congés basique (request/approve/reject)
- Endpoint de génération de paie simple (non persistant)
