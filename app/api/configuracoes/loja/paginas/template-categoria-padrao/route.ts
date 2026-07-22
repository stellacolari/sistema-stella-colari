import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protegerMutacaoConteudoLegado } from "@/lib/loja/conteudo/api-auth.server";

const BLOCOS_TEMPLATE_CATEGORIA = [
  {
    tipo: "CATEGORIA_HERO",
    titulo: "Hero da categoria",
    ordem: 0,
    configJson: {
      textoEtiqueta: "Categoria",
      titulo: "",
      subtitulo: "",
      imagemUrl: "",
      usarImagemCategoria: true,
      alinhamento: "CENTRO",
      fundo: "CLARO",
      tamanhoTitulo: "GRANDE",
      espacamento: "GRANDE",
      largura: "NORMAL",
    },
  },
  {
    tipo: "CATEGORIA_DESCRICAO",
    titulo: "Descrição da categoria",
    ordem: 1,
    configJson: {
      titulo: "",
      texto: "",
      alinhamento: "CENTRO",
      fundo: "BRANCO",
      espacamento: "MEDIO",
    },
  },
  {
    tipo: "CATEGORIA_SUBCATEGORIAS",
    titulo: "Subcategorias",
    ordem: 2,
    configJson: {
      titulo: "Explore por categoria",
      descricao: "Veja as subcategorias disponíveis.",
      colunas: 4,
      espacamento: "MEDIO",
    },
  },
  {
    tipo: "CATEGORIA_PRODUTOS",
    titulo: "Produtos da categoria",
    ordem: 3,
    configJson: {
      titulo: "",
      descricao: "",
      alinhamento: "ESQUERDA",
      modo: "GRADE",
      fonte: "CATEGORIA_ATUAL",
      limite: 24,
      produtosPorLinha: 4,
      linhasPorPagina: 3,
      paginacao: "CARREGAR_MAIS",
      mostrarFiltros: true,
      filtros: {
        categoria: true,
        preco: true,
        desconto: true,
        disponibilidade: true,
      },
      mostrarSetas: true,
    },
  },
  {
    tipo: "CATEGORIA_CTA",
    titulo: "CTA da categoria",
    ordem: 4,
    configJson: {
      titulo: "",
      texto: "",
      textoBotao: "Ver produtos",
      linkBotao: "",
      fundo: "AZUL_CLARO",
    },
  },
];

async function gerarSlugUnico(slugBase: string) {
  let slug = slugBase;
  let contador = 2;

  while (true) {
    const existente = await prisma.lojaPagina.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existente) {
      return slug;
    }

    slug = `${slugBase}-${contador}`;
    contador += 1;
  }
}

export async function POST(request: Request) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "executar",
    { tipos: ["TEMPLATE_CATEGORIA"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      let pagina = await tx.lojaPagina.findFirst({
        where: {
          tipo: "TEMPLATE_CATEGORIA",
          usarComoTemplatePadrao: true,
        },
        include: {
          blocos: true,
        },
      });

      if (!pagina) {
        pagina = await tx.lojaPagina.findFirst({
          where: {
            tipo: "TEMPLATE_CATEGORIA",
            slug: "template-categoria-padrao",
          },
          include: {
            blocos: true,
          },
        });
      }

      await tx.lojaPagina.updateMany({
        where: {
          tipo: "TEMPLATE_CATEGORIA",
          usarComoTemplatePadrao: true,
        },
        data: {
          usarComoTemplatePadrao: false,
        },
      });

      if (!pagina) {
        const slug = await gerarSlugUnico("template-categoria-padrao");

        pagina = await tx.lojaPagina.create({
          data: {
            titulo: "Template padrão de categoria",
            slug,
            tipo: "TEMPLATE_CATEGORIA",
            ativo: true,
            statusPublicacao: "PUBLICADA",
            usarComoTemplatePadrao: true,
            publicadoEm: new Date(),
          },
          include: {
            blocos: true,
          },
        });
      } else {
        pagina = await tx.lojaPagina.update({
          where: {
            id: pagina.id,
          },
          data: {
            titulo: pagina.titulo || "Template padrão de categoria",
            tipo: "TEMPLATE_CATEGORIA",
            ativo: true,
            statusPublicacao: "PUBLICADA",
            usarComoTemplatePadrao: true,
            publicadoEm: pagina.publicadoEm || new Date(),
          },
          include: {
            blocos: true,
          },
        });
      }

      const tiposExistentes = new Set(pagina.blocos.map((bloco) => bloco.tipo));

      for (const blocoPadrao of BLOCOS_TEMPLATE_CATEGORIA) {
        if (tiposExistentes.has(blocoPadrao.tipo)) {
          continue;
        }

        await tx.lojaPaginaBloco.create({
          data: {
            paginaId: pagina.id,
            tipo: blocoPadrao.tipo,
            titulo: blocoPadrao.titulo,
            ativo: true,
            ordem: blocoPadrao.ordem,
            configJson: blocoPadrao.configJson,
          },
        });
      }

      const paginaAtualizada = await tx.lojaPagina.findUnique({
        where: {
          id: pagina.id,
        },
        include: {
          blocos: {
            orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
          },
        },
      });

      return paginaAtualizada;
    });

    if (!resultado) {
      return NextResponse.json(
        { error: "Não foi possível criar o template." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      pagina: {
        id: resultado.id,
        titulo: resultado.titulo,
        slug: resultado.slug,
        tipo: resultado.tipo,
        totalBlocos: resultado.blocos.length,
      },
    });
  } catch (error) {
    console.error("Erro ao criar template padrão de categoria:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao criar template padrão de categoria.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
