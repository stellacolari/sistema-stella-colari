-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "alturaCm" DOUBLE PRECISION,
ADD COLUMN     "comprimentoCm" DOUBLE PRECISION,
ADD COLUMN     "embalagemClasseId" TEXT,
ADD COLUMN     "embalagemCompartilhavel" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "embalagemIndividualObrigatoria" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "embalagemModeloPreferencialId" TEXT,
ADD COLUMN     "embalagemPresentePadraoId" TEXT,
ADD COLUMN     "embalagemUnidades" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "larguraCm" DOUBLE PRECISION,
ADD COLUMN     "permiteEmbalagemPresente" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pesoGramas" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmbalagemClasse" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbalagemClasse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbalagemModelo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nomeInterno" TEXT NOT NULL,
    "nomePublico" TEXT,
    "slug" TEXT NOT NULL,
    "descricaoPublica" TEXT,
    "imagemUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "exibirNaLoja" BOOLEAN NOT NULL DEFAULT false,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "precoCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "substituiEmbalagemPadrao" BOOLEAN NOT NULL DEFAULT false,
    "permiteMensagem" BOOLEAN NOT NULL DEFAULT false,
    "mensagemLimiteCaracteres" INTEGER,
    "mensagemPlaceholder" TEXT,
    "capacidadeUnidades" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "capacidadeCaixasInternas" INTEGER,
    "permiteMisturarClasses" BOOLEAN NOT NULL DEFAULT true,
    "pesoGramas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alturaCm" DOUBLE PRECISION,
    "larguraCm" DOUBLE PRECISION,
    "comprimentoCm" DOUBLE PRECISION,
    "custoEstimadoManual" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbalagemModelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbalagemModeloComponente" (
    "id" TEXT NOT NULL,
    "embalagemModeloId" TEXT NOT NULL,
    "itemAdicionalId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbalagemModeloComponente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbalagemModeloCompatibilidade" (
    "id" TEXT NOT NULL,
    "embalagemModeloId" TEXT NOT NULL,
    "classeId" TEXT,
    "categoriaId" TEXT,
    "produtoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbalagemModeloCompatibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbalagemConfiguracao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL DEFAULT 'PADRAO',
    "estrategiaSelecao" TEXT NOT NULL DEFAULT 'MENOR_CUSTO_TOTAL',
    "permitirMultiplosVolumes" BOOLEAN NOT NULL DEFAULT false,
    "maxCaixasInternasPorEnvio" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbalagemConfiguracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEmbalagemPlano" (
    "id" TEXT NOT NULL,
    "pedidoOnlineId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CALCULADO',
    "planoJson" JSONB NOT NULL,
    "alertasJson" JSONB,
    "pesoTotalGramas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alturaCm" DOUBLE PRECISION,
    "larguraCm" DOUBLE PRECISION,
    "comprimentoCm" DOUBLE PRECISION,
    "custoEmbalagens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorEmbalagensCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoEmbalagemPlano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEmbalagemPlanoItem" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "itemAdicionalId" TEXT,
    "embalagemModeloId" TEXT,
    "pedidoOnlineItemId" TEXT,
    "nome" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorClienteUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoEmbalagemPlanoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmbalagemClasse_slug_key" ON "EmbalagemClasse"("slug");

-- CreateIndex
CREATE INDEX "EmbalagemClasse_ativo_idx" ON "EmbalagemClasse"("ativo");

-- CreateIndex
CREATE INDEX "EmbalagemClasse_ordem_idx" ON "EmbalagemClasse"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "EmbalagemModelo_slug_key" ON "EmbalagemModelo"("slug");

-- CreateIndex
CREATE INDEX "EmbalagemModelo_tipo_idx" ON "EmbalagemModelo"("tipo");

-- CreateIndex
CREATE INDEX "EmbalagemModelo_ativo_idx" ON "EmbalagemModelo"("ativo");

-- CreateIndex
CREATE INDEX "EmbalagemModelo_exibirNaLoja_idx" ON "EmbalagemModelo"("exibirNaLoja");

-- CreateIndex
CREATE INDEX "EmbalagemModelo_prioridade_idx" ON "EmbalagemModelo"("prioridade");

-- CreateIndex
CREATE INDEX "EmbalagemModeloComponente_embalagemModeloId_idx" ON "EmbalagemModeloComponente"("embalagemModeloId");

-- CreateIndex
CREATE INDEX "EmbalagemModeloComponente_itemAdicionalId_idx" ON "EmbalagemModeloComponente"("itemAdicionalId");

-- CreateIndex
CREATE UNIQUE INDEX "EmbalagemModeloComponente_embalagemModeloId_itemAdicionalId_key" ON "EmbalagemModeloComponente"("embalagemModeloId", "itemAdicionalId");

-- CreateIndex
CREATE INDEX "EmbalagemModeloCompatibilidade_embalagemModeloId_idx" ON "EmbalagemModeloCompatibilidade"("embalagemModeloId");

-- CreateIndex
CREATE INDEX "EmbalagemModeloCompatibilidade_classeId_idx" ON "EmbalagemModeloCompatibilidade"("classeId");

-- CreateIndex
CREATE INDEX "EmbalagemModeloCompatibilidade_categoriaId_idx" ON "EmbalagemModeloCompatibilidade"("categoriaId");

-- CreateIndex
CREATE INDEX "EmbalagemModeloCompatibilidade_produtoId_idx" ON "EmbalagemModeloCompatibilidade"("produtoId");

-- CreateIndex
CREATE INDEX "EmbalagemModeloCompatibilidade_ativo_idx" ON "EmbalagemModeloCompatibilidade"("ativo");

-- CreateIndex
CREATE INDEX "EmbalagemModeloCompatibilidade_prioridade_idx" ON "EmbalagemModeloCompatibilidade"("prioridade");

-- CreateIndex
CREATE UNIQUE INDEX "EmbalagemConfiguracao_chave_key" ON "EmbalagemConfiguracao"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoEmbalagemPlano_pedidoOnlineId_key" ON "PedidoEmbalagemPlano"("pedidoOnlineId");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlano_pedidoOnlineId_idx" ON "PedidoEmbalagemPlano"("pedidoOnlineId");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlano_status_idx" ON "PedidoEmbalagemPlano"("status");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlanoItem_planoId_idx" ON "PedidoEmbalagemPlanoItem"("planoId");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlanoItem_tipo_idx" ON "PedidoEmbalagemPlanoItem"("tipo");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlanoItem_itemAdicionalId_idx" ON "PedidoEmbalagemPlanoItem"("itemAdicionalId");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlanoItem_embalagemModeloId_idx" ON "PedidoEmbalagemPlanoItem"("embalagemModeloId");

-- CreateIndex
CREATE INDEX "PedidoEmbalagemPlanoItem_pedidoOnlineItemId_idx" ON "PedidoEmbalagemPlanoItem"("pedidoOnlineItemId");

-- CreateIndex
CREATE INDEX "Produto_embalagemClasseId_idx" ON "Produto"("embalagemClasseId");

-- CreateIndex
CREATE INDEX "Produto_embalagemModeloPreferencialId_idx" ON "Produto"("embalagemModeloPreferencialId");

-- CreateIndex
CREATE INDEX "Produto_embalagemPresentePadraoId_idx" ON "Produto"("embalagemPresentePadraoId");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_embalagemClasseId_fkey" FOREIGN KEY ("embalagemClasseId") REFERENCES "EmbalagemClasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_embalagemModeloPreferencialId_fkey" FOREIGN KEY ("embalagemModeloPreferencialId") REFERENCES "EmbalagemModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_embalagemPresentePadraoId_fkey" FOREIGN KEY ("embalagemPresentePadraoId") REFERENCES "EmbalagemModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbalagemModeloComponente" ADD CONSTRAINT "EmbalagemModeloComponente_embalagemModeloId_fkey" FOREIGN KEY ("embalagemModeloId") REFERENCES "EmbalagemModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbalagemModeloComponente" ADD CONSTRAINT "EmbalagemModeloComponente_itemAdicionalId_fkey" FOREIGN KEY ("itemAdicionalId") REFERENCES "ItemAdicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbalagemModeloCompatibilidade" ADD CONSTRAINT "EmbalagemModeloCompatibilidade_embalagemModeloId_fkey" FOREIGN KEY ("embalagemModeloId") REFERENCES "EmbalagemModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbalagemModeloCompatibilidade" ADD CONSTRAINT "EmbalagemModeloCompatibilidade_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "EmbalagemClasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbalagemModeloCompatibilidade" ADD CONSTRAINT "EmbalagemModeloCompatibilidade_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbalagemModeloCompatibilidade" ADD CONSTRAINT "EmbalagemModeloCompatibilidade_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEmbalagemPlano" ADD CONSTRAINT "PedidoEmbalagemPlano_pedidoOnlineId_fkey" FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEmbalagemPlanoItem" ADD CONSTRAINT "PedidoEmbalagemPlanoItem_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PedidoEmbalagemPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEmbalagemPlanoItem" ADD CONSTRAINT "PedidoEmbalagemPlanoItem_itemAdicionalId_fkey" FOREIGN KEY ("itemAdicionalId") REFERENCES "ItemAdicional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEmbalagemPlanoItem" ADD CONSTRAINT "PedidoEmbalagemPlanoItem_embalagemModeloId_fkey" FOREIGN KEY ("embalagemModeloId") REFERENCES "EmbalagemModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEmbalagemPlanoItem" ADD CONSTRAINT "PedidoEmbalagemPlanoItem_pedidoOnlineItemId_fkey" FOREIGN KEY ("pedidoOnlineItemId") REFERENCES "PedidoOnlineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
