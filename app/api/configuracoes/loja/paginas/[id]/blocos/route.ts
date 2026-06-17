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
  "COLECOES_CATEGORIAS",
  "MOSAICO_COLECOES",
  "HERO_EDITORIAL_PNG",
  "GALERIA_EDITORIAL_FULL_BLEED",
  "VITRINE_EDITORIAL",
  "CTA",
  "CTA_SIMPLES",
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
    COLECOES_CATEGORIAS: "Coleções / categorias",
    MOSAICO_COLECOES: "Mosaico de coleções",
    HERO_EDITORIAL_PNG: "Hero Editorial com PNG",
    GALERIA_EDITORIAL_FULL_BLEED: "Galeria Editorial",
    VITRINE_EDITORIAL: "Vitrine editorial",
    CTA: "Chamada para ação",
    CTA_SIMPLES: "CTA simples",
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
      modeloBanner: "HERO_PRINCIPAL",
      textoPrincipal: "STELLA COLARI",
      varianteVisual: "BRANCO_AZUL",
      animarLetras: true,
      velocidadeAnimacao: "MEDIA",
      mostrarTitulo: true,
      mostrarSubtitulo: true,
      mostrarCta: true,
      animacaoElementos: "SEM_ANIMACAO",
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
      alinhamentoTextoDesktop: "ESQUERDA",
      alinhamentoTextoMobile: "CENTRO",
      estiloBordaBotao: "PILULA",
      alturaBanner: "PADRAO",
      larguraBanner: "FULL_BLEED",
      overlayBanner: "LEVE",
      corTextoBanner: "CLARO",
      alinhamentoVertical: "CENTRO",
      margemSeguraX: 8,
      margemSeguraY: 8,
      larguraTextoPercentual: 58,
      fonteTituloDesktop: 68,
      fonteTituloMobile: 42,
      lineHeightTitulo: 0.98,
      letterSpacingTitulo: 0,
      mediaZoomDesktop: 100,
      mediaZoomMobile: 100,
      imagemFrenteDesktopUrl: "",
      imagemFrenteMobileUrl: "",
      imagemFrenteAlt: "",
      imagemFrenteX: 74,
      imagemFrenteY: 56,
      imagemFrenteLarguraDesktop: 34,
      imagemFrenteLarguraMobile: 56,
      estiloCtaBanner: "PREENCHIDO",
      ctaNovaAba: false,
      produtosFlutuantesAtivos: false,
      produtosIds: [],
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
      categoriasNomes: [],
      categorias: [],
      produtosIds: [],
      colecaoInteligenteId: "",
      colecaoInteligenteSlug: "",
      colecaoInteligenteNome: "",
      ordenacaoColecao: "ORDEM_APROVADA",
      incluirSugeridosColecao: false,
      limite: 12,
      colunasDesktop: 4,
      colunasTablet: 3,
      colunasMobile: 2,
      exibirPreco: true,
      exibirBotao: true,
      textoBotao: "Comprar",
      exibirSeloDesconto: true,
      exibirSetasCarrossel: true,
      posicaoSetasCarrossel: "LATERAIS",
      estiloSetasCarrossel: "CIRCULO",
      navegarPor: "PAGINA",
      alinhamentoTextoDesktop: "CENTRO",
      alinhamentoTextoMobile: "CENTRO",
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
        tamanho: false,
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
      estiloBordaBotao: "PILULA",
      larguraMidiaDesktop: "CONTIDA",
      larguraMidiaMobile: "CONTIDA",
      alinhamentoTextoDesktop: "ESQUERDA",
      alinhamentoTextoMobile: "CENTRO",
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
      alinhamentoTextoDesktop: "CENTRO",
      alinhamentoTextoMobile: "CENTRO",
      estiloBordaBotao: "PILULA",
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

  if (tipo === "COLECOES_CATEGORIAS" || tipo === "MOSAICO_COLECOES") {
    const criarItem = (index: number) => ({
      id: `colecao-${index}`,
      tipoLink: "PERSONALIZADO",
      categoriaId: "",
      categoriaSlug: "",
      categoriaNome: "",
      titulo: "",
      subtitulo: "",
      tituloRichText: null,
      subtituloRichText: null,
      textoLink: "Explorar",
      linkUrl: "",
      imagemDesktopUrl: "",
      imagemMobileUrl: "",
      tipoMidia: "IMAGEM",
      videoDesktopUrl: "",
      videoMobileUrl: "",
      mediaPositionDesktop: "center center",
      mediaPositionMobile: "center center",
      mediaCropDesktopX: 50,
      mediaCropDesktopY: 50,
      mediaCropMobileX: 50,
      mediaCropMobileY: 50,
      tamanhoMosaico: "AUTO",
      ordem: index - 1,
    });

    return {
      titulo: "",
      subtitulo: "",
      descricao: "",
      tituloRichText: null,
      subtituloRichText: null,
      tipoCabecalho: "TEXTO",
      logoTituloUrl: "",
      logoTituloMobileUrl: "",
      logoTituloAlt: "",
      logoTituloLarguraDesktop: 420,
      logoTituloLarguraMobile: 260,
      logoTituloPosicao: "ABAIXO",
      imagemTituloUrl: "",
      imagemTituloMobileUrl: "",
      imagemTituloAlt: "",
      imagemTituloLarguraDesktop: 520,
      imagemTituloLarguraMobile: 300,
      alinhamentoCabecalhoDesktop: "ESQUERDA",
      alinhamentoCabecalhoMobile: "ESQUERDA",
      layoutVisual: "MOSAICO_EDITORIAL",
      presetMosaico: "MOSAICO_4_EDITORIAL",
      gapMosaico: "PADRAO",
      origemItens: "PERSONALIZADO",
      alinhamentoTextoDesktop: "ESQUERDA",
      alinhamentoTextoMobile: "ESQUERDA",
      corFundo: "BRANCO",
      espacamento: "PADRAO",
      espacamentoVertical: "PADRAO",
      espacamentoHorizontal: "PADRAO",
      larguraConteudo: "LARGA",
      colunasDesktop: 4,
      colunasTablet: 2,
      colunasMobile: 1,
      estiloEtiqueta: "SOBREPOSTA",
      tamanhoEtiqueta: "PEQUENA",
      posicaoEtiqueta: "INFERIOR_ESQUERDA",
      larguraEtiqueta: "AUTO",
      exibirLinhaEtiqueta: true,
      exibirEtiqueta: true,
      exibirBotaoEtiqueta: false,
      cardInteiroClicavel: true,
      larguraCabecalhoDesktop: 32,
      posicaoCabecalhoMosaico: "LATERAL",
      estiloBordaBotao: "RETO",
      itens: [1, 2, 3, 4].map(criarItem),
    };
  }

  if (tipo === "VITRINE_EDITORIAL") {
    const criarItem = (index: number) => ({
      id: `vitrine-${index}`,
      tipoLink: "CATEGORIA",
      categoriaId: "",
      categoriaSlug: "",
      categoriaNome: "",
      categoriaImagemUrl: "",
      paginaId: "",
      paginaSlug: "",
      paginaTitulo: "",
      linkUrl: "",
      label: "",
      textoBotao: "Explorar",
      imagemDesktop: "",
      imagemMobile: "",
      altText: "",
      focoHorizontal: 50,
      focoVertical: 50,
      zoom: 100,
      ocultarNome: false,
      ocultarBotao: false,
      abrirNovaAba: false,
    });

    return {
      quantidadeItens: 3,
      alturaVisual: "PADRAO",
      animacaoBloco: "SUBINDO_EM_SEQUENCIA",
      itens: [1, 2, 3].map(criarItem),
    };
  }

  if (tipo === "HERO_EDITORIAL_PNG") {
    return {
      variante: "COMPACTO",
      fundo: {
        tipo: "COR",
        cor: "#223846",
      },
      texto: {
        conteudo: "STELLA COLARI",
        linhas: "AUTO",
        alinhamento: "CENTRO",
        margemSeguraPercentual: 8,
        cor: "#f8fafc",
        preset: "EDITORIAL",
        peso: "BOLD",
        tracking: -0.04,
        lineHeight: 0.86,
        escalaAuto: true,
      },
      png: {
        imagemDesktop: "",
        imagemMobile: "",
        alt: "",
        escalaDesktop: 68,
        escalaMobile: 96,
        posicaoXDesktop: 58,
        posicaoYDesktop: 50,
        posicaoXMobile: 50,
        posicaoYMobile: 52,
        sombra: true,
        opacidade: 100,
      },
      cta: {
        mostrar: false,
        label: "Nova coleção",
        titulo: "Peças para atravessar o tempo.",
        textoBotao: "Conhecer",
        linkTipo: "URL",
        linkValor: "/loja",
        posicao: "INFERIOR_ESQUERDA",
      },
      animacao: {
        entradaTexto: "FADE_UP",
        entradaPng: "FLOAT_UP",
        hover: "PNG_FLOAT",
      },
      responsivo: {
        comportamentoMobile: "COMPACTAR",
      },
    };
  }

  if (tipo === "GALERIA_EDITORIAL_FULL_BLEED") {
    const criarItem = (index: number) => ({
      id: `galeria-${index}`,
      imagemDesktop: "",
      imagemMobile: "",
      alt: "",
      produtoId: "",
      titulo: "",
      subtitulo: "",
      mostrarTexto: false,
      botaoTexto: "Explorar",
      mostrarBotao: false,
      botaoApenasHover: false,
      linkTipo: "URL",
      linkValor: "",
      posicaoTexto: "INFERIOR_ESQUERDO",
      focoX: 50,
      focoY: 50,
      zoom: 100,
      overlayOpacidade: 18,
    });

    return {
      layout: {
        colunas: 4,
        varianteAltura: "PADRAO",
        gap: 8,
        fullBleed: true,
        comportamentoMobile: "CARROSSEL",
      },
      fonte: {
        tipo: "MANUAL",
        produtosIds: [],
        colecaoId: "",
        colecaoSlug: "",
        campanhaId: "",
        incluirSugeridos: false,
        quantidade: 4,
        ordem: "ORDEM_APROVADA",
      },
      itens: [1, 2, 3, 4].map(criarItem),
      hover: {
        tipo: "ZOOM_LEVE",
        intensidade: 1,
      },
      design: {
        fundo: "#ffffff",
        raio: 0,
        espacamentoVertical: 0,
      },
    };
  }

  if (tipo === "CTA" || tipo === "CTA_SIMPLES") {
    return {
      titulo: "",
      texto: "",
      descricao: "",
      conteudo: "",
      tituloRichText: null,
      textoRichText: null,
      exibirTexto: true,
      exibirBotaoPrimario: true,
      textoBotaoPrimario: "Saiba mais",
      linkBotaoPrimario: "",
      textoBotao: "Saiba mais",
      botaoTexto: "Saiba mais",
      linkBotao: "",
      botaoLink: "",
      linkUrl: "",
      exibirBotaoSecundario: false,
      textoBotaoSecundario: "",
      linkBotaoSecundario: "",
      alinhamento: "CENTRO",
      alinhamentoTextoDesktop: "CENTRO",
      alinhamentoTextoMobile: "CENTRO",
      larguraConteudo: "MEDIA",
      estiloBordaBotao: "PILULA",
      corFundo: "BRANCO",
      espacamento: "PADRAO",
      exibirMidia: false,
      tipoMidia: "IMAGEM",
      imagemUrl: "",
      imagemDesktopUrl: "",
      imagemDesktop: "",
      imagemMobileUrl: "",
      imagemMobile: "",
      videoDesktopUrl: "",
      videoMobileUrl: "",
      videoPosterUrl: "",
      videoLoop: true,
      videoSom: "MUDO",
      mediaCropDesktopX: 50,
      mediaCropDesktopY: 50,
      mediaCropMobileX: 50,
      mediaCropMobileY: 50,
      mediaPositionDesktop: "center center",
      mediaPositionMobile: "center center",
      layoutDesktop: "TEXTO_CENTRALIZADO",
      layoutMobile: "TEXTO_CENTRALIZADO",
      tituloStyle: getTextStylePadrao("tituloStyle"),
      textoStyle: getTextStylePadrao("textoStyle"),
      botaoPrimarioStyle: getTextStylePadrao("botaoPrimarioStyle"),
      botaoSecundarioStyle: getTextStylePadrao("botaoSecundarioStyle"),
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
