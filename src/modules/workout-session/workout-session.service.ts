import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto.js';

@Injectable()
export class WorkoutSessionService {
	constructor(private readonly prisma: PrismaService) {}

	async startSession(userId: string, dto: CreateWorkoutSessionDto) {
		// 1. Vérification de sécurité
		const workout = await this.prisma.workout.findUnique({
			where: { id: dto.workoutId },
			include: { program: true }
		});

		if (!workout) {
			throw new NotFoundException('Séance planifiée introuvable.');
		}

		if (workout.program.userId !== userId) {
			throw new ForbiddenException('Vous ne pouvez pas lancer une séance qui ne vous appartient pas.');
		}

		// 2. Une seule séance active à la fois
		const activeSession = await this.prisma.workoutSession.findFirst({
			where: { userId, duration: null }
		});
		if (activeSession) {
			throw new ConflictException("Une séance est déjà en cours. Termine-la avant d'en lancer une nouvelle.");
		}

		// 3. On crée la session d'entraînement active
		return this.prisma.workoutSession.create({
			data: {
				userId: userId,
				workoutId: dto.workoutId,
				date: dto.date ? new Date(dto.date) : new Date()
				// On ne met pas de "duration" ici, donc il reste à null.
				// C'est ça qui indique que la session est "En cours" !
			}
		});
	}

	async getActiveSession(userId: string) {
		// Permet au front de savoir si l'utilisateur a une séance en cours.
		// On embarque le template complet de la séance (exercices → séries planifiées)
		// et les séries déjà réalisées, pour alimenter l'écran de séance active.
		const session = await this.prisma.workoutSession.findFirst({
			where: {
				userId: userId,
				duration: null // duration à null = la séance n'est pas encore terminée
			},
			orderBy: { date: 'desc' }, // On trie sur "date"
			include: {
				workout: {
					include: {
						exercises: {
							orderBy: { order: 'asc' },
							include: {
								exercise: true,
								sets: { orderBy: { order: 'asc' } }
							}
						}
					}
				},
				sets: { orderBy: { order: 'asc' } }
			}
		});

		if (!session?.workout || !session.workoutId) return session;

		// Surcharge progressive : on remonte les dernières sessions TERMINÉES du même workout.
		// On ne se limite pas à la dernière : si une série a été sautée (séance écourtée),
		// on va chercher sa dernière exécution réelle dans les sessions plus anciennes.
		const previousSessions = await this.prisma.workoutSession.findMany({
			where: { userId, workoutId: session.workoutId, duration: { not: null } },
			orderBy: { date: 'desc' },
			take: 20, // assez d'historique pour retrouver une série sautée, sans tout charger
			include: { sets: { orderBy: { order: 'asc' } } }
		});

		// Pour chaque session (de la plus récente à la plus ancienne), séries groupées par exercice
		const historyByExercise = previousSessions.map((previous) => {
			const byExercise = new Map<string, typeof previous.sets>();
			for (const prevSet of previous.sets) {
				const list = byExercise.get(prevSet.exerciseId) ?? [];
				list.push(prevSet);
				byExercise.set(prevSet.exerciseId, list);
			}
			return byExercise;
		});

		// L'état de progression d'un exercice, calculé UNE FOIS pour tout l'exercice (pas par
		// index de série) :
		// - fullySucceeded : la dernière séance où l'exercice a été fait a-t-elle vu TOUTES
		//   ses séries validées ?
		// - lastValidatedReps/Weight : le dernier palier RÉELLEMENT VALIDÉ (série marquée
		//   réussie), en remontant l'historique si la séance la plus récente n'a validé
		//   aucune série. C'est CE palier qu'on retente en cas d'échec — pas le template
		//   d'origine, pas la performance ratée (plus basse).
		const exerciseProgressionState = (exerciseId: string) => {
			let mostRecentSets: typeof previousSessions[number]['sets'] | null = null;
			let lastValidatedReps: number | null = null;
			let lastValidatedWeight: number | null = null;

			for (const byExercise of historyByExercise) {
				const sets = byExercise.get(exerciseId);
				if (!sets || sets.length === 0) continue;

				mostRecentSets ??= sets; // uniquement la toute première séance trouvée (la plus récente)

				if (lastValidatedReps === null) {
					const validated = sets.filter((set) => set.success && set.reps != null);
					if (validated.length > 0) {
						const best = validated.reduce((a, b) => ((b.reps ?? 0) > (a.reps ?? 0) ? b : a));
						lastValidatedReps = best.reps;
						lastValidatedWeight = best.weight;
						break; // le palier validé le plus récent est trouvé, inutile de remonter plus loin
					}
				}
			}

			return {
				fullySucceededLastTime: mostRecentSets != null && mostRecentSets.every((set) => set.success),
				lastValidatedReps,
				lastValidatedWeight
			};
		};

		return {
			...session,
			workout: {
				...session.workout,
				exercises: session.workout.exercises.map((workoutExercise) => {
					const state = exerciseProgressionState(workoutExercise.exerciseId);
					return {
						...workoutExercise,
						sets: workoutExercise.sets.map((template) => this.withSuggestion(workoutExercise, template, state))
					};
				})
			}
		};
	}

