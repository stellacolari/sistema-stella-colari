-- CreateTable
CREATE TABLE "LojaCategoriaHome" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaCategoriaHome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LojaSecaoHome" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categorias" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaSecaoHome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LojaBlocoHome" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "textoBotao" TEXT,
    "linkBotao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaBlocoHome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LojaCategoriaHome_categoria_idx" ON "LojaCategoriaHome"("categoria");

-- CreateIndex
CREATE INDEX "LojaCategoriaHome_ordem_idx" ON "LojaCategoriaHome"("ordem");

-- CreateIndex
CREATE INDEX "LojaSecaoHome_ordem_idx" ON "LojaSecaoHome"("ordem");
