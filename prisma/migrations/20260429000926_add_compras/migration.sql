-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "descontoPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotalBruto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotalFinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraItem" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "tipoItem" TEXT NOT NULL,
    "codigoDigitado" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitarioBase" DOUBLE PRECISION NOT NULL,
    "valorUnitarioFinal" DOUBLE PRECISION NOT NULL,
    "valorTotalBase" DOUBLE PRECISION NOT NULL,
    "valorTotalFinal" DOUBLE PRECISION NOT NULL,
    "parcelaFrete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotalComFrete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "produtoId" TEXT,
    "itemAdicionalId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Compra_codigo_key" ON "Compra"("codigo");

-- AddForeignKey
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
