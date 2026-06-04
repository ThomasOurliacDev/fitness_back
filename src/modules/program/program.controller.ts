import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from './program.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
// Tes fameux mécanismes globaux en action :
import { jwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorator/current-user.decorator.js';

@ApiTags('Programmes')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard) // 🔒 Interdit l'accès sans token valide
@Controller({ path: 'program', version: '1' })
export class ProgramController {
	constructor(private readonly programsService: ProgramsService) {}

	@Post()
	@ApiOperation({ summary: 'Créer un nouveau programme' })
	async create(
		@Body() dto: CreateProgramDto
		// @CurrentUser('id') userId: sting // 🪄 Magie : on récupère l'ID du token
	) {
		return this.programsService.create(dto);
	}

	@Get()
	@ApiOperation({ summary: "Récupérer tous les programmes de l'utilisateur connecté" })
	async findAll(@CurrentUser('id') userId: string) {
		return this.programsService.findAllByUser(userId);
	}
}
