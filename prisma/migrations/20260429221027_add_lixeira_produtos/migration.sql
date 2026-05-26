-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ATIVO',
ADD COLUMN     "statusAntesLixeira" TEXT;
