import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSetDto {
	@ApiProperty({ example: 'uuid-de-la-session-en-cours', description: 'ID de la WorkoutSession' })
	@IsUUID()
	workoutSessionId!: string;

	@ApiProperty({ example: 'uuid-de-lexercice', description: "ID de l'exercice (ex: Développé Couché)" })
	@IsUUID()
	exerciseId!: string;

	@ApiPropertyOptional({ example: 10, description: 'Répétitions réellement effectuées' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	reps?: number;

	@ApiPropertyOptional({ example: 82.5, description: 'Poids réellement soulevé' })
	@IsOptional()
	@IsNumber()
	weight?: number;

	@ApiProperty({ example: 90, description: 'Temps de repos réel en secondes' })
	@IsNumber()
	@Min(0)
	restTime!: number;

	@ApiProperty({ example: 1, description: 'Ordre chronologique de la série dans la séance' })
	@IsNumber()
	@Min(1)
	order!: number;
}
