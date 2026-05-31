import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateWorkoutExerciseDto } from './dto/create-workout-exercise.dto.js';

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
				// 👉 C'est ici qu'on corrige l'erreur TypeScript !
				sets: {
					create: dto.sets.map((set) => ({
						targetReps: set.targetReps,
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
}
