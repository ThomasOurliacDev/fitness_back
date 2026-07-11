import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProgramsService } from './program.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
// Tes fameux mécanismes globaux en action :
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorator/current-user.decorator.js';

@ApiTags('Programmes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // 🔒 Interdit l'accès sans token valide
@Controller({ path: 'program', version: '1' })
export class ProgramController {
	constructor(private readonly programsService: ProgramsService) {}

	@Post()
	@ApiOperation({ summary: 'Créer un nouveau programme' })
	async create(
		@Body() dto: CreateProgramDto,
		@CurrentUser('id') userId: string // 🪄 Magie : on récupère l'ID du token
	) {
		return this.programsService.create(userId, dto);
	}

	@Get()
	@ApiOperation({ summary: "Récupérer tous les programmes de l'utilisateur connecté" })
	async findAll(@CurrentUser('id') userId: string) {
		return this.programsService.findAllByUser(userId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Récupérer un programme complet (workouts → exercices → séries planifiées)' })
	@ApiParam({ name: 'id', type: 'string', description: 'ID du programme' })
	async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.programsService.findOne(userId, id);
	}
}
