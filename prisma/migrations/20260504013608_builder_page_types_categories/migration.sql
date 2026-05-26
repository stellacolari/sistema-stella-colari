-- AlterTable
ALTER TABLE "LojaPagina" ADD COLUMN     "categoriaId" TEXT,
ADD COLUMN     "publicadoEm" TIMESTAMP(3),
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "statusPublicacao" TEXT NOT NULL DEFAULT 'PUBLICADA',
ADD COLUMN     "usarComoTemplatePadrao" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "tipo" SET DEFAULT 'GERAL';

-- CreateIndex
CREATE INDEX "LojaPagina_categoriaId_idx" ON "LojaPagina"("categoriaId");

-- CreateIndex
CREATE INDEX "LojaPagina_statusPublicacao_idx" ON "LojaPagina"("statusPublicacao");

-- CreateIndex
CREATE INDEX "LojaPagina_usarComoTemplatePadrao_idx" ON "LojaPagina"("usarComoTemplatePadrao");

-- AddForeignKey
ALTER TABLE "LojaPagina" ADD CONSTRAINT "LojaPagina_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
