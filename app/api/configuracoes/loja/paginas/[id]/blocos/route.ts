import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_BLOCO_VALIDOS = new Set([
  "BANNER",
  "FAIXA_DIFERENCIAIS",
  "TEXTO",
  "TEXTO_IMAGEM",
  "PRODUTOS",
  "LISTA_PRODUTOS",
  "DESTAQUES_CARDS",
  "CATEGORIAS",
  "IMAGEM_TEXTO",
  "ESPACADOR",

  "CATEGORIA_HERO",
  "CATEGORIA_DESCRICAO",
  "CATEGORIA_SUBCATEGORIAS",
  "CATEGORIA_PRODUTOS",
  "CATEGORIA_CTA",
  "RECOMENDACOES",
  "FORMULARIO",
  "FAQ",
]);

function getTituloPadrao(tipo: string) {
  const titulos: Record<string, string> = {
    BANNER: "Banner",
    FAIXA_DIFERENCIAIS: "Faixa de diferenciais",
    TEXTO: "Texto / título",
    TEXTO_IMAGEM: "Texto + imagem",
    PRODUTOS: "Produtos",
    LISTA_PRODUTOS: "Lista de produtos",
    DESTAQUES_CARDS: "Destaques / cards",
    CATEGORIAS: "Categorias",
    IMAGEM_TEXTO: "Imagem + texto",
    ESPACADOR: "Espaçador",

    CATEGORIA_HERO: "Hero da categoria",
    CATEGORIA_DESCRICAO: "Descrição da categoria",
    CATEGORIA_SUBCATEGORIAS: "Subcategorias",
    CATEGORIA_PRODUTOS: "Produtos da categoria",
    CATEGORIA_CTA: "CTA da categoria",
    FAQ: "FAQ",
    FORMULARIO: "Formulário",
    RECOMENDACOES: "Recomendações",
  };

  return titulos[tipo] || tipo;
}

function getTextStylePadrao(kind: string) {
  if (kind.includes("botao") || kind.includes("Botao")) {
    return {
      fontSizePreset: "PEQUENO",
      fontWeight: "SEMIBOLD",
      colorPreset: "PADRAO",
      colorCustom: "",
      letterSpacing: "NORMAL",
      textTransform: "NORMAL",
      textAlign: "CENTRO",
    };
  }

  if (kind.includes("subtitulo") || kind.includes("texto") || kind.includes("Texto")) {
    return {
      fontSizePreset: "MEDIO",
      fontWeight: "REGULAR",
      colorPreset: "PADRAO",
      colorCustom: "",
      letterSpacing: "NORMAL",
      textTransform: "NORMAL",
      textAlign: "ESQUERDA",
    };
  }

  return {
    fontSizePreset: "GRANDE",
    fontWeight: "LIGHT",
    colorPreset: "PADRAO",
    colorCustom: "",
    letterSpacing: "NORMAL",
    textTransform: "NORMAL",
    textAlign: "ESQUERDA",
  };
}

