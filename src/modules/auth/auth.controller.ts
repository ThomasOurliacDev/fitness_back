import { Controller, Post, HttpCode, HttpStatus, Get, Request, UseGuards, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from './type/type.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	// Anti-abus : bien plus strict que le throttle global (création de comptes en masse)
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@ApiOperation({ summary: 'Créer un nouveau user' })
	@ApiResponse({ status: 201, description: 'Utilisateur créé avec succès.' })
	@ApiResponse({ status: 409, description: 'Cet Email est déjà utilisé.' })
	async register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@ApiOperation({ summary: 'Se connecter et récupérer un token JWT' })
	@ApiResponse({
		status: 200,
		description: 'Connexion réussie, retourne le token.'
	})
	@ApiResponse({ status: 401, description: 'Identifiants incorrects.' })
	@Post('login')
	// Anti brute-force : 5 tentatives de connexion par minute et par IP
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@HttpCode(HttpStatus.OK) // Change le code par défaut 201 (Created) en 200 (OK)
	async login(@Body() loginDto: LoginDto) {
		return await this.authService.login(loginDto);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Get('profile')
	async getProfile(@Request() req: AuthRequest) {
		return await this.authService.getUser(req.user.sub);
	}
}
