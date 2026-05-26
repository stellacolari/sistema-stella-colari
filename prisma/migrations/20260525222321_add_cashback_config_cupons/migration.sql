-- DropForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" DROP CONSTRAINT "PedidoOnlineItemAdicional_pedidoOnlineId_fkey";

-- AlterTable
ALTER TABLE "PedidoOnline" ADD COLUMN     "cashbackBloqueadoMotivo" TEXT,
ADD COLUMN     "cashbackPercentualAplicado" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cupomCodigo" TEXT,
ADD COLUMN     "cupomDescontoValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cupomId" TEXT;

-- CreateTable
CREATE TABLE "LojaCashbackConfiguracao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL DEFAULT 'PADRAO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "percentualPrimeiraCompra" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "percentualCompraRecorrente" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "somenteClienteCadastrado" BOOLEAN NOT NULL DEFAULT true,
    "permitirComCupom" BOOLEAN NOT NULL DEFAULT false,
    "permitirProdutoComDesconto" BOOLEAN NOT NULL DEFAULT true,
    "diasValidade" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaCashbackConfiguracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CupomLoja" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "valorMinimoPedido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "limiteUsoTotal" INTEGER,
    "limiteUsoPorCliente" INTEGER,
    "quantidadeUsada" INTEGER NOT NULL DEFAULT 0,
    "bloqueiaCashback" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CupomLoja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LojaCashbackConfiguracao_chave_key" ON "LojaCashbackConfiguracao"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "CupomLoja_codigo_key" ON "CupomLoja"("codigo");

-- CreateIndex
CREATE INDEX "CupomLoja_codigo_idx" ON "CupomLoja"("codigo");

-- CreateIndex
CREATE INDEX "CupomLoja_ativo_idx" ON "CupomLoja"("ativo");

-- CreateIndex
CREATE INDEX "CupomLoja_dataInicio_idx" ON "CupomLoja"("dataInicio");

-- CreateIndex
CREATE INDEX "CupomLoja_dataFim_idx" ON "CupomLoja"("dataFim");

-- CreateIndex
CREATE INDEX "CupomLoja_bloqueiaCashback_idx" ON "CupomLoja"("bloqueiaCashback");

-- CreateIndex
CREATE INDEX "PedidoOnline_cupomId_idx" ON "PedidoOnline"("cupomId");

-- CreateIndex
CREATE INDEX "PedidoOnline_cupomCodigo_idx" ON "PedidoOnline"("cupomCodigo");

-- CreateIndex
CREATE INDEX "PedidoOnlineItemAdicional_pedidoOnlineId_idx" ON "PedidoOnlineItemAdicional"("pedidoOnlineId");

-- AddForeignKey
ALTER TABLE "PedidoOnline" ADD CONSTRAINT "PedidoOnline_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "CupomLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" ADD CONSTRAINT "PedidoOnlineItemAdicional_pedidoOnlineId_fkey" FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
