# Gérer un hotfix en production

Un bug critique est constaté en **PROD** et ne peut pas attendre le prochain cycle normal
(feature → `develop` → DEV → INT → PROD). Voici le chemin le plus court et le plus sûr pour le
corriger sans embarquer du travail en cours non validé.

## Principe

Le hotfix part **du code réellement en prod** (le commit du dernier tag `prod-*`), pas de
`develop` (qui peut contenir des features non encore validées en INT). Il est ensuite **rejoué
sur `develop`** pour ne pas perdre le fix au prochain déploiement normal.

## Procédure

### 1. Identifier le commit actuellement en prod

```bash
git fetch --tags
git tag --sort=-creatordate | grep '^prod-' | head -1   # ex: prod-v1.2.0
```

### 2. Créer la branche de hotfix depuis ce tag

```bash
git checkout -b hotfix/nom-du-bug prod-v1.2.0
```

### 3. Corriger, tester localement

- Reproduis le bug en local (base Docker, voir [LOCAL_DEV.md](./LOCAL_DEV.md)) avant de coder le fix — un hotfix non reproduit localement est un hotfix qu'on corrige à l'aveugle.
- Si le fix touche le schéma Prisma : la migration doit être **backward-compatible** — le code
  actuellement en prod doit continuer de tourner pendant la fenêtre de déploiement (voir
  [DEPLOYMENT.md § Rollback](./DEPLOYMENT.md#rollback)). Concrètement : ajouter une colonne
  nullable ou avec défaut, oui ; renommer/supprimer une colonne consommée par l'ancien code, non
  (faire ça en deux temps sur deux releases si nécessaire).
- Lance `npm run build` (et les tests s'ils sont en place) avant de pousser — la CI le refera de
  toute façon, mais autant échouer vite en local.

### 4. Ouvrir une PR vers `master` (pas `develop`)

```bash
git push -u origin hotfix/nom-du-bug
```
Ouvre la PR `hotfix/nom-du-bug → master`. La CI (`ci.yaml`) tourne dessus comme sur n'importe
quelle PR. Fais-la relire même en urgence si possible — un hotfix mal revu est le scénario
classique du second incident.

### 5. Merger, tagger, déployer

```bash
git checkout master
git pull
git tag prod-v1.2.1              # incrémente le patch
git push origin prod-v1.2.1
```
Le pipeline applique la migration (si besoin) puis déploie sur Render. Si l'environnement `prod`
a la protection **Required reviewers**, approuve le déploiement dans l'onglet Actions.

Vérifie immédiatement après déploiement (logs Render + test manuel du parcours concerné) que le
fix est effectif et qu'il n'a rien cassé d'autre.

### 6. Rapporter le fix sur `develop`

Le hotfix ne doit **pas** rester isolé sur `master`, sinon il sera perdu (ou en conflit) au
prochain merge `develop → master` :

```bash
git checkout develop
git pull
git merge hotfix/nom-du-bug   # ou cherry-pick le commit précis si develop a divergé
git push
```
Ça redéclenche automatiquement un déploiement DEV — normal, c'est voulu : DEV doit refléter le fix
aussi.

### 7. Nettoyage

```bash
git branch -d hotfix/nom-du-bug
git push origin --delete hotfix/nom-du-bug
```

---

## Checklist express

- [ ] Branche créée depuis le **tag prod actuel**, pas depuis `develop`
- [ ] Bug reproduit en local avant de corriger
- [ ] Migration (si présente) backward-compatible avec le code actuellement en prod
- [ ] PR revue, CI verte
- [ ] Mergé sur `master`, nouveau tag `prod-x.y.z+1`
- [ ] Déploiement vérifié en prod (logs + test manuel)
- [ ] Fix rapporté sur `develop`
- [ ] Branche hotfix supprimée

## Cas particulier : le bug est aussi en INT

Applique le même correctif à `master` (prod) comme ci-dessus, puis si INT doit être corrigé
immédiatement aussi (et pas attendre le prochain merge `develop→INT` normal) : tag le même commit
de fix avec `int-x.y.z` en plus. Un même commit peut porter plusieurs tags.
