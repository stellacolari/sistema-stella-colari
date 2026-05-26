-- AlterTable
ALTER TABLE "MenuLoja" ADD COLUMN     "categoriasSelecionadas" TEXT,
ADD COLUMN     "corDestaque" TEXT,
ADD COLUMN     "destaque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paginaEspecial" TEXT;
