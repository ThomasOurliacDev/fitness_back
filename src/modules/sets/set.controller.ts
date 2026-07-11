import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SetService } from './set.service.js';
import { CreateSetDto } from './dto/create-set.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorator/current-user.decorator.js';

@ApiTags('Exécution (Logs des séries)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'sets', version: '1' })
export class SetController {
	constructor(private readonly setsService: SetService) {}

	@Post()
	@ApiOperation({ summary: 'Enregistrer une série effectuée dans une session en cours' })
	async create(@Body() dto: CreateSetDto, @CurrentUser('id') userId: string) {
		return this.setsService.create(userId, dto);
	}
}
