import { Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller.js';
import { ExerciseService } from './exercise.service.js';

@Module({
	controllers: [ExerciseController],
	providers: [ExerciseService]
})
export class ExercisesModule {}
