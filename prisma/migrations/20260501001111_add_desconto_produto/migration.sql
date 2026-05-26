-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "descontoAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precoPromocional" DOUBLE PRECISION;
