import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
	const request: Request = ctx.switchToHttp().getRequest();
	const user = request?.user;

	// Si on demande un propriété spécifique (ex: @CurrentUser('id')) on renvoie juste ça
	// sinon on renvoie tout le user
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return data ? user?.[data] : user;
});
