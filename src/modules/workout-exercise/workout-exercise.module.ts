import { Module } from '@nestjs/common';
import { WorkoutExerciseController } from './workout-exercise.controller.js';
import { WorkoutExerciseService } from './workout-exercise.service.js';

@Module({
	controllers: [WorkoutExerciseController],
	providers: [WorkoutExerciseService]
})
export class WorkoutExerciseModule {}