	/**
	 * Calcule l'objectif suggéré d'une série (surcharge progressive), à partir du dernier
	 * palier VALIDÉ pour cet exercice (identique pour toutes ses séries) :
	 * - dernière séance entièrement réussie → +1 rep sur ce palier, plafonné à maxReps ;
	 * - plafond atteint → +exercise.weightIncrement kg et retour aux reps de base du template ;
	 * - au moins une série ratée la dernière fois → on RETENTE le dernier palier validé
	 *   (pas la performance ratée, plus basse ; pas le template d'origine) sur TOUTES les
	 *   séries de l'exercice, pour pouvoir progresser une fois ce palier confirmé ;
	 * - jamais rien validé, ou exercice au temps → objectifs du template inchangés.
	 */
	private withSuggestion(
		workoutExercise: { maxReps: number; exercise: { measure: string; weightIncrement: number } },
		template: { targetReps: number | null; targetWeight: number | null } & Record<string, unknown>,
		state: { fullySucceededLastTime: boolean; lastValidatedReps: number | null; lastValidatedWeight: number | null }
	) {
		const noSuggestion = {
			...template,
			suggestedReps: template.targetReps,
			suggestedWeight: template.targetWeight,
			progression: null as string | null
		};

		if (workoutExercise.exercise.measure === 'TIME' || state.lastValidatedReps == null) return noSuggestion;

		const { lastValidatedReps, lastValidatedWeight } = state;

		if (!state.fullySucceededLastTime) {
			// Retente le dernier palier confirmé (pas la performance ratée, plus basse)
			return { ...template, suggestedReps: lastValidatedReps, suggestedWeight: lastValidatedWeight, progression: 'KEEP' };
		}

		const nextReps = lastValidatedReps + 1;
		if (nextReps <= workoutExercise.maxReps) {
			return { ...template, suggestedReps: nextReps, suggestedWeight: lastValidatedWeight, progression: 'REPS_UP' };
		}

		// Plafond de reps atteint → on ajoute du poids et on repart des reps de base
		if (lastValidatedWeight != null) {
			return {
				...template,
				suggestedReps: template.targetReps ?? lastValidatedReps,
				suggestedWeight: lastValidatedWeight + workoutExercise.exercise.weightIncrement,
				progression: 'WEIGHT_UP'
			};
		}

		// Pas de poids (poids du corps) : on reste au plafond
		return { ...template, suggestedReps: workoutExercise.maxReps, suggestedWeight: null, progression: 'KEEP' };
	}

	async getHistory(userId: string) {
		// Les séances terminées, les plus récentes en premier. `workout` peut être null
		// si la séance planifiée a depuis été supprimée (SetNull) — c'est voulu :
		// l'historique de l'utilisateur survit à la suppression d'un programme/séance.
		return this.prisma.workoutSession.findMany({
			where: { userId, duration: { not: null } },
			orderBy: { date: 'desc' },
			take: 100,
			include: {
				workout: { select: { name: true, program: { select: { name: true } } } },
				sets: {
					orderBy: { order: 'asc' },
					include: { exercise: { select: { name: true, bodyPart: true, measure: true } } }
				}
			}
		});
	}

	async getStats(userId: string) {
		const now = Date.now();
		const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
		const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
		const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

		const finished = { userId, duration: { not: null } } as const;

		const [totalSessions, durationAgg, sessionsLast7Days, sessionsLast30Days, recentSets] = await Promise.all([
			this.prisma.workoutSession.count({ where: finished }),
			this.prisma.workoutSession.aggregate({ where: finished, _sum: { duration: true } }),
			this.prisma.workoutSession.count({ where: { ...finished, date: { gte: sevenDaysAgo } } }),
			this.prisma.workoutSession.count({ where: { ...finished, date: { gte: thirtyDaysAgo } } }),
			// Répartition par groupe musculaire : bornée aux 90 derniers jours pour rester légère
			this.prisma.set.findMany({
				where: { session: { userId, duration: { not: null }, date: { gte: ninetyDaysAgo } } },
				select: { reps: true, weight: true, exercise: { select: { bodyPart: true } } }
			})
		]);

		const bodyPartBreakdown: Record<string, number> = {};
		let totalVolume = 0;
		for (const set of recentSets) {
			bodyPartBreakdown[set.exercise.bodyPart] = (bodyPartBreakdown[set.exercise.bodyPart] ?? 0) + 1;
			if (set.reps != null && set.weight != null) {
				totalVolume += set.reps * set.weight;
			}
		}

		return {
			totalSessions,
			totalDurationSeconds: durationAgg._sum.duration ?? 0,
			sessionsLast7Days,
			sessionsLast30Days,
			totalSetsLast90Days: recentSets.length,
			totalVolumeLast90Days: totalVolume,
			bodyPartBreakdownLast90Days: bodyPartBreakdown
		};
	}

