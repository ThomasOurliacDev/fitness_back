import { SignOptions } from 'jsonwebtoken';

export type JwtConfig = {
	secret: string;
	signOptions: SignOptions;
};
