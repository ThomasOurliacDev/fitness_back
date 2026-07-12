import { IsOptional, IsUUID, IsArray, ValidateNested, ArrayNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSetTemplateDto } from './create-workout-exercise.dto.js';

// Édition d'un exercice déjà présent dans une séance :
// on peut remplacer l'exercice du dictionnaire et/ou redéfinir toutes ses séries.
export class UpdateWorkoutExerciseDto {
	@ApiPropertyOptional({ example: '987fcdeb-51a2-43d7-9012-345678901234', description: "Nouvel exercice du dictionnaire" })
	@IsOptional()
	@IsUUID()
	exerciseId?: string;

	@ApiPropertyOptional({ type: [CreateSetTemplateDto], description: 'Remplace TOUTES les séries planifiées existantes' })
	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => CreateSetTemplateDto)
	sets?: CreateSetTemplateDto[];

	@ApiPropertyOptional({ example: 12, description: "Progression : plafond de reps avant d'ajouter du poids" })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(50)
	maxReps?: number;
}

// Réordonnancement des exercices d'une séance : la liste doit contenir
// exactement tous les WorkoutExercise de la séance, dans le nouvel ordre.
export class ReorderWorkoutExercisesDto {
	@ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la séance (Workout)' })
	@IsUUID()
	workoutId!: string;

	@ApiProperty({ type: [String], description: 'IDs des WorkoutExercise dans le nouvel ordre' })
	@IsArray()
	@ArrayNotEmpty()
	@IsUUID('all', { each: true })
	orderedIds!: string[];
}
