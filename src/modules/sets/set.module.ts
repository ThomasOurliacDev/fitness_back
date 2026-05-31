import { Module } from '@nestjs/common';
import { SetController } from './set.controller.js';
import { SetService } from './set.service.js';

@Module({
	controllers: [SetController],
	providers: [SetService]
})
export class SetModule {}
