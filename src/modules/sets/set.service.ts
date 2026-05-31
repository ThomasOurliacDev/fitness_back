import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateSetDto } from './dto/create-set.dto.js';

@Injectable()
export class SetService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateSetDto) {
		// 1. Sécurité : On vérifie que la session appartient bien à l'utilisateur
		const session = await this.prisma.workoutSession.findUnique({
			where: { id: dto.workoutSessionId }
		});

		if (!session) {
			throw new NotFoundException("Session d'entraînement introuvable.");
		}

		if (session.userId !== userId) {
			throw new ForbiddenException("Vous ne pouvez pas modifier la séance d'un autre utilisateur.");
		}

		// (Optionnel mais recommandé) On s'assure que la session n'est pas déjà terminée
		if (session.duration !== null) {
			throw new ForbiddenException('Cette session est déjà terminée, vous ne pouvez plus y ajouter de séries.');
		}

		// 2. On insère la vraie performance en base
		return this.prisma.set.create({
			data: {
				workoutSessionId: dto.workoutSessionId,
				exerciseId: dto.exerciseId,
				reps: dto.reps,
				weight: dto.weight,
				restTime: dto.restTime,
				order: dto.order
			}
		});
	}
}
