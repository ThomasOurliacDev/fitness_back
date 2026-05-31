import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

		// 2. On crée la session d'entraînement active
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
		// Permet au front de savoir si l'utilisateur a une séance en cours
		return this.prisma.workoutSession.findFirst({
			where: {
				userId: userId,
				duration: null // duration à null = la séance n'est pas encore terminée
			},
			orderBy: { date: 'desc' } // On trie sur "date"
		});
	}
}
