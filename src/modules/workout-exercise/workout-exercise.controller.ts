import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutExerciseService } from './workout-exercise.service.js';
import { CreateWorkoutExerciseDto } from './dto/create-workout-exercise.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorator/current-user.decorator.js';

@ApiTags('Détails des Séances (Séries & Reps)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workout-exercises', version: '1' })
export class WorkoutExerciseController {
	constructor(private readonly workoutExercisesService: WorkoutExerciseService) {}

	@Post()
	@ApiOperation({ summary: 'Ajouter un exercice avec séries/répétitions à une séance' })
	async create(@Body() dto: CreateWorkoutExerciseDto, @CurrentUser('id') userId: string) {
		return this.workoutExercisesService.create(userId, dto);
	}
}
