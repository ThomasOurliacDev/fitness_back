# 🏋️‍♂️ Fitness App Backend API

Ce projet est une API robuste construite pour une application de suivi d'entraînement sportif. Elle sépare clairement la phase de **Planification** (création de programmes) de la phase d'**Exécution** (enregistrement des performances en salle de sport).

## 🚀 Stack Technique
- **Framework :** NestJS v11 (Architecture modulaire)
- **Environnement :** Node.js v25+ (Mode Full ESM natif)
- **Base de données :** PostgreSQL
- **ORM :** Prisma (Génération CJS/ESM)
- **Sécurité :** JWT (Passport), Rate Limiting (Throttler)
- **Documentation :** Swagger / OpenAPI

---

## 🏗️ Architecture des Données (Le Flux Métier)

L'application s'articule autour de trois grands piliers de données : le référentiel global, la planification, et l'exécution.

### 1. Le Dictionnaire Global (Référentiel)
Au centre de l'application se trouve le catalogue d'exercices. Il est indépendant des utilisateurs.
- **`Exercise`** : Le dictionnaire des mouvements (ex: "Développé Couché", "Squat"). Tous les programmes et toutes les sessions pointent vers ce référentiel.

### 2. La Planification (Templates)
C'est ici que l'utilisateur crée sa routine d'entraînement théorique.
- **`Program`** : L'enveloppe globale (ex: "Prise de masse 4 Jours"). Appartient à un `User`.
- **`Workout`** : Une journée type dans ce programme (ex: "Push Day").
- **`WorkoutExercise`** : Le pont qui relie une journée type à un exercice du dictionnaire (ex: Faire du "Développé Couché" lors du "Push Day").
- **`SetTemplate`** : L'objectif précis pour cet exercice (ex: "Série 1 : 10 reps à 80kg avec 90s de repos").

### 3. L'Exécution (Tracking Réel)
C'est ce qui se passe quand l'utilisateur est à la salle et lance son chronomètre.
- **`WorkoutSession`** : La séance réelle en cours. Elle est liée à l'utilisateur, possède une date de début, et pointe (optionnellement) vers le `Workout` planifié qu'elle cherche à accomplir. *Note : Tant que `duration` est `null`, la séance est considérée comme "En cours".*
- **`Set`** : La performance réelle validée par l'utilisateur (ex: "Aujourd'hui, je n'ai réussi à faire que 8 reps à 80kg"). Pointe vers la session en cours et vers l'exercice du dictionnaire.

---

## 🔄 Format Standard des Réponses (Enveloppe)

L'API utilise des Intercepteurs et des Filtres globaux pour garantir que le front-end reçoive **toujours** la même structure de données, facilitant ainsi la gestion des états côté client.

**✅ En cas de succès (HTTP 200 / 201) :**
```json
{
  "success": true,
  "data": { ...les_donnees_demandees... },
  "error": null
}
**❌ En cas d'erreur (HTTP 400 / 401 / 404 / etc.) :**
{
  "success": false,
  "data": null,
  "error": {
    "statusCode": 401,
    "message": "Vous ne pouvez pas modifier cette séance."
  }
}