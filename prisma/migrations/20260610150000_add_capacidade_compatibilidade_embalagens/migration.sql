ALTER TABLE "EmbalagemModeloCompatibilidade"
  ADD COLUMN IF NOT EXISTS "capacidadeMaximaItens" INTEGER NOT NULL DEFAULT 1;
