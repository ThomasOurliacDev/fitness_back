import { Module } from '@nestjs/common';
import { WorkoutController } from './workout.controller.js';
import { WorkoutService } from './workout.service.js';

@Module({
	controllers: [WorkoutController],
	providers: [WorkoutService]
})
export class WorkoutModule {}
