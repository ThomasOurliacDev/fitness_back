import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';

@Injectable()
export class ProgramsService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateProgramDto) {
		return this.prisma.program.create({
			data: {
				name: dto.name,
				description: dto.description,
				userId: userId
			}
		});
	}

	async findAllByUser(userId: string) {
		return this.prisma.program.findMany({
			where: { userId },
			// On peut déjà inclure les futures séances vides pour le front
			include: { workouts: true },
			orderBy: { createdAt: 'desc' }
		});
	}
}
