import { Controller, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WorkoutExerciseService } from './workout-exercise.service.js';
import { CreateWorkoutExerciseDto } from './dto/create-workout-exercise.dto.js';
import { UpdateWorkoutExerciseDto, ReorderWorkoutExercisesDto } from './dto/update-workout-exercise.dto.js';
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

	// ⚠️ Doit être déclaré AVANT ':id' pour ne pas être capturé par cette route
	@Patch('reorder')
	@ApiOperation({ summary: "Réordonner les exercices d'une séance" })
	async reorder(@Body() dto: ReorderWorkoutExercisesDto, @CurrentUser('id') userId: string) {
		return this.workoutExercisesService.reorder(userId, dto);
	}

	@Patch(':id')
	@ApiOperation({ summary: "Modifier un exercice d'une séance (exercice et/ou séries)" })
	@ApiParam({ name: 'id', type: 'string', description: 'ID du WorkoutExercise' })
	async update(@Param('id') id: string, @Body() dto: UpdateWorkoutExerciseDto, @CurrentUser('id') userId: string) {
		return this.workoutExercisesService.update(userId, id, dto);
	}

	@Delete(':id')
	@ApiOperation({ summary: "Supprimer un exercice d'une séance (et ses séries planifiées)" })
	@ApiParam({ name: 'id', type: 'string', description: 'ID du WorkoutExercise' })
	async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.workoutExercisesService.remove(userId, id);
	}
}
