import { ProgramsModule } from './modules/program/program.module.js';
import { WorkoutModule } from './modules/workout/workout.module.js';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './core/config/configuration.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';
import { LoggerMiddleware } from './core/middleware/logger.middleware.js';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ResponseInterceptor } from './core/interceptors/response.interceptor.js';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter.js';
import { ExercisesModule } from './modules/exercise/exercise.module.js';
import { WorkoutExerciseModule } from './modules/workout-exercise/workout-exercise.module.js';
import { WorkoutSessionsModule } from './modules/workout-session/workout-session.module.js';
import { SetModule } from './modules/sets/set.module.js';
// Plus tard, tu importeras ici AuthModule, ProgramsModule, etc.

@Module({
	imports: [
		// 1. Initialisation de la configuration globale
		ConfigModule.forRoot({
			isGlobal: true, // Disponible partout sans import
			load: [configuration]
		}),

		ThrottlerModule.forRoot([
			{
				ttl: 60000,
				limit: 100
			}
		]),

		// 3. Tes futurs modules métier iront ici
		AuthModule,
		PrismaModule,
		ProgramsModule,
		WorkoutModule,
		ExercisesModule,
		WorkoutExerciseModule,
		WorkoutSessionsModule,
		SetModule
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard
		},
		// Enveloppe standard { success, data, error } sur toutes les réponses (cf. README)
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor
		},
		{
			provide: APP_FILTER,
			useClass: AllExceptionsFilter
		}
	]
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(LoggerMiddleware).forRoutes('*');
	}
}
