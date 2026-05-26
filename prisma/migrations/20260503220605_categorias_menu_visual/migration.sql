-- AlterTable
ALTER TABLE "CategoriaProduto" ADD COLUMN     "exibirNoMenu" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "imagemUrl" TEXT,
ADD COLUMN     "ordemMenu" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "CategoriaProduto_exibirNoMenu_idx" ON "CategoriaProduto"("exibirNoMenu");

-- CreateIndex
CREATE INDEX "CategoriaProduto_ordemMenu_idx" ON "CategoriaProduto"("ordemMenu");
