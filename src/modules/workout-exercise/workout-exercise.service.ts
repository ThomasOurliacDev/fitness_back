import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateWorkoutExerciseDto } from './dto/create-workout-exercise.dto.js';
import { UpdateWorkoutExerciseDto, ReorderWorkoutExercisesDto } from './dto/update-workout-exercise.dto.js';

@Injectable()
export class WorkoutExerciseService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateWorkoutExerciseDto) {
		// 1. Vérification de sécurité (inchangée, c'est parfait)
		const workout = await this.prisma.workout.findUnique({
			where: { id: dto.workoutId },
			include: { program: true }
		});

		if (!workout) throw new NotFoundException('Séance introuvable.');
		if (workout.program.userId !== userId) throw new ForbiddenException('Action non autorisée.');

		const exercise = await this.prisma.exercise.findUnique({
			where: { id: dto.exerciseId }
		});
		if (!exercise) throw new NotFoundException("Cet exercice n'existe pas.");

		// 2. L'insertion magique imbriquée
		return this.prisma.workoutExercise.create({
			data: {
				workoutId: dto.workoutId,
				exerciseId: dto.exerciseId,
				order: dto.order,
				maxReps: dto.maxReps,
				// 👉 C'est ici qu'on corrige l'erreur TypeScript !
				sets: {
					create: dto.sets.map((set) => ({
						targetReps: set.targetReps,
						targetDuration: set.targetDuration,
						targetWeight: set.targetWeight,
						restTime: set.restTime,
						order: set.order
					}))
				}
			},
			// Optionnel : on demande à Prisma de nous renvoyer les séries fraîchement créées
			include: {
				sets: true
			}
		});
	}

	async update(userId: string, workoutExerciseId: string, dto: UpdateWorkoutExerciseDto) {
		// 1. Sécurité : l'exercice de séance doit appartenir à un programme de l'utilisateur
		const workoutExercise = await this.prisma.workoutExercise.findUnique({
			where: { id: workoutExerciseId },
			include: { workout: { include: { program: true } } }
		});

		if (!workoutExercise) throw new NotFoundException('Exercice de séance introuvable.');
		if (workoutExercise.workout.program.userId !== userId) throw new ForbiddenException('Action non autorisée.');

		if (dto.exerciseId) {
			const exercise = await this.prisma.exercise.findUnique({ where: { id: dto.exerciseId } });
			if (!exercise) throw new NotFoundException("Cet exercice n'existe pas.");
		}

		// 2. Transaction : on remplace toutes les séries si fournies, puis on met à jour l'exercice
		return this.prisma.$transaction(async (tx) => {
			if (dto.sets) {
				await tx.setTemplate.deleteMany({ where: { workoutExerciseId } });
				await tx.setTemplate.createMany({
					data: dto.sets.map((set) => ({
						workoutExerciseId,
						targetReps: set.targetReps,
						targetDuration: set.targetDuration,
						targetWeight: set.targetWeight,
						restTime: set.restTime,
						order: set.order
					}))
				});
			}

			return tx.workoutExercise.update({
				where: { id: workoutExerciseId },
				data: { exerciseId: dto.exerciseId, maxReps: dto.maxReps },
				include: {
					exercise: true,
					sets: { orderBy: { order: 'asc' } }
				}
			});
		});
	}

	async remove(userId: string, workoutExerciseId: string) {
		// 1. Sécurité : l'exercice de séance doit appartenir à un programme de l'utilisateur
		const workoutExercise = await this.prisma.workoutExercise.findUnique({
			where: { id: workoutExerciseId },
			include: { workout: { include: { program: true } } }
		});

		if (!workoutExercise) throw new NotFoundException('Exercice de séance introuvable.');
		if (workoutExercise.workout.program.userId !== userId) throw new ForbiddenException('Action non autorisée.');

		// 2. Suppression (les SetTemplate suivent en cascade), puis on resserre les ordres (1, 2, 3...)
		return this.prisma.$transaction(async (tx) => {
			await tx.workoutExercise.delete({ where: { id: workoutExerciseId } });

			const remaining = await tx.workoutExercise.findMany({
				where: { workoutId: workoutExercise.workoutId },
				orderBy: { order: 'asc' },
				select: { id: true, order: true }
			});

			for (const [index, exercise] of remaining.entries()) {
				if (exercise.order !== index + 1) {
					await tx.workoutExercise.update({ where: { id: exercise.id }, data: { order: index + 1 } });
				}
			}

			return { id: workoutExerciseId };
		});
	}

	async reorder(userId: string, dto: ReorderWorkoutExercisesDto) {
		// 1. Sécurité : la séance doit appartenir à l'utilisateur
		const workout = await this.prisma.workout.findUnique({
			where: { id: dto.workoutId },
			include: { program: true, exercises: { select: { id: true } } }
		});

		if (!workout) throw new NotFoundException('Séance introuvable.');
		if (workout.program.userId !== userId) throw new ForbiddenException('Action non autorisée.');

		// 2. La liste doit être une permutation exacte des exercices de la séance
		const existingIds = new Set(workout.exercises.map((exercise) => exercise.id));
		const uniqueIds = new Set(dto.orderedIds);
		const isPermutation =
			dto.orderedIds.length === existingIds.size &&
			uniqueIds.size === dto.orderedIds.length &&
			dto.orderedIds.every((id) => existingIds.has(id));

		if (!isPermutation) {
			throw new BadRequestException('La liste doit contenir exactement tous les exercices de la séance.');
		}

		// 3. On réécrit les ordres (1, 2, 3...) dans une transaction
		await this.prisma.$transaction(
			dto.orderedIds.map((id, index) =>
				this.prisma.workoutExercise.update({
					where: { id },
					data: { order: index + 1 }
				})
			)
		);

		return { workoutId: dto.workoutId, orderedIds: dto.orderedIds };
	}
}
