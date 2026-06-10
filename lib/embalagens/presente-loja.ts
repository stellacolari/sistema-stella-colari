import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EmbalagemClient = PrismaClient | Prisma.TransactionClient;

type ProdutoEmbalagemPresenteInput = {
  id: string;
  categoria: string;
  embalagemClasseId?: string | null;
  permiteEmbalagemPresente?: boolean | null;
  embalagemPresentePadraoId?: string | null;
};

export type EmbalagemPresentePublica = {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  preco: number;
  permiteMensagem: boolean;
  mensagemLimiteCaracteres: number | null;
  mensagemPlaceholder: string | null;
  substituiEmbalagemPadrao: boolean;
};

type EmbalagemPresenteComScore = EmbalagemPresentePublica & {
  scoreCompatibilidade: number;
};

function textoSeguro(value: unknown) {
  return String(value ?? "").trim();
}

function normalizarMensagemPresente(value: unknown) {
  return textoSeguro(value).slice(0, 500);
}

async function buscarCategoriaProdutoId({
  client,
  categoria,
}: {
  client: EmbalagemClient;
  categoria: string;
}) {
  const categoriaProduto = await client.categoriaProduto.findFirst({
    where: {
      nome: categoria,
      ativo: true,
    },
    select: {
      id: true,
    },
  });

  return categoriaProduto?.id || null;
}

function getScoreCompatibilidade({
  compatibilidade,
  produto,
  categoriaId,
}: {
  compatibilidade: {
    produtoId: string | null;
    categoriaId: string | null;
    classeId: string | null;
    prioridade: number;
  };
  produto: ProdutoEmbalagemPresenteInput;
  categoriaId: string | null;
}) {
  const prioridade = Number(compatibilidade.prioridade || 0);

  if (compatibilidade.produtoId === produto.id) {
    return 300 + prioridade;
  }

  if (categoriaId && compatibilidade.categoriaId === categoriaId) {
    return 200 + prioridade;
  }

  if (
    produto.embalagemClasseId &&
    compatibilidade.classeId === produto.embalagemClasseId
  ) {
    return 100 + prioridade;
  }

  return Number.NEGATIVE_INFINITY;
}

export async function buscarEmbalagensPresentePublicas({
  client = prisma,
  produto,
  categoriaId,
}: {
  client?: EmbalagemClient;
  produto: ProdutoEmbalagemPresenteInput;
  categoriaId?: string | null;
}): Promise<EmbalagemPresentePublica[]> {
  if (produto.permiteEmbalagemPresente === false) {
    return [];
  }

  const categoriaProdutoId =
    categoriaId === undefined
      ? await buscarCategoriaProdutoId({ client, categoria: produto.categoria })
      : categoriaId;

  const filtrosCompatibilidade = [
    { produtoId: produto.id },
    ...(categoriaProdutoId ? [{ categoriaId: categoriaProdutoId }] : []),
    ...(produto.embalagemClasseId
      ? [{ classeId: produto.embalagemClasseId }]
      : []),
  ];

  if (filtrosCompatibilidade.length === 0) {
    return [];
  }

  const modelos = await client.embalagemModelo.findMany({
    where: {
      ativo: true,
      tipo: "INTERNA_PRESENTE",
      exibirNaLoja: true,
      compatibilidades: {
        some: {
          ativo: true,
          OR: filtrosCompatibilidade,
        },
      },
    },
    include: {
      compatibilidades: {
        where: {
          ativo: true,
          OR: filtrosCompatibilidade,
        },
      },
    },
  });

  return modelos
    .map((modelo): EmbalagemPresenteComScore | null => {
      const scoreCompatibilidade = modelo.compatibilidades.reduce(
        (melhorScore, compatibilidade) =>
          Math.max(
            melhorScore,
            getScoreCompatibilidade({
              compatibilidade,
              produto,
              categoriaId: categoriaProdutoId,
            })
          ),
        Number.NEGATIVE_INFINITY
      );

      if (scoreCompatibilidade === Number.NEGATIVE_INFINITY) {
        return null;
      }

      return {
        id: modelo.id,
        nome: modelo.nomePublico || modelo.nomeInterno,
        descricao: modelo.descricaoPublica,
        imagemUrl: modelo.imagemUrl,
        preco: Number(modelo.precoCliente || 0),
        permiteMensagem: modelo.permiteMensagem,
        mensagemLimiteCaracteres: modelo.mensagemLimiteCaracteres,
        mensagemPlaceholder: modelo.mensagemPlaceholder,
        substituiEmbalagemPadrao: modelo.substituiEmbalagemPadrao,
        scoreCompatibilidade:
          scoreCompatibilidade +
          (produto.embalagemPresentePadraoId === modelo.id ? 20 : 0),
      };
    })
    .filter((modelo): modelo is EmbalagemPresenteComScore => Boolean(modelo))
    .sort((a, b) => {
      if (a.scoreCompatibilidade !== b.scoreCompatibilidade) {
        return b.scoreCompatibilidade - a.scoreCompatibilidade;
      }

      return a.preco - b.preco;
    })
    .map((modelo) => ({
      id: modelo.id,
      nome: modelo.nome,
      descricao: modelo.descricao,
      imagemUrl: modelo.imagemUrl,
      preco: modelo.preco,
      permiteMensagem: modelo.permiteMensagem,
      mensagemLimiteCaracteres: modelo.mensagemLimiteCaracteres,
      mensagemPlaceholder: modelo.mensagemPlaceholder,
      substituiEmbalagemPadrao: modelo.substituiEmbalagemPadrao,
    }));
}

export async function validarEmbalagemPresenteCarrinho({
  client,
  produto,
  modeloId,
  mensagem,
}: {
  client: EmbalagemClient;
  produto: ProdutoEmbalagemPresenteInput;
  modeloId?: string | null;
  mensagem?: string | null;
}) {
  const id = textoSeguro(modeloId);

  if (!id) {
    return null;
  }

  const modelos = await buscarEmbalagensPresentePublicas({
    client,
    produto,
  });
  const modelo = modelos.find((item) => item.id === id);

  if (!modelo) {
    throw new Error(
      `A embalagem para presente selecionada não está disponível para ${produto.categoria}.`
    );
  }

  const mensagemNormalizada = normalizarMensagemPresente(mensagem);
  const limite = modelo.mensagemLimiteCaracteres;

  if (!modelo.permiteMensagem && mensagemNormalizada) {
    throw new Error("A embalagem para presente selecionada não aceita mensagem.");
  }

  if (limite !== null && mensagemNormalizada.length > limite) {
    throw new Error(
      `A mensagem do presente deve ter no máximo ${limite} caracteres.`
    );
  }

  return {
    ...modelo,
    mensagem: mensagemNormalizada || null,
  };
}
