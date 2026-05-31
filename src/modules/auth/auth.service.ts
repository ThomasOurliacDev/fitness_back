import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
	constructor(
		private prismaService: PrismaService,
		private jwtService: JwtService
	) {}

	async register(dto: RegisterDto) {
		// 1. Vérifier si l'email existe déjà
		const existingUser = await this.prismaService.user.findUnique({
			where: { email: dto.email }
		});

		if (existingUser) {
			throw new ConflictException('Cet email est déjà utilisé.');
		}

		// 2. Hacher le mot de passe (Salt rounds = 10)
		const hashedPassword = await bcrypt.hash(dto.password, 10);

		// 3. Créer l'utilisateur en DB
		const user = await this.prismaService.user.create({
			data: {
				email: dto.email,
				password: hashedPassword,
				firstName: dto.firstName,
				lastName: dto.lastName
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				createdAt: true,
				updatedAt: true
			}
		});

		const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });

		// 4. Générer et retourner le token
		return { user, accessToken };
	}

	async login(login: LoginDto) {
		const { email, password } = login;
		// 1. Chercher l'utilisateur
		const user = await this.prismaService.user.findUnique({
			where: { email },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				password: true,
				createdAt: true,
				updatedAt: true
			}
		});

		if (!user) {
			throw new UnauthorizedException('Identifiants incorrects.');
		}

		// 2. Vérifier le mot de passe
		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			throw new UnauthorizedException('Identifiants incorrects.');
		}
		// 3. Générer et retourner le token
		const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });

		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			},
			accessToken
		};
	}

	async getUser(userId: string) {
		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				createdAt: true,
				updatedAt: true
			}
		});

		return user;
	}
}
