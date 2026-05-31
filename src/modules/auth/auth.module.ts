import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
// import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtConfig } from 'src/shared/types/types.js';

@Module({
	imports: [
		PassportModule,
		ConfigModule,
		// Configuration asynchrone pour attendre que le ConfigService soit prêt
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const jwt = configService.get<JwtConfig>('jwt');
				return {
					global: true,
					secret: jwt!.secret,
					signOptions: jwt!.signOptions
				};
			}
		})
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy, PrismaService],
	exports: [AuthService]
})
export class AuthModule {}
