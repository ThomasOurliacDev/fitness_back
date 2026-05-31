import { Module } from '@nestjs/common';
import { ProgramController } from './program.controller.js';
import { ProgramsService } from './program.service.js';

@Module({
	controllers: [ProgramController],
	providers: [ProgramsService]
})
export class ProgramsModule {}
