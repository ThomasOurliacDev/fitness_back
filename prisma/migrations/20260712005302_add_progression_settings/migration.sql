-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "weightIncrement" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "maxReps" INTEGER NOT NULL DEFAULT 12;
