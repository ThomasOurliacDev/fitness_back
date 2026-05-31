import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
	private logger = new Logger('HTTP');

	use(req: Request, res: Response, next: NextFunction) {
		const { ip, method, originalUrl } = req;
		const userAgent = req.get('user-agent') || '';
		const start = Date.now();

		// On écoute l'evenement 'finish' pour avoir le vrai code du status final
		res.on('finish', () => {
			const { statusCode } = res;
			const duration = Date.now() - start;
			this.logger.log(`${method} ${originalUrl} ${statusCode} -- ${duration}ms -- ${userAgent} ${ip}`);
		});
		next();
	}
}
