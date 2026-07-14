# Dépannage — incidents réels et comment les diagnostiquer

Ce document capitalise sur des incidents **réellement rencontrés** en mettant en place le
déploiement de ce projet. Chacun a une cause précise et un symptôme reconnaissable — les
retrouver ici devrait faire gagner l'heure qu'ils ont coûtée la première fois.

## Méthode générale : `curl` avant le navigateur

Le navigateur applique des règles de sécurité (CORS, notamment) qui **masquent** la réponse réelle
du serveur. `curl` n'a aucune de ces règles : il montre exactement ce que le serveur renvoie. Face
à une erreur réseau côté front, la première question à se poser est toujours *"est-ce que le
serveur répond correctement, et le navigateur me cache la réponse — ou le serveur répond mal ?"*
`curl` tranche en une commande, avant même d'ouvrir les devtools.

```bash
# Reproduire un preflight CORS à la main
curl -s -i -X OPTIONS https://mon-api.onrender.com/v1/auth/register \
  -H "Origin: https://mon-front.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

---

## « No event triggers defined in `on` »

**Symptôme** : GitHub rejette le workflow, aucun run ne se lance.
**Cause** : le fichier `.github/workflows/*.yml` existe mais est vide (ou son bloc `on:` est vide/mal formé).
**Fix** : vérifier que le fichier a un contenu réel ; valider la syntaxe avant de pousser :
```bash
npx --yes js-yaml .github/workflows/mon-fichier.yml > /dev/null && echo "YAML valide"
```

## `ERR_NAME_NOT_RESOLVED` sur une URL d'API

**Symptôme** : le front plante avec `POST https://api.example.com/v1/... net::ERR_NAME_NOT_RESOLVED`.
**Cause** : `api.example.com` est le **placeholder** livré par défaut dans
`src/environments/environment.*.ts` (repo front) — personne ne l'a remplacé par la vraie URL Render.
**Fix** : remplacer `apiUrl` par l'URL réelle du service dans le fichier d'environnement
correspondant, **et** vérifier que le projet Vercel build bien cette configuration (voir
« Build Vercel qui prend la mauvaise configuration » ci-dessous — c'est presque toujours les deux
à la fois).

## CORS : « contains the invalid value »

**Symptôme** :
```
Access to XMLHttpRequest ... blocked by CORS policy: Response to preflight request doesn't
pass access control check: The 'Access-Control-Allow-Origin' header contains the invalid
value 'mon-front.vercel.app'.
```
**Cause** : la variable `FRONTEND_URL` du service Render contient l'origine **sans son schéma**
(`mon-front.vercel.app` au lieu de `https://mon-front.vercel.app`). Un header
`Access-Control-Allow-Origin` doit être une origine complète — le navigateur compare caractère par
caractère avec l'origine réelle de la page, aucune tolérance.

**Vérifier ce que le serveur renvoie réellement** (sans passer par le navigateur) :
```bash
curl -s -i -X OPTIONS https://mon-api.onrender.com/v1/auth/register \
  -H "Origin: https://mon-front.vercel.app" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```
Si la valeur renvoyée ne matche pas l'origine envoyée → c'est confirmé, va corriger `FRONTEND_URL`
sur Render (dashboard → service → Environment), sauvegarde, attends « Deploy live », retest.

**Piège additionnel** : vérifier que tu navigues bien sur le **domaine stable** du projet Vercel
(`https://mon-front.vercel.app`), pas sur l'URL unique d'un déploiement précis
(`https://mon-front-a1b2c3d4-monteam.vercel.app`) — cette dernière ne matchera jamais la valeur
déclarée dans `FRONTEND_URL`.

## Build Vercel qui échoue : `Could not resolve "@angular/cdk/..."`

**Symptôme** : le job `verify` de la CI (qui fait `npm ci`) passe, mais `vercel build` échoue avec
un module introuvable, précédé dans les logs de `removed N package`.
**Cause** : une dépendance présente dans `node_modules` et le lock file, mais **absente de
`package.json`** (installée à la main un jour, jamais déclarée). `npm ci` l'installe quand même
(elle est dans le lock) → faux positif en CI. `vercel build` relance un `npm install` qui
réconcilie `node_modules` avec `package.json` → la dépendance non déclarée est retirée comme
« extraneous ».
**Fix** :
```bash
npm ls <le-paquet>              # confirme qu'il est "extraneous"
npm install <le-paquet>@<version-exacte>   # le déclare dans package.json + met à jour le lock
```
Commiter `package.json` **et** `package-lock.json`.

## Build Vercel qui prend la mauvaise configuration (`environment.prod.ts` au lieu de `.dev.ts`)

**Symptôme** : le déploiement dev appelle les URLs de prod (placeholders inclus).
**Cause** : `ng build` sans argument prend la configuration **`production`** par défaut. Si le
projet Vercel n'a pas d'override de Build Command, il lance juste `npm run build` → mauvaise config.
**Fix** : dans **chaque** projet Vercel → Settings → Build & Development → Build Command :
```
npm run build -- --configuration dev      # (ou int / production selon le projet)
```

## 500 sur `prisma.user.findUnique()` alors que la base a bien toutes les tables

**Symptôme** : la base cible a toutes les tables (vérifiées via SQL Editor Neon), mais l'API
plante en `PrismaClientKnownRequestError` à la première requête.
**Cause la plus probable** : le **nom** de la variable d'environnement contient une faute de
frappe (`DATAVASE_URL` au lieu de `DATABASE_URL` — un vrai cas rencontré). Sans `DATABASE_URL`,
le driver `pg` retombe sur des valeurs par défaut (localhost) → aucun Postgres là → crash.
**Fix** : vérifier l'**orthographe exacte** de la variable dans Render → Environment. Depuis
l'ajout du fail-fast dans `PrismaService`, ce cas précis est désormais détecté **au démarrage**
avec un message explicite (`DATABASE_URL manquant : ...`) plutôt qu'un 500 cryptique à la première
requête.
**Pour lire l'erreur complète** dans les logs Render : la ligne `ERROR [AllExceptionsFilter]` est
souvent **repliée** dans le viewer — cliquer dessus pour dérouler le détail (code Prisma, table
concernée). Le filtre logue désormais ce détail sur une ligne séparée (`Code P2021 — meta {...}`)
justement pour éviter d'avoir à déplier quoi que ce soit.

## Timeout Prisma : « Timed out trying to acquire a postgres advisory lock »

**Symptôme** : `npx prisma migrate dev`/`deploy` bloque puis échoue avec ce message.
**Cause** : une connexion précédente à la même base tenait le verrou (processus resté ouvert,
serveur de test non arrêté proprement).
**Fix** : relancer simplement la commande après quelques secondes — le verrou expire de lui-même.
Si ça persiste, chercher un process qui tourne encore contre cette base (`netstat`, serveurs de
test lancés en arrière-plan et jamais tués).

## Start Command ignorée / mauvaise version de Node sur Render

**Symptôme** : les logs de déploiement montrent `Running 'npm run start'` (mode dev) au lieu de
`start:prod`, et/ou une version de Node différente de celle attendue.
**Cause** : le service a été créé **à la main** dans le dashboard Render, donc `render.yaml` (le
Blueprint) est ignoré — seuls les réglages saisis manuellement dans le dashboard s'appliquent.
**Fix** : soit corriger manuellement Start Command (`npm run start:prod`) et `NODE_VERSION` dans
le dashboard, soit recréer le service via *New → Blueprint* pour que `render.yaml` fasse
vraiment foi (voir la note dans [DEPLOYMENT.md](./DEPLOYMENT.md)).
