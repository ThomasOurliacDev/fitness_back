import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor() {
		const pool = new Pool({ connectionString: process.env.DATABASE_URL });
		const adapter = new PrismaPg(pool);
		// On passe l'URL de la DB explicitement si on veut,
		// bien que Prisma lise le .env par défaut.
		super({ adapter });
	}

	async onModuleInit() {
		// Connexion explicite à la base de données au démarrage de l'app
		await this.$connect();
	}

	async onModuleDestroy() {
		// Déconnexion propre lors de l'arrêt du serveur
		await this.$disconnect();
	}
}
