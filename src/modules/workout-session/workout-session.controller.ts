import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
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

	@Get('history')
	@ApiOperation({ summary: "Historique des séances terminées (les 100 plus récentes)" })
	async getHistory(@CurrentUser('id') userId: string) {
		return this.workoutSessionsService.getHistory(userId);
	}

	@Get('stats')
	@ApiOperation({ summary: "Statistiques d'activité agrégées de l'utilisateur" })
	async getStats(@CurrentUser('id') userId: string) {
		return this.workoutSessionsService.getStats(userId);
	}

	@Get('logged-exercises')
	@ApiOperation({ summary: "Exercices déjà réalisés par l'utilisateur (au moins une fois), pour peupler le sélecteur du graphique de progression" })
	async getLoggedExercises(@CurrentUser('id') userId: string) {
		return this.workoutSessionsService.getLoggedExercises(userId);
	}

	@Get('exercise-progress')
	@ApiOperation({ summary: "Historique de performance par exercice (une entrée par séance terminée), pour le graphique de progression" })
	async getExerciseProgress(@Query('exerciseIds') exerciseIds: string | undefined, @CurrentUser('id') userId: string) {
		const ids = (exerciseIds ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
		return this.workoutSessionsService.getExerciseProgress(userId, ids);
	}

	@Patch(':id/finish')
	@ApiOperation({ summary: 'Terminer une session (la durée est calculée côté serveur)' })
	@ApiParam({ name: 'id', type: 'string', description: 'ID de la session' })
	async finishSession(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.workoutSessionsService.finishSession(userId, id);
	}
}
