-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "cancelamentoMotivo" TEXT,
ADD COLUMN     "cancelamentoObservacao" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ATIVA';
