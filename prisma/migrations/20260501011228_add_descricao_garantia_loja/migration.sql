-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "descricaoLoja" TEXT;

-- CreateTable
CREATE TABLE "LojaTextoInstitucional" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaTextoInstitucional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LojaTextoInstitucional_chave_key" ON "LojaTextoInstitucional"("chave");