function getConfigPadrao(tipo: string) {
  if (tipo === "BANNER") {
    return {
      exibirMidia: true,
      tipoMidia: "IMAGEM",
      exibirTexto: true,
      exibirSubtitulo: true,
      exibirBotaoPrimario: true,
      exibirBotaoSecundario: false,
      imagemDesktop: "",
      imagemDesktopUrl: "",
      imagemMobile: "",
      imagemMobileUrl: "",
      videoDesktopUrl: "",
      videoMobileUrl: "",
      videoPosterUrl: "",
      videoLoop: true,
      videoSom: "MUDO",
      linkUrl: "",
      textoBotao: "Conhecer",
      textoBotaoSecundario: "",
      linkBotaoSecundario: "",
      alinhamentoConteudo: "ESQUERDA",
      alturaBanner: "PADRAO",
      overlayBanner: "LEVE",
      corTextoBanner: "CLARO",
      mediaCropDesktopX: 50,
      mediaCropDesktopY: 50,
      mediaCropMobileX: 50,
      mediaCropMobileY: 50,
      mediaPositionDesktop: "center center",
      mediaPositionMobile: "center center",
      alturaDesktop: 520,
      alturaMobile: 320,
      tituloStyle: getTextStylePadrao("tituloStyle"),
      subtituloStyle: getTextStylePadrao("subtituloStyle"),
      botaoPrimarioStyle: getTextStylePadrao("botaoPrimarioStyle"),
      botaoSecundarioStyle: getTextStylePadrao("botaoSecundarioStyle"),
    };
  }

  if (tipo === "FAIXA_DIFERENCIAIS") {
    return {
      itens: ["Frete Grátis*", "Garantia Vitalícia"],
      corFundo: "#2e7b99",
      corTexto: "#ffffff",
    };
  }

  if (tipo === "TEXTO") {
    return {
      titulo: "Título da seção",
      texto: "Texto de apoio da seção.",
      alinhamento: "CENTRO",
      fundo: "BRANCO",
      espacamento: "MEDIO",
    };
  }

  if (tipo === "PRODUTOS" || tipo === "LISTA_PRODUTOS") {
    return {
      titulo: "Produtos",
      descricao: "",
      tituloPrincipal: "",
      descricaoPrincipal: "",
      alinhamentoPrincipal: "CENTRO",
      alinhamento: "ESQUERDA",
      modo: "CARROSSEL",
      layoutDesktop: tipo === "LISTA_PRODUTOS" ? "GRID" : "CARROSSEL",
      layoutMobile: "GRID",
      fonte: "TODOS",
      categoriaId: "",
      categoriaSlug: "",
      categoriaNome: "",
      categoriasIds: [],
      categoriasSlugs: [],
      categorias: [],
      produtosIds: [],
      limite: 12,
      colunasDesktop: 4,
      colunasTablet: 3,
      colunasMobile: 2,
      exibirPreco: true,
      exibirBotao: true,
      textoBotao: "Comprar",
      exibirSeloDesconto: true,
      corFundo: "BRANCO",
      espacamento: "PADRAO",
      tituloStyle: getTextStylePadrao("tituloStyle"),
      subtituloStyle: getTextStylePadrao("subtituloStyle"),
      nomeProdutoStyle: getTextStylePadrao("nomeProdutoStyle"),
      precoProdutoStyle: getTextStylePadrao("precoProdutoStyle"),
      botaoStyle: getTextStylePadrao("botaoStyle"),
      mostrarSetas: true,
      produtosPorLinha: 4,
      linhasPorPagina: 2,
      paginacao: "NUMEROS",
      mostrarFiltros: false,
      filtros: {
        categoria: false,
        preco: false,
        desconto: false,
        disponibilidade: false,
      },
    };
  }

  if (tipo === "IMAGEM_TEXTO" || tipo === "TEXTO_IMAGEM") {
    return {
      exibirMidia: true,
      tipoMidia: "IMAGEM",
      imagemUrl: "",
      imagemDesktopUrl: "",
      imagemDesktop: "",
      imagemMobileUrl: "",
      imagemMobile: "",
      videoDesktopUrl: "",
      videoMobileUrl: "",
      mediaCropDesktopX: 50,
      mediaCropDesktopY: 50,
      mediaCropMobileX: 50,
      mediaCropMobileY: 50,
      mediaPositionDesktop: "center center",
      mediaPositionMobile: "center center",
      posicaoImagem: "ESQUERDA",
      layoutDesktop: "IMAGEM_ESQUERDA",
      layoutMobile: "IMAGEM_ACIMA",
      titulo: "Título do bloco",
      texto: "Texto do bloco.",
      textoBotao: "",
      linkBotao: "",
      exibirBotao: true,
      corFundo: "BRANCO",
      espacamento: "PADRAO",
      tituloStyle: getTextStylePadrao("tituloStyle"),
      textoStyle: getTextStylePadrao("textoStyle"),
      botaoStyle: getTextStylePadrao("botaoStyle"),
      altura: 420,
    };
  }

  if (tipo === "DESTAQUES_CARDS") {
    const cardBase = {
      exibirMidia: true,
      tipoMidia: "ICONE",
      imagemUrl: "",
      imagemDesktopUrl: "",
      imagemMobileUrl: "",
      videoDesktopUrl: "",
      videoMobileUrl: "",
      mediaCropDesktopX: 50,
      mediaCropDesktopY: 50,
      mediaCropMobileX: 50,
      mediaCropMobileY: 50,
      mediaPositionDesktop: "center center",
      mediaPositionMobile: "center center",
      exibirBotao: false,
      textoBotao: "Saiba mais",
      linkBotao: "",
    };

    return {
      titulo: "Destaques",
      descricao: "Benefícios, coleções ou chamadas especiais da loja.",
      layoutDesktop: "GRID",
      layoutMobile: "GRID",
      colunasDesktop: 3,
      colunasTablet: 2,
      colunasMobile: 1,
      alinhamento: "CENTRO",
      corFundo: "BRANCO",
      espacamento: "PADRAO",
      tituloSecaoStyle: getTextStylePadrao("tituloSecaoStyle"),
      subtituloSecaoStyle: getTextStylePadrao("subtituloSecaoStyle"),
      cardTituloStyle: getTextStylePadrao("cardTituloStyle"),
      cardTextoStyle: getTextStylePadrao("cardTextoStyle"),
      cardBotaoStyle: getTextStylePadrao("cardBotaoStyle"),
      cards: [
        {
          ...cardBase,
          id: "card-1",
          titulo: "Destaque principal",
          texto: "Use este card para comunicar um benefício ou coleção.",
          icone: "★",
        },
        {
          ...cardBase,
          id: "card-2",
          titulo: "Chamada comercial",
          texto: "Adicione links internos, mídia ou um ícone simples.",
          icone: "✓",
        },
        {
          ...cardBase,
          id: "card-3",
          titulo: "Benefício da loja",
          texto: "Organize diferenciais em grid ou carrossel.",
          icone: "+",
        },
      ],
    };
  }

  if (tipo === "CATEGORIAS") {
    return {
      titulo: "Categorias",
      descricao: "",
      categorias: [],
      colunas: 3,
      espacamento: "MEDIO",
    };
  }

  if (tipo === "ESPACADOR") {
    return {
      altura: 64,
    };
  }

  if (tipo === "CATEGORIA_HERO") {
    return {
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
    };
  }

  if (tipo === "CATEGORIA_DESCRICAO") {
    return {
      titulo: "",
      texto: "",
      alinhamento: "CENTRO",
      fundo: "BRANCO",
      espacamento: "MEDIO",
    };
  }

  if (tipo === "CATEGORIA_SUBCATEGORIAS") {
    return {
      titulo: "Explore por categoria",
      descricao: "Veja as subcategorias disponíveis.",
      colunas: 4,
      espacamento: "MEDIO",
    };
  }

  if (tipo === "CATEGORIA_PRODUTOS") {
    return {
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
    };
  }
    if (tipo === "RECOMENDACOES") {
    return {
      titulo: "Você também pode gostar",
      descricao: "Produtos selecionados para complementar sua escolha.",
      tituloPrincipal: "",
      descricaoPrincipal: "",
      alinhamentoPrincipal: "CENTRO",
      alinhamento: "ESQUERDA",
      modo: "CARROSSEL",
      fonte: "MAIS_VENDIDOS",
      categorias: [],
      produtosIds: [],
      limite: 8,
      mostrarSetas: true,
      produtosPorLinha: 4,
      linhasPorPagina: 2,
      paginacao: "NUMEROS",
      mostrarFiltros: false,
      filtros: {
        categoria: false,
        preco: false,
        desconto: false,
        disponibilidade: false,
      },
    };
  }

  if (tipo === "CATEGORIA_CTA") {
    return {
      titulo: "",
      texto: "",
      textoBotao: "Ver produtos",
      linkBotao: "",
      fundo: "AZUL_CLARO",
    };
  }
  if (tipo === "FORMULARIO") {
  return {
    titulo: "Fale com a Stella",
    descricao: "Preencha seus dados e entraremos em contato.",
    textoBotao: "Enviar",
    mensagemSucesso: "Recebemos suas informações com sucesso.",
    alinhamento: "CENTRO",
    fundo: "BRANCO",
    espacamento: "MEDIO",
    largura: "NORMAL",
    mostrarNome: true,
    mostrarTelefone: true,
    mostrarEmail: true,
    mostrarCidade: false,
    mostrarMensagem: true,
    mostrarMarketing: false,
  };
}
if (tipo === "FAQ") {
  return {
    titulo: "Perguntas frequentes",
    descricao: "",
    estilo: "ACORDEAO",
    alinhamento: "CENTRO",
    fundo: "BRANCO",
    espacamento: "MEDIO",
    largura: "NORMAL",
    itens: [
      {
        pergunta: "Qual é o prazo de envio?",
        resposta:
          "O prazo pode variar conforme o endereço e a forma de envio escolhida.",
      },
      {
        pergunta: "Posso trocar meu produto?",
        resposta:
          "Sim. Consulte a política de troca ou entre em contato com nosso atendimento.",
      },
    ],
  };
}
  return {};
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const tipo = String(body.tipo || "").trim();
    const titulo = String(body.titulo || "").trim();

    if (!TIPOS_BLOCO_VALIDOS.has(tipo)) {
      return NextResponse.json(
        { error: "Tipo de bloco inválido." },
        { status: 400 }
      );
    }

    const pagina = await prisma.lojaPagina.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!pagina) {
      return NextResponse.json(
        { error: "Página não encontrada." },
        { status: 404 }
      );
    }

    const ultimoBloco = await prisma.lojaPaginaBloco.findFirst({
      where: {
        paginaId: id,
      },
      orderBy: {
        ordem: "desc",
      },
      select: {
        ordem: true,
      },
    });

    const proximaOrdem =
      ultimoBloco && Number.isFinite(Number(ultimoBloco.ordem))
        ? ultimoBloco.ordem + 1
        : 0;

    const bloco = await prisma.lojaPaginaBloco.create({
      data: {
        paginaId: id,
        tipo,
        titulo: titulo || getTituloPadrao(tipo),
        ativo: true,
        ordem: proximaOrdem,
        configJson: getConfigPadrao(tipo),
      },
    });

    return NextResponse.json({ bloco });
  } catch (error) {
    console.error("Erro ao criar bloco da página:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar bloco da página.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
