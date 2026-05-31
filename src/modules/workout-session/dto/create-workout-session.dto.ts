import { IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkoutSessionDto {
	@ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la séance planifiée (Workout)' })
	@IsUUID()
	workoutId!: string;

	@ApiPropertyOptional({
		example: '2026-04-11T10:00:00Z',
		description: 'Date et heure de début (optionnel, par défaut: maintenant)'
	})
	@IsOptional()
	@IsDateString()
	date?: string;
}
