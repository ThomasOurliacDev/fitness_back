import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

// L'enveloppe standard renvoyée par TOUTES les routes en cas d'erreur (cf. README)
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
		let message: string | string[] = 'Internal server error';

		if (exception instanceof HttpException) {
			statusCode = exception.getStatus();
			const body = exception.getResponse();
			if (typeof body === 'string') {
				message = body;
			} else if (typeof body === 'object' && body !== null && 'message' in body) {
				// Cas classique : { statusCode, message, error } — message peut être
				// un string ou un tableau (erreurs de validation du ValidationPipe)
				message = (body as { message: string | string[] }).message;
			} else {
				message = exception.message;
			}
		} else {
			// Erreur inattendue (bug, Prisma...) : on log tout côté serveur,
			// mais on ne fuite aucun détail technique au client.
			this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
		}

		response.status(statusCode).json({
			success: false,
			data: null,
			error: { statusCode, message }
		});
	}
}
