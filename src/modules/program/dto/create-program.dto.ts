import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgramDto {
	@ApiProperty({ example: 'Prise de masse 4 Jours' })
	@IsString()
	@MaxLength(100)
	name!: string;

	@ApiPropertyOptional({ example: "Programme axé sur l'hypertrophie et la force." })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;
}
