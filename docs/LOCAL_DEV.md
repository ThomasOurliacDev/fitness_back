# Développement local

## Prérequis

- Node.js 22
- Docker Desktop (pour la base locale)

## Base de données

Le repo fournit un [docker-compose.yml](../docker-compose.yml) : PostgreSQL 17 dans un conteneur,
données persistées dans un volume Docker nommé (survit aux redémarrages du conteneur).

```bash
docker compose up -d      # démarre la base (Docker Desktop doit être lancé)
docker compose stop       # l'arrête (les données restent)
docker compose down -v    # supprime TOUT y compris les données — repart de zéro
```

> Port **5434**, pas 5432 : deux PostgreSQL natifs Windows (services `postgresql-x64-17` et
> `postgresql-x64-18`) occupent déjà 5432 et 5433 sur certains postes. Si `docker compose up`
> échoue avec un conflit de port, vérifie `netstat -ano | grep LISTEN | grep 543` et ajuste le
> port mappé dans `docker-compose.yml` + le `DATABASE_URL` du `.env` en conséquence.

## Configuration (`.env`)

Le `.env` contient **deux** lignes `DATABASE_URL` : une pour la base locale, une (commentée) pour
Neon dev. Décommente celle que tu veux utiliser et commente l'autre :

```bash
# --- Base LOCALE (docker compose up -d) ---
DATABASE_URL="postgresql://fitness:fitness@localhost:5434/fitness"
# --- Base Neon dev (cloud) : décommenter pour retravailler dessus ---
# DATABASE_URL="postgresql://...@ep-....neon.tech/neondb?channel_binding=require&sslmode=require"
```

Redémarre `npm run start:dev` après avoir changé cette valeur (elle n'est lue qu'au démarrage).

Les autres variables (`JWT_SECRET`, `JWT_EXPIRATION`, `FRONTEND_URL`, `PORT`) sont déjà présentes
dans le `.env` local et n'ont pas besoin d'être différentes entre base locale et base Neon dev.

## Premier démarrage (ou après un `docker compose down -v`)

```bash
npm install
npx prisma generate          # génère le client Prisma dans generated/prisma
npx prisma migrate deploy    # applique toutes les migrations existantes
npx prisma db seed           # peuple le catalogue de 47 exercices (idempotent)
npm run start:dev            # API sur http://localhost:3000, watch mode
```

## Créer une nouvelle migration

Après avoir modifié `prisma/schema.prisma` :

```bash
npx prisma migrate dev --name description_courte
```
Ça crée le fichier SQL dans `prisma/migrations/`, l'applique à la base pointée par `.env`, et
régénère le client. **Commite le dossier de migration généré** — c'est lui qui sera rejoué par
`prisma migrate deploy` sur dev/int/prod (voir [DEPLOYMENT.md](./DEPLOYMENT.md)).

> Si la commande reste bloquée sur *"Timed out trying to acquire a postgres advisory lock"* :
> une connexion précédente n'a pas été proprement fermée (serveur de test resté en arrière-plan,
> par exemple). Attends quelques secondes et relance — le verrou expire de lui-même.

## Lancer l'API en mode "build de prod" (pour reproduire un bug de déploiement)

```bash
npm run build
PORT=3001 node dist/src/main
```
C'est la commande que Render exécute réellement (`start:prod`) — utile pour distinguer un bug de
code d'un bug de configuration d'environnement.

## Tester un endpoint rapidement

```bash
# Login (récupère un token)
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"claude.test@example.com","password":"Test1234!"}'

# Appel authentifié
curl -s http://localhost:3000/v1/program -H "Authorization: Bearer <token>"
```

Swagger est aussi disponible sur `http://localhost:3000/api` en local.
