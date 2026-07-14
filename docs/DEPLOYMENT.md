# Déploiement

## Les 3 environnements

| Environnement | Déclencheur | Branche/tag | Base Neon | Service Render |
|---|---|---|---|---|
| **DEV** | push sur `develop` (auto) | `develop` | *Fitness DEV db* | `fitness-back` |
| **INT** | tag `int-*` (ex. `int-2026.07.12`) | n'importe quelle branche | *Fitness INT db* | à créer |
| **PROD** | tag `prod-*` (ex. `prod-v1.0.0`) | n'importe quelle branche | *Fitness PROD db* | à créer |

Un tag peut être posé sur n'importe quel commit — pas seulement sur `develop`/`master` — c'est lui
qui décide de la cible, pas la branche. Un lancement manuel est aussi possible depuis
**Actions → Deploy Backend → Run workflow**, avec le choix de la cible dans un menu déroulant.

> ⚠️ **Écart connu à corriger** : [`render.yaml`](../render.yaml) déclare des services nommés
> `api-dev` / `api-int` / `api-prod`, mais le service réellement créé sur Render s'appelle
> `fitness-back` — il a été créé **à la main** dans le dashboard, pas via *New → Blueprint*, donc
> `render.yaml` n'est aujourd'hui **que de la documentation**, pas la source de vérité réelle. Pour
> que le Blueprint fasse foi (recommandé), recrée les services via *Render → New → Blueprint* en
> pointant ce repo, puis supprime les services créés manuellement. En attendant, toute modification
> de `render.yaml` doit être répercutée à la main dans le dashboard de chaque service.

---

## Le pipeline ([.github/workflows/deploy-backend.yml](../.github/workflows/deploy-backend.yml))

```
push develop ──┐
tag int-*   ────┼──▶ target (détermine dev/int/prod) ──▶ verify (build) ──▶ deploy
tag prod-*  ────┘                                                              │
workflow_dispatch ──┘                                          ┌───────────────┴────────────────┐
                                                                 │ 1. vérifie les secrets           │
                                                                 │ 2. npm ci                          │
                                                                 │ 3. prisma migrate deploy             │
                                                                 │ 4. POST vers le Deploy Hook Render     │
                                                                 └────────────────────────────────────────┘
```

Points clés :
- **`verify`** rebuild le commit exact avant tout déploiement — un commit qui ne compile pas n'est
  jamais poussé plus loin.
- **Les migrations passent AVANT Render** : le code déployé ne peut jamais rencontrer une colonne/table
  manquante. `prisma migrate deploy` est idempotent — il ne rejoue jamais une migration déjà appliquée,
  donc relancer le pipeline plusieurs fois sur la même base est sans risque.
- **`ref=$GITHUB_SHA`** est ajouté à l'appel du Deploy Hook : Render déploie **ce commit précis**
  (celui du tag), pas simplement la tête de la branche configurée sur le service.
- `concurrency` empêche deux déploiements simultanés sur le **même** environnement, sans jamais
  annuler un déploiement déjà en cours (une migration interrompue serait dangereuse).

---

## Secrets requis (GitHub → environnement `dev`/`int`/`prod`)

Chemin : repo → **Settings → Environments** → clique sur l'environnement → **Environment secrets**.

| Secret | Valeur | Où la trouver |
|---|---|---|
| `DATABASE_URL` | connection string Postgres de **cette** base Neon | Neon → le projet (*Fitness DEV/INT/PROD db*) → **Connect** → copie la chaîne complète (garder `?sslmode=require`) |
| `RENDER_DEPLOY_HOOK` | URL du Deploy Hook du service Render de **cet** env | Render → le service → **Settings** → section **Deploy Hook** |

Un secret manquant fait échouer le job `deploy` avec un message explicite (`::error::Secret ... manquant dans l'environnement « X »`) — pas de crash silencieux.

## Variables d'environnement du service Render lui-même

Distinctes des secrets GitHub ci-dessus : celles-ci sont lues **par l'application** au runtime, à
saisir dans **Render → le service → Environment** (le dashboard, pas GitHub) :

| Variable | Exemple | Remarque |
|---|---|---|
| `DATABASE_URL` | *(même valeur que le secret GitHub de cet env)* | ⚠️ nom exact — une faute de frappe (`DATAVASE_URL`) fait planter l'API à la première requête avant le fail-fast ajouté ; désormais l'app **refuse de démarrer** si absente |
| `JWT_SECRET` | chaîne aléatoire longue (`openssl rand -base64 48`) | différente par environnement ; app refuse de démarrer si absente |
| `JWT_EXPIRATION` | `12h` | |
| `FRONTEND_URL` | `https://fitness-front-dev.vercel.app` | **origine complète** : schéma inclus, pas de `/` final ; plusieurs origines séparées par des virgules acceptées |
| `NODE_VERSION` | `22` | Render utilise Node 24 par défaut sinon, différent du poste de dev et de la CI |

---

## Faire un déploiement en INT ou PROD

Une fois les services Render `api-int`/`api-prod` créés (Blueprint ou manuel) et leurs secrets
posés :

```bash
# S'assurer d'être sur le commit qu'on veut livrer (généralement develop, à jour et testé en DEV)
git checkout develop
git pull

# INT
git tag int-2026.07.12          # convention : int-AAAA.MM.JJ, ou incrémente librement
git push origin int-2026.07.12

# PROD (une fois validé en INT)
git tag prod-v1.2.0             # convention semver
git push origin prod-v1.2.0
```

Suis l'exécution dans l'onglet **Actions** du repo. Si l'environnement `prod` a la protection
**Required reviewers** activée (recommandé — voir plus bas), le job `deploy` reste en attente
jusqu'à ton approbation manuelle dans l'interface Actions.

**Première mise en service d'un environnement** : la toute première exécution sur `int`/`prod`
doit aussi peupler le catalogue d'exercices (le seed n'est pas dans le pipeline, volontairement —
il ne doit tourner qu'une fois par base) :
```bash
DATABASE_URL="<url de la base int ou prod>" npx prisma db seed
```
Le seed est idempotent (n'insère que les exercices manquants, resynchronise les existants) — sans
risque de le relancer plus tard si le catalogue évolue.

---

## Protéger la prod

Repo → **Settings → Environments → prod** → coche **Required reviewers** → ajoute-toi (ou l'équipe).
Un tag `prod-*` mettra alors le job `deploy` en pause jusqu'à un clic d'approbation explicite —
garde-fou gratuit contre un tag pressé par erreur.

## Rollback

Render conserve l'historique des déploiements par service (**Events** dans le dashboard) : un clic
sur *Rollback* sur un déploiement antérieur revient au code binaire précédent **sans toucher à la
base**. C'est pourquoi une migration doit toujours être **backward-compatible** au moins le temps
d'un cycle (voir [HOTFIX.md](./HOTFIX.md)) : si le rollback ramène l'ancien code mais que la
migration a déjà modifié le schéma, l'ancien code doit encore pouvoir tourner dessus.
