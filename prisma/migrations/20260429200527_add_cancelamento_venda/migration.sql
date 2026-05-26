-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "cancelamentoMotivo" TEXT,
ADD COLUMN     "cancelamentoObservacao" TEXT;
