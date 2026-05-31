import { Module } from '@nestjs/common';
import { WorkoutSessionController } from './workout-session.controller.js';
import { WorkoutSessionService } from './workout-session.service.js';

@Module({
	controllers: [WorkoutSessionController],
	providers: [WorkoutSessionService]
})
export class WorkoutSessionsModule {}
