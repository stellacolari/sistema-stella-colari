-- AlterTable
ALTER TABLE "Produto"
ADD COLUMN "termosBusca" TEXT,
ADD COLUMN "tagsComerciais" TEXT;

-- AlterTable
ALTER TABLE "CategoriaProduto"
ADD COLUMN "descricaoSeo" TEXT,
ADD COLUMN "termosBusca" TEXT;

-- AlterTable
ALTER TABLE "LojaPagina"
ADD COLUMN "termosBusca" TEXT;
