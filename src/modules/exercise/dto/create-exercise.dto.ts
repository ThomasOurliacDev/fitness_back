import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExerciseDto {
	@ApiProperty({ example: 'Développé Couché' })
	@IsString()
	@MaxLength(100)
	name!: string;

	@ApiPropertyOptional({ example: 'Exercice à la barre pour les pectoraux.' })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;

	@ApiProperty({ example: 'CHEST', description: 'Groupes musculaires: CHEST, BACK, LEGS, ARMS, CORE, FULLBODY...' })
	@IsString()
	@IsIn(['CHEST', 'BACK', 'LEGS', 'ARMS', 'CORE', 'SHOULDERS', 'FULLBODY', 'CARDIO'])
	bodyPart!: string;

	@ApiProperty({ example: 'WEIGHTLIFTING', description: 'Types: WEIGHTLIFTING, BODYWEIGHT, CARDIO, STRETCHING' })
	@IsString()
	@IsIn(['WEIGHTLIFTING', 'BODYWEIGHT', 'CARDIO', 'STRETCHING'])
	type!: string;
}