	async getLoggedExercises(userId: string) {
		// distinct() côté DB : une ligne par exercice déjà loggé par l'utilisateur,
		// peu importe le nombre de fois où il a été fait.
		const distinctSets = await this.prisma.set.findMany({
			where: { session: { userId, duration: { not: null } } },
			distinct: ['exerciseId'],
			select: { exercise: { select: { id: true, name: true, bodyPart: true, measure: true } } }
		});

		return distinctSets.map((set) => set.exercise).sort((a, b) => a.name.localeCompare(b.name));
	}

	async getExerciseProgress(userId: string, exerciseIds: string[]) {
		if (exerciseIds.length === 0) return [];

		const exercises = await this.prisma.exercise.findMany({
			where: { id: { in: exerciseIds } },
			select: { id: true, name: true, measure: true }
		});
		const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

		const sets = await this.prisma.set.findMany({
			where: { exerciseId: { in: exerciseIds }, session: { userId, duration: { not: null } } },
			select: { exerciseId: true, reps: true, weight: true, duration: true, session: { select: { id: true, date: true } } },
			orderBy: { session: { date: 'asc' } }
		});

		// Regroupe : exerciseId → sessionId → { date, sets de cet exercice dans cette session }
		const bySessionByExercise = new Map<string, Map<string, { date: Date; sets: typeof sets }>>();
		for (const set of sets) {
			const bySession = bySessionByExercise.get(set.exerciseId) ?? new Map();
			bySessionByExercise.set(set.exerciseId, bySession);

			const entry = bySession.get(set.session.id) ?? { date: set.session.date, sets: [] as typeof sets };
			entry.sets.push(set);
			bySession.set(set.session.id, entry);
		}

		// On garde l'ordre demandé par le front (celui de sa sélection) et on ignore les IDs invalides
		return exerciseIds
			.filter((id) => exerciseById.has(id))
			.map((exerciseId) => {
				const exercise = exerciseById.get(exerciseId)!;
				const sessions = Array.from(bySessionByExercise.get(exerciseId)?.values() ?? []).sort(
					(a, b) => a.date.getTime() - b.date.getTime()
				);

				const points = sessions.map(({ date, sets: sessionSets }) => {
					let maxWeight: number | null = null;
					let totalVolume = 0;
					let totalReps = 0;
					let maxDuration: number | null = null;
					let bestEstimatedOneRm: number | null = null;

					for (const set of sessionSets) {
						if (set.weight != null) {
							maxWeight = maxWeight == null ? set.weight : Math.max(maxWeight, set.weight);
						}
						if (set.reps != null) {
							totalReps += set.reps;
							if (set.weight != null) {
								totalVolume += set.reps * set.weight;
								// Formule d'Epley : estimation du 1RM à partir d'une série sous-maximale
								const estimated = set.weight * (1 + set.reps / 30);
								bestEstimatedOneRm = bestEstimatedOneRm == null ? estimated : Math.max(bestEstimatedOneRm, estimated);
							}
						}
						if (set.duration != null) {
							maxDuration = maxDuration == null ? set.duration : Math.max(maxDuration, set.duration);
						}
					}

					return {
						date: date.toISOString(),
						maxWeight,
						totalVolume: totalVolume > 0 ? totalVolume : null,
						estimatedOneRm: bestEstimatedOneRm != null ? Math.round(bestEstimatedOneRm * 10) / 10 : null,
						totalReps: totalReps > 0 ? totalReps : null,
						maxDuration
					};
				});

				return { exerciseId, exerciseName: exercise.name, measure: exercise.measure, points };
			});
	}

	async finishSession(userId: string, sessionId: string) {
		// 1. Sécurité
		const session = await this.prisma.workoutSession.findUnique({
			where: { id: sessionId }
		});

		if (!session) throw new NotFoundException("Session d'entraînement introuvable.");
		if (session.userId !== userId) throw new ForbiddenException('Action non autorisée.');
		if (session.duration !== null) throw new ConflictException('Cette séance est déjà terminée.');

		// 2. La durée est calculée côté serveur : de la date de début à maintenant
		const duration = Math.max(1, Math.floor((Date.now() - session.date.getTime()) / 1000));

		return this.prisma.workoutSession.update({
			where: { id: sessionId },
			data: { duration }
		});
	}
}
