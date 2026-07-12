-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "measure" TEXT NOT NULL DEFAULT 'REPS';

-- AlterTable
ALTER TABLE "Set" ADD COLUMN     "duration" INTEGER;

-- AlterTable
ALTER TABLE "SetTemplate" ADD COLUMN     "targetDuration" INTEGER;
