import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
			// On peut déjà inclure les futures séances vides pour le front
			include: { workouts: true },
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
}
