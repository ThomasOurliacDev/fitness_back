# Architecture

## Vue d'ensemble du système

L'application est répartie sur **deux dépôts Git indépendants**, chacun avec son propre cycle
de déploiement :

| Dépôt | Rôle | Techno | Hébergement |
|---|---|---|---|
| `fitness_back` (celui-ci) | API REST | NestJS 11 + Prisma 7 | Render (Node natif) |
| `fitness_front` | Application web | Angular 22 (standalone + signals) | Vercel |

Base de données : **PostgreSQL** hébergée sur **Neon** (un projet Neon distinct par
environnement — voir [DEPLOYMENT.md](./DEPLOYMENT.md)), plus une instance **locale via
Docker** pour le développement (voir [LOCAL_DEV.md](./LOCAL_DEV.md)).

```
Navigateur
   │  HTTPS
   ▼
Front Angular (Vercel)
   │  HTTPS + JWT Bearer
   ▼
API NestJS (Render)
   │  TLS (sslmode=require)
   ▼
PostgreSQL (Neon)
```

Le [README.md](../README.md) à la racine du repo décrit le modèle de données métier
(Programme → Séance → Exercice → Séries) ; ce document couvre l'organisation du code et les
mécanismes transverses.

---

## Organisation du code (`src/`)

```
src/
├── main.ts                  # Bootstrap : Helmet, CORS, versioning, ValidationPipe, Swagger
├── app.module.ts             # Assemble tous les modules + providers globaux (envelope)
├── core/
│   ├── config/                # Configuration typée (lit process.env une seule fois)
│   ├── decorator/              # @CurrentUser() — extrait l'utilisateur du JWT
│   ├── filters/                 # AllExceptionsFilter — enveloppe d'erreur uniforme
│   ├── guards/                   # JwtAuthGuard
│   ├── interceptors/               # ResponseInterceptor — enveloppe de succès
│   └── middleware/
├── shared/
│   ├── prisma/                # PrismaService (fail-fast si DATABASE_URL manquant)
│   └── types/
└── modules/
    ├── auth/                  # register / login, stratégie JWT (Passport)
    ├── exercise/               # Catalogue global d'exercices (lecture)
    ├── program/                 # Programmes d'entraînement (CRUD + ownership)
    ├── workout/                   # Séances au sein d'un programme
    ├── workout-exercise/            # Pont Séance ↔ Exercice + séries planifiées + progression
    ├── workout-session/               # Exécution réelle (lancer / suivre / terminer une séance)
    └── sets/                             # Séries réellement effectuées
```

Chaque module suit le pattern NestJS standard : `*.controller.ts` (routes + guards),
`*.service.ts` (logique + accès Prisma), `dto/*.ts` (validation `class-validator`).

---

## Mécanismes transverses

### 1. L'enveloppe de réponse `{ success, data, error }`

**Toutes** les routes renvoient la même structure, succès ou échec :

```json
// Succès (200/201)
{ "success": true, "data": { ... }, "error": null }

// Échec (4xx/5xx)
{ "success": false, "data": null, "error": { "statusCode": 401, "message": "..." } }
```

Réalisé par deux providers globaux enregistrés dans `app.module.ts` :
- `ResponseInterceptor` ([core/interceptors](../src/core/interceptors)) enveloppe toute réponse réussie.
- `AllExceptionsFilter` ([core/filters](../src/core/filters)) catche **toute** exception (HTTP ou non), l'enveloppe, et **loggue les erreurs inattendues côté serveur sans jamais fuiter de détail technique au client**. Les erreurs Prisma sont logguées avec leur code (`P2021`...) et leur `meta` sur une ligne dédiée pour rester lisibles dans un viewer de logs qui replie les stacks multi-lignes (Render, entre autres).

Le front consomme ça via `.pipe(map(res => res.data))` sur chaque appel HTTP, et lit les erreurs via `err.error?.error?.message`.

### 2. Authentification

- **Inscription/connexion** : bcrypt (salt 10) pour le mot de passe, throttle 5 req/min sur `/auth/register` et `/auth/login`.
- **JWT** : payload `{ sub, id, email }` — `id` est dupliqué à côté de `sub` car `@CurrentUser('id')` le lit directement (piège historique : ne jamais retirer `id` du payload sans vérifier tous les usages de ce décorateur).
- **Expiration** : 12h (`JWT_EXPIRATION`), pas de refresh token implémenté à ce jour (`JWT_REFRESH_EXPIRATION` existe en config mais n'est pas consommé).
- **Fail-fast au démarrage** : si `JWT_SECRET` ou `DATABASE_URL` sont absents, l'application **refuse de démarrer** plutôt que de tourner dans un état invalide (`jwt.strategy.ts`, `auth.module.ts`, `prisma.service.ts`). Voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) pour l'incident réel qui a motivé ce choix.
- **Ownership** : chaque service vérifie que la ressource appartient bien à `userId` avant lecture/écriture (404 si absente, 403 si à quelqu'un d'autre) — jamais de confiance dans un ID d'URL seul.

### 3. CORS

`main.ts` lit `FRONTEND_URL` et n'autorise **que** les origines qui y figurent (variable absente → CORS totalement fermé, jamais ouvert par défaut). Elle accepte une liste séparée par des virgules :

```
FRONTEND_URL=https://fitness-front-dev.vercel.app,http://localhost:4200
```

Chaque valeur doit être une origine **complète** (schéma inclus, pas de `/` final) — c'est la source d'erreur la plus fréquente rencontrée en déploiement (voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)).

### 4. Validation

`ValidationPipe` global (`main.ts`) : `whitelist: true` + `forbidNonWhitelisted: true` — tout champ non déclaré dans un DTO fait rejeter la requête (400), aucune donnée parasite n'atteint jamais Prisma.

### 5. Sécurité HTTP

`helmet()` pose les headers standards (CSP, HSTS, nosniff, etc.) sur toutes les réponses.

---

## Modèle de données — logique de surcharge progressive

Particularité métier notable : `GET /workout-sessions/active` ne renvoie pas seulement le
template de la séance, il **calcule un objectif suggéré par série** (`workout-session.service.ts`,
méthode `withSuggestion`) :

1. Remonte jusqu'à 20 sessions terminées du même `Workout`, de la plus récente à la plus ancienne.
2. Pour chaque série du template, retrouve sa **dernière exécution réelle** (même si elle a été
   sautée lors de la dernière séance — le fallback remonte l'historique jusqu'à la trouver).
3. Règles :
   - Réussie → `+1 rep`, plafonné à `WorkoutExercise.maxReps` (configurable, défaut 12).
   - Plafond atteint → `+Exercise.weightIncrement` kg (1 par défaut, 2 pour les gros
     polyarticulaires) et retour aux reps de base.
   - Ratée → consolidation (on retente la même performance).
   - Pas d'historique ou exercice mesuré en `TIME` → objectifs du template inchangés.

Le front (`session.component.ts`) affiche cette suggestion et un badge (« +1 rep vs la dernière
séance », etc.) mais ne recalcule rien — toute la logique vit côté back, testée via des scripts
Python jetables lors de son implémentation (scénarios réussite/échec/séance écourtée).

---

## Pipeline CI/CD (résumé)

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le détail. En bref :

- `ci.yaml` : build de contrôle sur chaque PR vers `develop`/`master`.
- `deploy-backend.yml` : push sur `develop` → déploiement DEV automatique ; tag `int-*`/`prod-*`
  → déploiement INT/PROD ; applique `prisma migrate deploy` **avant** de déclencher Render.
