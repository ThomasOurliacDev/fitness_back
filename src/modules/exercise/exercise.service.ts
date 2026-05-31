import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';

@Injectable()
export class ExerciseService {
	constructor(private readonly prisma: PrismaService) {}

	async create(dto: CreateExerciseDto) {
		return this.prisma.exercise.create({
			data: dto
		});
	}

	async findAll() {
		return this.prisma.exercise.findMany({
			orderBy: { name: 'asc' } // On les trie par ordre alphabétique pour le Front !
		});
	}
}
