import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>('jwt.secret') || 'default_secret'
		});
	}

	// Cette méthode est appelée SEULEMENT si le token est valide
	validate(payload: { sub: string; email: string }) {
		// Ce qui est retourné ici sera injecté dans l'objet 'req.user' de tes controllers
		return { sub: payload.sub, email: payload.email };
	}
}
