-- CreateTable
CREATE TABLE "RegraCategoria" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "itemAdicionalId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraCategoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegraCategoria" ADD CONSTRAINT "RegraCategoria_itemAdicionalId_fkey" FOREIGN KEY ("itemAdicionalId") REFERENCES "ItemAdicional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
