import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WorkoutSessionService } from './workout-session.service.js';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorator/current-user.decorator.js';

@ApiTags('Exécution (Sessions Actives)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workout-sessions', version: '1' })
export class WorkoutSessionController {
	constructor(private readonly workoutSessionsService: WorkoutSessionService) {}

	@Post('start')
	@ApiOperation({ summary: "Démarrer une nouvelle session d'entraînement" })
	async startSession(@Body() dto: CreateWorkoutSessionDto, @CurrentUser('id') userId: string) {
		return this.workoutSessionsService.startSession(userId, dto);
	}

	@Get('active')
	@ApiOperation({ summary: "Récupérer la session en cours de l'utilisateur" })
	async getActiveSession(@CurrentUser('id') userId: string) {
		return this.workoutSessionsService.getActiveSession(userId);
	}

	@Patch(':id/finish')
	@ApiOperation({ summary: 'Terminer une session (la durée est calculée côté serveur)' })
	@ApiParam({ name: 'id', type: 'string', description: 'ID de la session' })
	async finishSession(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.workoutSessionsService.finishSession(userId, id);
	}
}
