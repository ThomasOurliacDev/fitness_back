import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkoutDto {
	@ApiProperty({ example: 'Push Day - Pecs/Epaules/Triceps' })
	@IsString()
	@MaxLength(100)
	name!: string;

	@ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID du programme parent' })
	@IsUUID()
	programId!: string;
}
