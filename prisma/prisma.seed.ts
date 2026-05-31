// 1. L'import depuis ton dossier généré
import { PrismaClient } from '../generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 2. IMPORTANT : Comme NestJS est éteint, on charge le fichier .env manuellement
import 'dotenv/config'; // Assure-toi d'avoir fait "npm install dotenv" si ce n'est pas déjà le cas

// 3. On configure la connexion exactement comme dans ton PrismaService
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 👉 4. LA CORRECTION EST ICI : On passe l'objet avec l'adaptateur en argument !
const prisma = new PrismaClient({ adapter });

async function main() {
	console.log('🌱 Démarrage du script de seeding...');

	// On vérifie s'il y a déjà des exercices pour éviter les doublons
	const exerciseCount = await prisma.exercise.count();

	if (exerciseCount > 0) {
		console.log(`✅ La base contient déjà ${exerciseCount} exercices. Seeding ignoré.`);
		return;
	}

	// Le dictionnaire global des exercices
	const exercises = [
		// --- PECTORAUX (CHEST) ---
		{
			name: 'Développé Couché',
			description: 'Exercice polyarticulaire à la barre.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING'
		},
		{ name: 'Pompes', description: 'Au poids du corps.', bodyPart: 'CHEST', type: 'BODYWEIGHT' },
		{
			name: 'Écartés Couché',
			description: 'Aux haltères pour cibler le grand pectoral.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING'
		},

		// --- DOS (BACK) ---
		{ name: 'Tractions', description: 'Prise pronation au poids du corps.', bodyPart: 'BACK', type: 'BODYWEIGHT' },
		{ name: 'Tirage Poitrine', description: 'À la poulie haute.', bodyPart: 'BACK', type: 'WEIGHTLIFTING' },
		{ name: 'Rowing Barre', description: 'Buste penché.', bodyPart: 'BACK', type: 'WEIGHTLIFTING' },

		// --- JAMBES (LEGS) ---
		{ name: 'Squat', description: 'Flexion sur jambes avec barre arrière.', bodyPart: 'LEGS', type: 'WEIGHTLIFTING' },
		{ name: 'Soulevé de terre', description: 'Deadlift classique.', bodyPart: 'LEGS', type: 'WEIGHTLIFTING' },
		{ name: 'Presse à cuisses', description: 'Sur machine.', bodyPart: 'LEGS', type: 'WEIGHTLIFTING' },

		// --- BRAS (ARMS) ---
		{ name: 'Curl Biceps', description: 'Aux haltères debout.', bodyPart: 'ARMS', type: 'WEIGHTLIFTING' },
		{
			name: 'Extension Triceps',
			description: 'À la poulie haute avec corde.',
			bodyPart: 'ARMS',
			type: 'WEIGHTLIFTING'
		},

		// --- ÉPAULES (SHOULDERS) ---
		{
			name: 'Développé Militaire',
			description: 'À la barre ou aux haltères.',
			bodyPart: 'SHOULDERS',
			type: 'WEIGHTLIFTING'
		},
		{
			name: 'Élévations Latérales',
			description: 'Isolation pour le deltoïde moyen.',
			bodyPart: 'SHOULDERS',
			type: 'WEIGHTLIFTING'
		},

		// --- ABDOMINAUX (CORE) ---
		{ name: 'Crunch', description: 'Au sol.', bodyPart: 'CORE', type: 'BODYWEIGHT' },
		{ name: 'Gainage (Planche)', description: 'Maintien isométrique.', bodyPart: 'CORE', type: 'BODYWEIGHT' }
	];

	console.log(`⏳ Insertion de ${exercises.length} exercices dans le catalogue...`);

	await prisma.exercise.createMany({
		data: exercises
	});

	console.log('🎉 Seeding terminé avec succès !');
}

main()
	.catch((e) => {
		console.error('❌ Erreur lors du seeding :', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
