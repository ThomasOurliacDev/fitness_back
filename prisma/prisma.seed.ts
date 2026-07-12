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

	// Le dictionnaire global des exercices — SOURCE DE VÉRITÉ.
	// Groupes musculaires fins : CHEST, BACK, TRAPS, LOWER_BACK, SHOULDERS,
	// BICEPS, TRICEPS, QUADS, HAMSTRINGS, GLUTES, CALVES, CORE, CARDIO.
	const exercises = [
		// --- PECTORAUX (CHEST) ---
		{
			name: 'Développé Couché',
			description: 'Exercice polyarticulaire à la barre.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{
			name: 'Développé Incliné',
			description: 'À la barre sur banc incliné, cible le haut des pectoraux.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{
			name: 'Développé Couché Haltères',
			description: 'Aux haltères pour une plus grande amplitude.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{
			name: 'Développé Incliné Haltères',
			description: 'Aux haltères sur banc incliné.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{ name: 'Pompes', description: 'Au poids du corps.', bodyPart: 'CHEST', type: 'BODYWEIGHT' },
		{ name: 'Dips', description: 'Aux barres parallèles, buste penché pour les pectoraux.', bodyPart: 'CHEST', type: 'BODYWEIGHT' },
		{
			name: 'Écartés Couché',
			description: 'Aux haltères pour cibler le grand pectoral.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING'
		},
		{
			name: 'Écartés à la Poulie',
			description: 'Aux câbles, tension continue sur les pectoraux.',
			bodyPart: 'CHEST',
			type: 'WEIGHTLIFTING'
		},

		// --- DOS (BACK) ---
		{ name: 'Tractions', description: 'Prise pronation au poids du corps.', bodyPart: 'BACK', type: 'BODYWEIGHT' },
		{ name: 'Tirage Poitrine', description: 'À la poulie haute.', bodyPart: 'BACK', type: 'WEIGHTLIFTING', weightIncrement: 2 },
		{ name: 'Tirage Horizontal', description: 'À la poulie basse, coudes le long du corps.', bodyPart: 'BACK', type: 'WEIGHTLIFTING', weightIncrement: 2 },
		{ name: 'Rowing Barre', description: 'Buste penché.', bodyPart: 'BACK', type: 'WEIGHTLIFTING', weightIncrement: 2 },
		{ name: 'Rowing Haltère', description: 'Un bras, genou en appui sur un banc.', bodyPart: 'BACK', type: 'WEIGHTLIFTING', weightIncrement: 2 },
		{ name: 'Soulevé de terre', description: 'Deadlift classique, toute la chaîne postérieure.', bodyPart: 'BACK', type: 'WEIGHTLIFTING', weightIncrement: 2 },

		// --- TRAPÈZES (TRAPS) ---
		{ name: 'Shrugs', description: 'Haussements d épaules pour les trapèzes.', bodyPart: 'TRAPS', type: 'WEIGHTLIFTING' },

		// --- LOMBAIRES (LOWER_BACK) ---
		{ name: 'Hyperextensions', description: 'Extensions lombaires sur banc à 45°.', bodyPart: 'LOWER_BACK', type: 'BODYWEIGHT' },

		// --- QUADRICEPS (QUADS) ---
		{ name: 'Squat', description: 'Flexion sur jambes avec barre arrière.', bodyPart: 'QUADS', type: 'WEIGHTLIFTING', weightIncrement: 2 },
		{ name: 'Squat Bulgare', description: 'Fente arrière, pied surélevé sur un banc.', bodyPart: 'QUADS', type: 'WEIGHTLIFTING' },
		{ name: 'Presse à cuisses', description: 'Sur machine.', bodyPart: 'QUADS', type: 'WEIGHTLIFTING', weightIncrement: 2 },
		{ name: 'Fentes', description: 'Marchées ou statiques, avec ou sans haltères.', bodyPart: 'QUADS', type: 'WEIGHTLIFTING' },
		{ name: 'Leg Extension', description: 'Isolation des quadriceps sur machine.', bodyPart: 'QUADS', type: 'WEIGHTLIFTING' },

		// --- ISCHIO-JAMBIERS (HAMSTRINGS) ---
		{
			name: 'Soulevé de terre roumain',
			description: 'Jambes semi-tendues, cible les ischio-jambiers.',
			bodyPart: 'HAMSTRINGS',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{ name: 'Leg Curl', description: 'Isolation des ischio-jambiers sur machine.', bodyPart: 'HAMSTRINGS', type: 'WEIGHTLIFTING' },

		// --- FESSIERS (GLUTES) ---
		{ name: 'Hip Thrust', description: 'Extension de hanches, dos en appui sur un banc.', bodyPart: 'GLUTES', type: 'WEIGHTLIFTING', weightIncrement: 2 },

		// --- MOLLETS (CALVES) ---
		{ name: 'Mollets Debout', description: 'Extensions des mollets à la machine ou à la barre.', bodyPart: 'CALVES', type: 'WEIGHTLIFTING' },

		// --- BICEPS ---
		{ name: 'Curl Biceps', description: 'Aux haltères debout.', bodyPart: 'BICEPS', type: 'WEIGHTLIFTING' },
		{ name: 'Curl Marteau', description: 'Prise neutre, cible le brachial et l avant-bras.', bodyPart: 'BICEPS', type: 'WEIGHTLIFTING' },
		{ name: 'Curl Incliné', description: 'Assis sur banc incliné, étirement maximal du biceps.', bodyPart: 'BICEPS', type: 'WEIGHTLIFTING' },
		{ name: 'Curl à la Barre EZ', description: 'À la barre EZ, poignets en position confortable.', bodyPart: 'BICEPS', type: 'WEIGHTLIFTING' },

		// --- TRICEPS ---
		{
			name: 'Extension Triceps',
			description: 'À la poulie haute avec corde.',
			bodyPart: 'TRICEPS',
			type: 'WEIGHTLIFTING'
		},
		{ name: 'Barre au Front', description: 'Extension des triceps allongé, barre EZ.', bodyPart: 'TRICEPS', type: 'WEIGHTLIFTING' },
		{ name: 'Dips entre Bancs', description: 'Au poids du corps, cible les triceps.', bodyPart: 'TRICEPS', type: 'BODYWEIGHT' },

		// --- ÉPAULES (SHOULDERS) ---
		{
			name: 'Développé Militaire',
			description: 'À la barre ou aux haltères.',
			bodyPart: 'SHOULDERS',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{
			name: 'Développé Arnold',
			description: 'Aux haltères avec rotation, cible les trois faisceaux.',
			bodyPart: 'SHOULDERS',
			type: 'WEIGHTLIFTING', weightIncrement: 2
		},
		{
			name: 'Élévations Latérales',
			description: 'Isolation pour le deltoïde moyen.',
			bodyPart: 'SHOULDERS',
			type: 'WEIGHTLIFTING'
		},
		{ name: 'Élévations Frontales', description: 'Isolation du deltoïde antérieur.', bodyPart: 'SHOULDERS', type: 'WEIGHTLIFTING' },
		{ name: 'Oiseau', description: 'Élévations latérales buste penché, deltoïde postérieur.', bodyPart: 'SHOULDERS', type: 'WEIGHTLIFTING' },
		{ name: 'Face Pull', description: 'À la poulie avec corde, deltoïde postérieur et trapèzes.', bodyPart: 'SHOULDERS', type: 'WEIGHTLIFTING' },

		// --- ABDOMINAUX (CORE) ---
		{ name: 'Crunch', description: 'Au sol.', bodyPart: 'CORE', type: 'BODYWEIGHT' },
		{ name: 'Gainage (Planche)', description: 'Maintien isométrique.', bodyPart: 'CORE', type: 'BODYWEIGHT', measure: 'TIME' },
		{
			name: 'Gainage Latéral',
			description: 'Maintien isométrique sur le côté, cible les obliques.',
			bodyPart: 'CORE',
			type: 'BODYWEIGHT',
			measure: 'TIME'
		},
		{ name: 'Relevé de Jambes Suspendu', description: 'Suspendu à la barre de traction.', bodyPart: 'CORE', type: 'BODYWEIGHT' },
		{ name: 'Russian Twist', description: 'Rotations du buste, avec ou sans poids.', bodyPart: 'CORE', type: 'BODYWEIGHT' },
		{ name: 'Roulette Abdominale', description: 'Ab wheel, gainage dynamique.', bodyPart: 'CORE', type: 'BODYWEIGHT' },

		// --- CARDIO ---
		{ name: 'Course à Pied', description: 'Tapis ou extérieur.', bodyPart: 'CARDIO', type: 'CARDIO', measure: 'TIME' },
		{
			name: 'Rameur',
			description: 'Cardio complet, sollicite aussi le dos et les jambes.',
			bodyPart: 'CARDIO',
			type: 'CARDIO',
			measure: 'TIME'
		},
		{ name: 'Vélo', description: 'Stationnaire ou extérieur.', bodyPart: 'CARDIO', type: 'CARDIO', measure: 'TIME' }
	];

	const current = await prisma.exercise.findMany();
	const existingNames = new Set(current.map((exercise) => exercise.name));

	// 1. Idempotent : on n'insère que les exercices absents (comparaison par nom)
	const toInsert = exercises.filter((exercise) => !existingNames.has(exercise.name));

	if (toInsert.length > 0) {
		console.log(`⏳ Insertion de ${toInsert.length} nouveaux exercices dans le catalogue...`);
		await prisma.exercise.createMany({
			data: toInsert
		});
	} else {
		console.log(`✅ La base contient déjà les ${exercises.length} exercices du catalogue.`);
	}

	// 2. On resynchronise les exercices existants avec le catalogue
	//    (groupe musculaire, type, mesure, description) — utile quand la taxonomie évolue.
	const catalogByName = new Map(exercises.map((exercise) => [exercise.name, exercise]));
	let syncedCount = 0;

	for (const row of current) {
		const ref = catalogByName.get(row.name);
		if (!ref) continue;

		const measure = ref.measure ?? 'REPS';
		const weightIncrement = ref.weightIncrement ?? 1;
		const needsSync =
			row.bodyPart !== ref.bodyPart ||
			row.type !== ref.type ||
			row.measure !== measure ||
			row.description !== ref.description ||
			row.weightIncrement !== weightIncrement;

		if (needsSync) {
			await prisma.exercise.update({
				where: { id: row.id },
				data: { bodyPart: ref.bodyPart, type: ref.type, measure, description: ref.description, weightIncrement }
			});
			syncedCount++;
		}
	}

	if (syncedCount > 0) {
		console.log(`🔄 ${syncedCount} exercice(s) resynchronisé(s) avec le catalogue.`);
	}

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
