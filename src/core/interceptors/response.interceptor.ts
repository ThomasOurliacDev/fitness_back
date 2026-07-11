import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

// L'enveloppe standard renvoyée par TOUTES les routes en cas de succès (cf. README)
export interface ApiEnvelope<T> {
	success: true;
	data: T;
	error: null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
	intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
		return next.handle().pipe(
			map((data) => ({
				success: true as const,
				data,
				error: null
			}))
		);
	}
}
