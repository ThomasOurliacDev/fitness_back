import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
	@ApiProperty({
		example: 'thomas.ourliac@gmail.com',
		description: 'L email de l utilisateur'
	})
	@IsEmail({}, { message: 'Email invalide' })
	email!: string;

	@ApiProperty({
		example: 'monMotDePasse',
		description: 'Le mot de passe de l utilisateur',
		minLength: 8
	})
	@IsString()
	@MinLength(8)
	password!: string;
}
