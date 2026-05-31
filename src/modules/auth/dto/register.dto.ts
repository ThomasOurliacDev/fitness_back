import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'thomas.ourliac@gmail.com',
    description: 'L email de l utilisateur',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiProperty({
    example: 'monMotDePasse',
    description: 'Le mot de passe de l utilisateur',
    minLength: 8,
    maxLength: 32,
  })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(32)
  password!: string;

  @ApiProperty({
    example: 'Thomas',
    description: 'Prénom de l utilisateur',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    example: 'Ourliac',
    description: 'Nom de l utilisateur',
  })
  @IsString()
  lastName!: string;
}
