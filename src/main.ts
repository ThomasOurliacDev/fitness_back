import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);

	// 1. Sécurité de base avec Helmet (ajoute des headers HTTP sécurisés)
	app.use(helmet());

	// 2. Configuration CORS (pour que ton frontend Angular puisse faire des requêtes)
	// `|| false` : si FRONTEND_URL manque, on N'AUTORISE AUCUNE origine croisée
	// (origin: undefined ouvrirait le CORS à tout le monde).
	app.enableCors({
		origin: configService.get<string>('FRONTEND_URL') || false
	});

	// 3. Versioning de l'API (ex: /v1/programs)
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1'
	});

	// 4. Validation globale stricte
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Supprime automatiquement les champs non définis dans le DTO
			forbidNonWhitelisted: true, // Rejette la requête si des champs non autorisés sont envoyés
			transform: true, // Transforme automatiquement les payloads en instances de classes DTO
			transformOptions: {
				enableImplicitConversion: true // Convertit les strings de l'URL en nombres/booleans si nécessaire
			}
		})
	);

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Fitness API')
		.setDescription('API backend pour l application de suivi sportif')
		.setVersion('1.0')
		.addBearerAuth()
		.build();

	const documentFactory = () => {
		return SwaggerModule.createDocument(app, swaggerConfig);
	};
	SwaggerModule.setup('api', app, documentFactory);

	// 5. Lancement du serveur
	const port = configService.get<number>('port')!;
	await app.listen(port);
	console.log(`🚀 Application en cours d'exécution sur : http://localhost:${port}`);
	console.log(`Documentation swagger en cours d'exécution sur : http://localhost:${port}/api`);
}
bootstrap();
//test PR
