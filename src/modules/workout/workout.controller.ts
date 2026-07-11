import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WorkoutService } from './workout.service.js';
import { CreateWorkoutDto } from './dto/create-workout.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorator/current-user.decorator.js';

@ApiTags('Séances (Workouts)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workouts', version: '1' })
export class WorkoutController {
	constructor(private readonly workoutsService: WorkoutService) {}

	@Post()
	@ApiOperation({ summary: 'Ajouter une séance à un programme' })
	async create(@Body() dto: CreateWorkoutDto, @CurrentUser('id') userId: string) {
		return this.workoutsService.create(userId, dto);
	}

	@Get('program/:programId')
	@ApiOperation({ summary: "Récupérer toutes les séances d'un programme spécifique" })
	@ApiParam({ name: 'programId', type: 'string', description: 'ID du programme' })
	async findAllByProgram(@Param('programId') programId: string, @CurrentUser('id') userId: string) {
		return this.workoutsService.findAllByProgram(userId, programId);
	}
}
