import { IsNumber, IsOptional, IsUUID, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 1. Le sous-DTO pour définir une série (SetTemplate)
export class CreateSetTemplateDto {
	@ApiPropertyOptional({ example: 10, description: "Objectif de répétitions (exercices mesurés en 'REPS')" })
	@IsOptional()
	@IsNumber()
	@Min(1)
	targetReps?: number;

	@ApiPropertyOptional({ example: 45, description: "Objectif de durée en secondes (exercices mesurés en 'TIME')" })
	@IsOptional()
	@IsNumber()
	@Min(1)
	targetDuration?: number;

	@ApiPropertyOptional({ example: 80, description: 'Objectif de poids en kg' })
	@IsOptional()
	@IsNumber()
	targetWeight?: number;

	@ApiProperty({ example: 90, description: 'Temps de repos après la série en secondes' })
	@IsNumber()
	@Min(0)
	restTime!: number;

	@ApiProperty({ example: 1, description: 'Ordre de la série (1, 2, 3...)' })
	@IsNumber()
	@Min(1)
	order!: number;
}

// 2. Le DTO principal (WorkoutExercise)
export class CreateWorkoutExerciseDto {
	@ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
	@IsUUID()
	workoutId!: string;

	@ApiProperty({ example: '987fcdeb-51a2-43d7-9012-345678901234' })
	@IsUUID()
	exerciseId!: string;

	@ApiProperty({ example: 1, description: 'Ordre de cet exercice dans la séance' })
	@IsNumber()
	@Min(1)
	order!: number;

	@ApiPropertyOptional({ example: 12, description: "Progression : plafond de reps avant d'ajouter du poids (défaut : 12)" })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(50)
	maxReps?: number;

	// 👉 C'EST ICI LA MAGIE : On valide un tableau d'objets !
	@ApiProperty({ type: [CreateSetTemplateDto], description: 'Les séries prévues pour cet exercice' })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateSetTemplateDto)
	sets!: CreateSetTemplateDto[];
}
