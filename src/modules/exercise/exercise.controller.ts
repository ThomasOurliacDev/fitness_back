import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExerciseService } from './exercise.service.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';
import { jwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';

@ApiTags('Exercices (Dictionnaire)')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard)
@Controller({ path: 'exercises', version: '1' })
export class ExerciseController {
	constructor(private readonly exercisesService: ExerciseService) {}

	@Post()
	@ApiOperation({ summary: 'Ajouter un nouvel exercice au dictionnaire global' })
	async create(@Body() dto: CreateExerciseDto) {
		// Note : Plus tard, tu pourras limiter cette route aux utilisateurs "Admin" uniquement !
		return this.exercisesService.create(dto);
	}

	@Get()
	@ApiOperation({ summary: "Récupérer tout le catalogue d'exercices" })
	async findAll() {
		return this.exercisesService.findAll();
	}
}
