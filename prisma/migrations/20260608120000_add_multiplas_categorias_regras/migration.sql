ALTER TABLE "RegraCategoria"
ADD COLUMN "aplicarTodasCategorias" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "categorias" JSONB;
