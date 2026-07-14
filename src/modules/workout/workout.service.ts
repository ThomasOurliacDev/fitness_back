import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateWorkoutDto } from './dto/create-workout.dto.js';

@Injectable()
export class WorkoutService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateWorkoutDto) {
		// 1. On vérifie que le programme existe ET appartient à l'utilisateur
		const program = await this.prisma.program.findUnique({
			where: { id: dto.programId }
		});

		if (!program) {
			throw new NotFoundException('Programme introuvable.');
		}

		if (program.userId !== userId) {
			throw new ForbiddenException('Vous ne pouvez pas modifier ce programme.');
		}

		// 2. C'est sécurisé, on insère la séance
		return this.prisma.workout.create({
			data: {
				name: dto.name,
				programId: dto.programId
			}
		});
	}

	async findAllByProgram(userId: string, programId: string) {
		// Vérification de sécurité optionnelle mais recommandée
		const program = await this.prisma.program.findUnique({ where: { id: programId } });
		if (!program || program.userId !== userId) {
			throw new ForbiddenException('Accès refusé à ce programme.');
		}

		return this.prisma.workout.findMany({
			where: { programId },
			include: { exercises: true } // Prépare le terrain pour la prochaine étape !
		});
	}

	async remove(userId: string, workoutId: string) {
		const workout = await this.prisma.workout.findUnique({
			where: { id: workoutId },
			include: { program: true }
		});

		if (!workout) {
			throw new NotFoundException('Séance introuvable.');
		}
		if (workout.program.userId !== userId) {
			throw new ForbiddenException('Vous ne pouvez pas supprimer cette séance.');
		}

		const activeSession = await this.prisma.workoutSession.findFirst({
			where: { workoutId, duration: null }
		});
		if (activeSession) {
			throw new ConflictException('Termine la séance en cours avant de supprimer cette séance planifiée.');
		}

		// Cascade Prisma : WorkoutExercise → SetTemplate supprimés avec.
		// Les WorkoutSession/Set déjà réalisés sont conservés (workoutId passe à null).
		await this.prisma.workout.delete({ where: { id: workoutId } });
		return { id: workoutId };
	}
}
