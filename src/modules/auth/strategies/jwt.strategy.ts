import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private configService: ConfigService) {
		const secret = configService.get<string>('jwt.secret');

		// Fail-fast : on refuse de démarrer sans secret plutôt que de retomber
		// sur une valeur par défaut connue (tokens forgeables par n'importe qui).
		if (!secret) {
			throw new Error('JWT_SECRET manquant : configure la variable d’environnement avant de démarrer.');
		}

		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: secret
		});
	}

	// Cette méthode est appelée SEULEMENT si le token est valide
	validate(payload: { sub: string; email: string }) {
		// Ce qui est retourné ici sera injecté dans l'objet 'req.user' de tes controllers.
		// On expose 'id' (utilisé par @CurrentUser('id')) en plus de 'sub' (standard JWT).
		return { id: payload.sub, sub: payload.sub, email: payload.email };
	}
}
