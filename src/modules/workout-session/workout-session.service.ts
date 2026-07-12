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

		// La dernière exécution réelle d'une série donnée (exercice + n° de série)
		const findPreviousSet = (exerciseId: string, setIndex: number) => {
			for (const byExercise of historyByExercise) {
				const prevSet = byExercise.get(exerciseId)?.[setIndex];
				if (prevSet) return prevSet;
			}
			return null;
		};

		return {
			...session,
			workout: {
				...session.workout,
				exercises: session.workout.exercises.map((workoutExercise) => ({
					...workoutExercise,
					sets: workoutExercise.sets.map((template, index) =>
						this.withSuggestion(workoutExercise, template, findPreviousSet(workoutExercise.exerciseId, index))
					)
				}))
			}
		};
	}

	/**
	 * Calcule l'objectif suggéré d'une série (surcharge progressive) :
	 * - série précédente réussie → +1 rep, plafonné à workoutExercise.maxReps ;
	 * - plafond atteint → +exercise.weightIncrement kg et retour aux reps de base du template ;
	 * - série ratée → on consolide (mêmes reps/poids que le réalisé précédent) ;
	 * - pas d'historique ou exercice au temps → objectifs du template inchangés.
	 */
	private withSuggestion(
		workoutExercise: { maxReps: number; exercise: { measure: string; weightIncrement: number } },
		template: { targetReps: number | null; targetWeight: number | null } & Record<string, unknown>,
		prev: { reps: number | null; weight: number | null; success: boolean } | null
	) {
		const noSuggestion = {
			...template,
			suggestedReps: template.targetReps,
			suggestedWeight: template.targetWeight,
			progression: null as string | null
		};

		if (workoutExercise.exercise.measure === 'TIME' || !prev) return noSuggestion;

		const baseReps = prev.reps ?? template.targetReps;
		const baseWeight = prev.weight ?? template.targetWeight;
		if (baseReps == null) return noSuggestion;

		// Ratée → on retente la même performance avant de progresser
		if (!prev.success) {
			return { ...template, suggestedReps: baseReps, suggestedWeight: baseWeight, progression: 'KEEP' };
		}

		const nextReps = baseReps + 1;
		if (nextReps <= workoutExercise.maxReps) {
			return { ...template, suggestedReps: nextReps, suggestedWeight: baseWeight, progression: 'REPS_UP' };
		}

		// Plafond de reps atteint → on ajoute du poids et on repart des reps de base
		if (baseWeight != null) {
			return {
				...template,
				suggestedReps: template.targetReps ?? baseReps,
				suggestedWeight: baseWeight + workoutExercise.exercise.weightIncrement,
				progression: 'WEIGHT_UP'
			};
		}

		// Pas de poids (poids du corps) : on reste au plafond
		return { ...template, suggestedReps: workoutExercise.maxReps, suggestedWeight: null, progression: 'KEEP' };
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
