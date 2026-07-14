import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';

@Injectable()
export class ProgramsService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateProgramDto) {
		const response = await this.prisma.program.create({
			data: {
				name: dto.name,
				description: dto.description,
				userId: userId
			},
			select: {
				id: true,
				name: true,
				description: true,
				userId: true,
				createdAt: true,
				updatedAt: true
			}
		});
		return response;
	}

	async findAllByUser(userId: string) {
		return this.prisma.program.findMany({
			where: { userId },
			// Les séances avec le groupe musculaire de chaque exercice (léger),
			// pour que le front puisse afficher les groupes travaillés par programme
			include: {
				workouts: {
					include: {
						exercises: {
							include: {
								exercise: { select: { bodyPart: true } }
							}
						}
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		});
	}

	async findOne(userId: string, programId: string) {
		// Le programme complet : workouts → exercices (avec le détail du dictionnaire) → séries planifiées
		const program = await this.prisma.program.findUnique({
			where: { id: programId },
			include: {
				workouts: {
					include: {
						exercises: {
							orderBy: { order: 'asc' },
							include: {
								exercise: true,
								sets: { orderBy: { order: 'asc' } }
							}
						}
					}
				}
			}
		});

		if (!program) {
			throw new NotFoundException('Programme introuvable.');
		}

		if (program.userId !== userId) {
			throw new ForbiddenException('Accès refusé à ce programme.');
		}

		return program;
	}

	async remove(userId: string, programId: string) {
		const program = await this.prisma.program.findUnique({
			where: { id: programId },
			include: { workouts: { select: { id: true } } }
		});

		if (!program) {
			throw new NotFoundException('Programme introuvable.');
		}
		if (program.userId !== userId) {
			throw new ForbiddenException('Vous ne pouvez pas supprimer ce programme.');
		}

		// On refuse la suppression si une séance de ce programme est en cours d'exécution
		const workoutIds = program.workouts.map((workout) => workout.id);
		if (workoutIds.length > 0) {
			const activeSession = await this.prisma.workoutSession.findFirst({
				where: { workoutId: { in: workoutIds }, duration: null }
			});
			if (activeSession) {
				throw new ConflictException('Termine la séance en cours avant de supprimer ce programme.');
			}
		}

		// Cascade Prisma : Workout → WorkoutExercise → SetTemplate sont supprimés avec.
		// Les WorkoutSession/Set déjà réalisés sont CONSERVÉS (workoutId passe à null) :
		// l'historique de l'utilisateur ne disparaît jamais avec un programme.
		await this.prisma.program.delete({ where: { id: programId } });
		return { id: programId };
	}
}
