import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor() {
		// Fail-fast : sans URL, le driver pg tenterait localhost en silence et
		// on aurait un 500 cryptique à la première requête au lieu d'un message clair.
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL manquant : configure la variable d’environnement avant de démarrer.');
		}

		const pool = new Pool({ connectionString });
		const adapter = new PrismaPg(pool);
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
