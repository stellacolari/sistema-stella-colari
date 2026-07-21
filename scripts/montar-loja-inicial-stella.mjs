import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const prisma = new PrismaClient();

const CONFIRMACAO = "MONTAR_LOJA_INICIAL_STELLA";
const NAMESPACE = "loja-inicial-2026-07";
const VERSAO = 2;
const SNAPSHOT_DIR = path.join("tmp", "auditorias");

function valorArg(nome) {
  const prefixo = `--${nome}=`;
  const argumento = process.argv.slice(2).find((item) => item.startsWith(prefixo));
  return argumento ? argumento.slice(prefixo.length) : null;
}

function temFlag(nome) {
  return process.argv.includes(`--${nome}`);
}

function registro(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function setupDe(value) {
  const setup = registro(registro(value)._stellaSetup);
  return {
    namespace: String(setup.namespace || ""),
    key: String(setup.key || ""),
    version: Number(setup.version || 0),
  };
}

function pertenceMissao(value) {
  return setupDe(value).namespace === NAMESPACE;
}

function paginaPertenceMissao(pagina) {
  return Boolean(
    pagina?.blocos?.some((blocoAtual) => pertenceMissao(blocoAtual.configJson))
  );
}

function missaoJaAplicada(estado) {
  return (
    estado.paginas.some((pagina) => paginaPertenceMissao(pagina)) ||
    pertenceMissao(estado.rodape?.configJson)
  );
}

function blocoDaMissaoPorChave(pagina, key) {
  return pagina?.blocos?.find((blocoAtual) => {
    const setup = setupDe(blocoAtual.configJson);
    return setup.namespace === NAMESPACE && setup.key === key;
  });
}

function comSetup(key, config) {
  return {
    ...config,
    _stellaSetup: {
      namespace: NAMESPACE,
      key,
      version: VERSAO,
    },
  };
}

function elementoTexto(id, tipo, conteudo, opcoes = {}) {
  const titulo = tipo === "titulo";
  const botao = tipo === "botaoLabel";

  return {
    id,
    tipo,
    conteudo,
    estilo: {
      fonte: "PRINCIPAL",
      peso: titulo ? "MEDIUM" : botao ? "SEMIBOLD" : "REGULAR",
      tamanho: titulo ? "clamp(2.35rem, 6vw, 5.5rem)" : botao ? "0.875rem" : "1.125rem",
      cor: opcoes.cor || "#ffffff",
      alinhamento: opcoes.alinhamento || "CENTRO",
      letterSpacing: titulo ? "0.02em" : botao ? "0.06em" : "0",
      lineHeight: titulo ? "1.02" : "1.55",
      link: "",
      preset: "CUSTOMIZADO",
      ...opcoes.estilo,
    },
  };
}

function botaoHero(id, texto, linkValor, variante = "PREENCHIDO") {
  const preenchido = variante === "PREENCHIDO";

  return {
    id,
    texto,
    linkTipo: "URL",
    linkValor,
    abrirNovaAba: false,
    estilo: {
      variante,
      corFundo: preenchido ? "#ffffff" : "transparent",
      corTexto: preenchido ? "#0f172a" : "#ffffff",
      corBorda: "#ffffff",
      tamanho: "MEDIO",
      paddingX: 22,
      paddingY: 11,
    },
    hover: {
      opacidade: 88,
    },
  };
}

function criarHero({
  titulo,
  texto,
  eyebrow = "Stella Colari",
  altura = "50VH",
  ctaPrimario,
  ctaSecundario,
}) {
  const botoes = [
    ctaPrimario ? botaoHero("cta-primario", ctaPrimario.texto, ctaPrimario.href) : null,
    ctaSecundario
      ? botaoHero("cta-secundario", ctaSecundario.texto, ctaSecundario.href, "CONTORNADO")
      : null,
  ].filter(Boolean);

  return {
    tipo: "BANNER_HERO_V2",
    altura,
    largura: "FULL_BLEED",
    headerTransparente: false,
    headerTextoClaro: false,
    transicaoHeaderAoScroll: true,
    navegacaoInferior: "NENHUMA",
    carrossel: {
      ativo: false,
      autoplay: false,
      tempoPadraoMs: 5000,
      pausarAoHover: true,
      transicao: "FADE",
      mostrarControles: false,
    },
    slides: [
      {
        id: "slide-principal",
        tipoMidia: "IMAGEM",
        midia: {
          desktop: {
            url: "",
            alt: "Composição editorial Stella Colari",
            aspectRatio: "16:9",
            zoom: 100,
            positionX: 50,
            positionY: 50,
          },
          mobile: {
            url: "",
            alt: "Composição editorial Stella Colari",
            aspectRatio: "4:5",
            zoom: 100,
            positionX: 50,
            positionY: 50,
          },
          usarMidiaMobileAlternativa: false,
        },
        video: {
          url: "",
          mobileUrl: "",
          posterUrl: "",
          loop: true,
          mutado: true,
          autoplay: true,
          avancarAoFim: false,
        },
        overlay: {
          ativo: true,
          cor: "#163442",
          opacidade: 58,
        },
        conteudo: {
          ativo: true,
          posicao: "CENTRO",
          posicaoDesktop: "CENTRO",
          posicaoMobile: "CENTRO",
          largura: "LARGA",
          alinhamento: "CENTRO",
          mostrarEyebrow: Boolean(eyebrow),
          mostrarTitulo: true,
          mostrarTexto: Boolean(texto),
          eyebrow: elementoTexto("hero-eyebrow", "subtitulo", eyebrow, {
            estilo: {
              tamanho: "0.75rem",
              peso: "SEMIBOLD",
              letterSpacing: "0.2em",
              lineHeight: "1.2",
            },
          }),
          titulo: elementoTexto("hero-titulo", "titulo", titulo),
          texto: elementoTexto("hero-texto", "paragrafo", texto, {
            estilo: {
              tamanho: "1.125rem",
              lineHeight: "1.6",
            },
          }),
          botoes,
        },
        tempoMs: 5000,
        linkSlide: {
          tipo: "URL",
          valor: "",
          abrirNovaAba: false,
        },
      },
    ],
  };
}

function criarItemCategoria(categoria, index) {
  return {
    id: `categoria-${categoria.slug}`,
    tipoLink: "CATEGORIA",
    categoriaId: categoria.id,
    categoriaSlug: categoria.slug,
    categoriaNome: categoria.nome,
    titulo: categoria.nome,
    subtitulo: "",
    textoLink: "Explorar",
    linkUrl: `/loja/categoria/${categoria.slug}`,
    imagemDesktopUrl: categoria.imagemUrl || "",
    imagemMobileUrl: categoria.imagemUrl || "",
    tipoMidia: "IMAGEM",
    videoDesktopUrl: "",
    videoMobileUrl: "",
    mediaPositionDesktop: "center center",
    mediaPositionMobile: "center center",
    mediaCropDesktopX: 50,
    mediaCropDesktopY: 50,
    mediaCropMobileX: 50,
    mediaCropMobileY: 50,
    mediaZoomDesktop: 100,
    mediaZoomMobile: 100,
    tamanhoMosaico: "AUTO",
    ordem: index,
  };
}

function criarGridCategorias(titulo, subtitulo, categorias) {
  return {
    titulo,
    subtitulo,
    descricao: "",
    tipoCabecalho: "TEXTO",
    alinhamentoCabecalhoDesktop: "CENTRO",
    alinhamentoCabecalhoMobile: "CENTRO",
    layoutVisual: "GRID_EDITORIAL",
    presetMosaico: categorias.length >= 4 ? "GRID_4_EDITORIAL" : "GRID_3_EDITORIAL",
    gapMosaico: "PADRAO",
    origemItens: "PERSONALIZADO",
    alinhamentoTextoDesktop: "CENTRO",
    alinhamentoTextoMobile: "CENTRO",
    corFundo: "BRANCO",
    espacamento: "PADRAO",
    espacamentoVertical: "PADRAO",
    espacamentoHorizontal: "PADRAO",
    larguraConteudo: "LARGA",
    colunasDesktop: Math.min(4, Math.max(2, categorias.length)),
    colunasTablet: Math.min(3, Math.max(2, categorias.length)),
    colunasMobile: 2,
    estiloEtiqueta: "ABAIXO",
    tamanhoEtiqueta: "PEQUENA",
    posicaoEtiqueta: "INFERIOR_ESQUERDA",
    larguraEtiqueta: "AUTO",
    exibirLinhaEtiqueta: false,
    exibirEtiqueta: true,
    exibirBotaoEtiqueta: true,
    cardInteiroClicavel: true,
    larguraCabecalhoDesktop: 100,
    posicaoCabecalhoMosaico: "TOPO",
    estiloBordaBotao: "RETO",
    itens: categorias.map(criarItemCategoria),
  };
}

function criarListaProdutos({ titulo, descricao, produtosIds, filtros = false, fonte = "MANUAL" }) {
  return {
    titulo,
    descricao,
    fonte,
    produtosIds,
    limite: Math.max(produtosIds.length, 8),
    layoutDesktop: filtros ? "GRID" : "CARROSSEL",
    layoutMobile: filtros ? "GRID" : "CARROSSEL",
    colunasDesktop: 4,
    colunasTablet: 3,
    colunasMobile: 2,
    exibirPreco: true,
    exibirBotao: true,
    textoBotao: "Ver peça",
    exibirSeloDesconto: true,
    exibirSetasCarrossel: true,
    posicaoSetasCarrossel: "LATERAIS",
    estiloSetasCarrossel: "CIRCULO",
    navegarPor: "PAGINA",
    alinhamentoTextoDesktop: "CENTRO",
    alinhamentoTextoMobile: "CENTRO",
    corFundo: "BRANCO",
    espacamento: "PADRAO",
    habilitarFiltros: filtros,
    mostrarFiltros: filtros,
  };
}

function criarTextoImagem({ titulo, texto, textoBotao, linkBotao, lado = "ESQUERDA" }) {
  const imagemEsquerda = lado === "ESQUERDA";

  return {
    exibirMidia: true,
    mostrarPlaceholderSemMidia: true,
    tipoMidia: "IMAGEM",
    imagemUrl: "",
    imagemDesktopUrl: "",
    imagemDesktop: "",
    imagemMobileUrl: "",
    imagemMobile: "",
    imagemAlt: "Composição editorial Stella Colari",
    videoDesktopUrl: "",
    videoMobileUrl: "",
    mediaCropDesktopX: 50,
    mediaCropDesktopY: 50,
    mediaCropMobileX: 50,
    mediaCropMobileY: 50,
    mediaPositionDesktop: "center center",
    mediaPositionMobile: "center center",
    mediaZoomDesktop: 100,
    mediaZoomMobile: 100,
    posicaoImagem: lado,
    layoutDesktop: imagemEsquerda ? "IMAGEM_ESQUERDA" : "IMAGEM_DIREITA",
    layoutDesktopTextoImagem: imagemEsquerda ? "IMAGEM_ESQUERDA" : "IMAGEM_DIREITA",
    layoutMobile: "IMAGEM_ACIMA",
    layoutMobileTextoImagem: "IMAGEM_ACIMA",
    alturaBloco: "PADRAO",
    alinhamentoVertical: "CENTRO",
    gapTextoImagem: 56,
    raioImagem: 2,
    titulo,
    texto,
    textoBotao,
    linkBotao,
    exibirBotao: Boolean(textoBotao && linkBotao),
    mostrarTitulo: true,
    exibirSubtitulo: true,
    estiloBordaBotao: "RETO",
    larguraMidiaDesktop: "CONTIDA",
    larguraMidiaMobile: "CONTIDA",
    alinhamentoTextoDesktop: "ESQUERDA",
    alinhamentoTextoMobile: "ESQUERDA",
    corFundo: "AZUL_CLARO",
    espacamento: "PADRAO",
  };
}

function criarCta({ titulo = "", texto = "", primario, secundario = null }) {
  return {
    titulo,
    texto,
    descricao: texto,
    exibirTexto: Boolean(titulo || texto || primario || secundario),
    exibirBotaoPrimario: Boolean(primario),
    textoBotaoPrimario: primario?.texto || "",
    linkBotaoPrimario: primario?.href || "",
    textoBotao: primario?.texto || "",
    linkBotao: primario?.href || "",
    exibirBotaoSecundario: Boolean(secundario),
    textoBotaoSecundario: secundario?.texto || "",
    linkBotaoSecundario: secundario?.href || "",
    alinhamento: "CENTRO",
    alinhamentoTextoDesktop: "CENTRO",
    alinhamentoTextoMobile: "CENTRO",
    larguraConteudo: "MEDIA",
    estiloBordaBotao: "RETO",
    corFundo: "BRANCO",
    espacamento: "COMPACTO",
    exibirMidia: false,
    layoutDesktop: "TEXTO_CENTRALIZADO",
    layoutMobile: "TEXTO_CENTRALIZADO",
  };
}

function criarCardsInformativos() {
  const cards = [
    {
      id: "acompanhar-pedidos",
      titulo: "Acompanhe seus pedidos",
      texto: "Consulte pedidos e atualizações na área Minha Conta.",
      textoBotao: "Minha Conta",
      linkBotao: "/loja/minha-conta",
    },
    {
      id: "frete-prazos",
      titulo: "Frete e prazos",
      texto: "Veja como valores e previsões são apresentados durante a compra.",
      textoBotao: "Consultar",
      linkBotao: "/loja/frete-e-prazos",
    },
    {
      id: "trocas-devolucoes",
      titulo: "Trocas e devoluções",
      texto: "Leia as orientações disponíveis antes de solicitar atendimento.",
      textoBotao: "Ver orientações",
      linkBotao: "/loja/trocas-e-devolucoes",
    },
    {
      id: "privacidade",
      titulo: "Privacidade",
      texto: "Conheça as informações disponíveis sobre o tratamento de dados.",
      textoBotao: "Ler política",
      linkBotao: "/loja/politica-de-privacidade",
    },
  ].map((card) => ({
    ...card,
    exibirMidia: false,
    tipoMidia: "NENHUMA",
    imagemUrl: "",
    imagemDesktopUrl: "",
    imagemMobileUrl: "",
    exibirBotao: true,
  }));

  return {
    titulo: "Informações para sua compra",
    descricao: "Acesse as páginas da loja antes de finalizar seu pedido.",
    layoutDesktop: "GRID",
    layoutMobile: "GRID",
    colunasDesktop: 4,
    colunasTablet: 2,
    colunasMobile: 1,
    alinhamento: "ESQUERDA",
    alinhamentoTextoDesktop: "CENTRO",
    alinhamentoTextoMobile: "CENTRO",
    estiloBordaBotao: "RETO",
    corFundo: "BRANCO",
    espacamento: "PADRAO",
    cards,
  };
}

function criarValoresMarca() {
  const cards = [
    {
      id: "compra-online",
      titulo: "Compra online",
      texto: "Finalize sua seleção pelo fluxo de compra da loja.",
      textoBotao: "Ver carrinho",
      linkBotao: "/loja/carrinho",
    },
    {
      id: "acompanhar-pedidos",
      titulo: "Acompanhe seus pedidos",
      texto: "Consulte pedidos e atualizações na área Minha Conta.",
      textoBotao: "Minha Conta",
      linkBotao: "/loja/minha-conta",
    },
    {
      id: "trocas-devolucoes",
      titulo: "Trocas e devoluções",
      texto: "Leia as orientações disponíveis antes de solicitar atendimento.",
      textoBotao: "Ver orientações",
      linkBotao: "/loja/trocas-e-devolucoes",
    },
    {
      id: "atendimento",
      titulo: "Atendimento",
      texto: "Acesse a página de contato para consultar os canais disponíveis.",
      textoBotao: "Ver contato",
      linkBotao: "/loja/contato",
    },
  ].map((card) => ({
    ...card,
    exibirMidia: false,
    tipoMidia: "NENHUMA",
    imagemUrl: "",
    imagemDesktopUrl: "",
    imagemMobileUrl: "",
    exibirBotao: true,
  }));

  return {
    titulo: "Informações essenciais",
    descricao: "Atalhos para acompanhar sua experiência na loja.",
    layoutDesktop: "GRID",
    layoutMobile: "GRID",
    colunasDesktop: 4,
    colunasTablet: 2,
    colunasMobile: 1,
    alinhamento: "ESQUERDA",
    alinhamentoTextoDesktop: "ESQUERDA",
    alinhamentoTextoMobile: "ESQUERDA",
    estiloBordaBotao: "RETO",
    corFundo: "BRANCO",
    espacamento: "COMPACTO",
    cards,
  };
}

function criarGaleriaEditorial() {
  const criarItem = (index) => ({
    id: `galeria-stella-${index}`,
    imagemDesktop: "",
    imagemMobile: "",
    alt: `Composição editorial Stella Colari ${index}`,
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
    focoMobileX: 50,
    focoMobileY: 50,
    zoomMobile: 100,
    overlayOpacidade: 18,
  });

  return {
    titulo: "Atmosfera Stella",
    descricao: "Uma composição visual da Stella Colari.",
    layout: {
      colunas: 4,
      varianteAltura: "PADRAO",
      gap: 10,
      fullBleed: false,
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
      fundo: "#f5f2ed",
      raio: 0,
      espacamentoVertical: 0,
    },
  };
}

function criarCardsAtendimento() {
  const cards = [
    {
      id: "contato",
      titulo: "Contato",
      texto: "Consulte os canais disponíveis na página de contato.",
      textoBotao: "Ver contato",
      linkBotao: "/loja/contato",
    },
    {
      id: "trocas-devolucoes",
      titulo: "Trocas e devoluções",
      texto: "Leia as orientações disponíveis antes de solicitar atendimento.",
      textoBotao: "Ver orientações",
      linkBotao: "/loja/trocas-e-devolucoes",
    },
    {
      id: "frete-prazos",
      titulo: "Frete e prazos",
      texto: "Veja como valores e previsões são apresentados durante a compra.",
      textoBotao: "Consultar",
      linkBotao: "/loja/frete-e-prazos",
    },
    {
      id: "privacidade",
      titulo: "Privacidade",
      texto: "Conheça as informações disponíveis sobre o tratamento de dados.",
      textoBotao: "Ler política",
      linkBotao: "/loja/politica-de-privacidade",
    },
    {
      id: "termos",
      titulo: "Termos de uso",
      texto: "Consulte os termos disponibilizados pela loja.",
      textoBotao: "Ler termos",
      linkBotao: "/loja/termos-de-uso",
    },
  ].map((card) => ({
    ...card,
    exibirMidia: false,
    tipoMidia: "NENHUMA",
    imagemUrl: "",
    imagemDesktopUrl: "",
    imagemMobileUrl: "",
    exibirBotao: true,
  }));

  return {
    titulo: "Central de atendimento",
    descricao: "Acesse as informações disponíveis antes de entrar em contato.",
    layoutDesktop: "GRID",
    layoutMobile: "GRID",
    colunasDesktop: 3,
    colunasTablet: 2,
    colunasMobile: 1,
    alinhamento: "ESQUERDA",
    alinhamentoTextoDesktop: "CENTRO",
    alinhamentoTextoMobile: "CENTRO",
    estiloBordaBotao: "RETO",
    corFundo: "BRANCO",
    espacamento: "PADRAO",
    cards,
  };
}

function estoqueDisponivel(produto) {
  if (produto.tipoProduto === "KIT") {
    if (produto.componentesDoKit.length === 0) return 0;

    return Math.min(
      ...produto.componentesDoKit.map((componente) => {
        const necessario = Number(componente.quantidade || 0);
        if (necessario <= 0) return 0;
        const total = componente.componenteProduto.estoque.reduce(
          (soma, item) => soma + Number(item.quantidadeAtual || 0),
          0
        );
        return Math.floor(total / necessario);
      })
    );
  }

  return produto.estoque.reduce(
    (soma, item) => soma + Number(item.quantidadeAtual || 0),
    0
  );
}

async function lerEstado() {
  const [paginas, menus, rodape, categorias, produtos] = await Promise.all([
    prisma.lojaPagina.findMany({
      orderBy: [{ tipo: "asc" }, { slug: "asc" }],
      include: {
        blocos: {
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        },
      },
    }),
    prisma.menuLoja.findMany({
      orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    }),
    prisma.lojaMenuRodapeConfiguracao.findUnique({
      where: { chave: "PADRAO" },
    }),
    prisma.categoriaProduto.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        slug: true,
        categoriaMaeId: true,
        imagemUrl: true,
        exibirNoMenu: true,
        ordem: true,
        ordemMenu: true,
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
      },
      select: {
        id: true,
        nome: true,
        criadoEm: true,
        imagemUrl: true,
        imagemHoverUrl: true,
        tipoProduto: true,
        descontoAtivo: true,
        precoVenda: true,
        precoPromocional: true,
        estoque: {
          select: {
            quantidadeAtual: true,
          },
        },
        componentesDoKit: {
          select: {
            quantidade: true,
            componenteProduto: {
              select: {
                estoque: {
                  select: {
                    quantidadeAtual: true,
                  },
                },
              },
            },
          },
        },
        categoriasProduto: {
          select: {
            categoriaId: true,
          },
        },
      },
      orderBy: [{ criadoEm: "desc" }, { nome: "asc" }],
    }),
  ]);

  return { paginas, menus, rodape, categorias, produtos };
}

function selecionarCatalogo(estado) {
  const produtosDisponiveis = estado.produtos
    .filter((produto) => estoqueDisponivel(produto) > 0)
    .filter((produto) => Boolean(produto.imagemUrl))
    .slice(0, 12);
  const produtosIds = produtosDisponiveis.map((produto) => produto.id);
  const categoriasPorId = new Map(
    estado.categorias.map((categoria) => [categoria.id, categoria])
  );
  const idsComProduto = new Set();

  produtosDisponiveis.forEach((produto) => {
    produto.categoriasProduto.forEach(({ categoriaId }) => {
      let atual = categoriasPorId.get(categoriaId);
      const visitadas = new Set();

      while (atual && !visitadas.has(atual.id)) {
        visitadas.add(atual.id);
        idsComProduto.add(atual.id);
        atual = atual.categoriaMaeId
          ? categoriasPorId.get(atual.categoriaMaeId)
          : null;
      }
    });
  });

  const categoriasComProduto = estado.categorias.filter((categoria) =>
    idsComProduto.has(categoria.id)
  );
  const prioridade = ["aneis", "brincos", "colares", "pulseiras"];
  const principais = prioridade
    .map((slug) => categoriasComProduto.find((categoria) => categoria.slug === slug))
    .filter(Boolean)
    .slice(0, 4);
  const principaisIds = new Set(principais.map((categoria) => categoria.id));
  const secundarias = categoriasComProduto
    .filter((categoria) => !principaisIds.has(categoria.id))
    .sort((a, b) => {
      const prioridadeA = /com-pedras|lisos/.test(a.slug) ? 0 : 1;
      const prioridadeB = /com-pedras|lisos/.test(b.slug) ? 0 : 1;
      return prioridadeA - prioridadeB || a.nome.localeCompare(b.nome, "pt-BR");
    })
    .slice(0, 4);
  const descontosValidos = estado.produtos.filter(
    (produto) =>
      produto.descontoAtivo &&
      produto.precoPromocional !== null &&
      Number(produto.precoPromocional) > 0 &&
      Number(produto.precoPromocional) < Number(produto.precoVenda)
  );

  return {
    produtosDisponiveis,
    produtosIds,
    principais,
    secundarias,
    descontosValidos,
  };
}

function bloco(key, tipo, titulo, ordem, config, ativo = true) {
  return {
    key,
    tipo,
    titulo,
    ordem,
    ativo,
    configJson: comSetup(key, config),
  };
}

function montarPaginas(catalogo) {
  const ids = catalogo.produtosIds;
  const homeBlocos = [
    bloco(
      "home.hero",
      "BANNER_HERO_V2",
      "Hero principal",
      10,
      criarHero({
        titulo: "Joias para acompanhar seus momentos",
        texto: "Explore uma seleção de peças disponíveis na loja.",
        ctaPrimario: { texto: "Ver novidades", href: "/loja/p/novidades" },
        ctaSecundario: { texto: "Ideias para presentear", href: "/loja/p/presentes" },
      })
    ),
    bloco(
      "home.valores",
      "DESTAQUES_CARDS",
      "Valores e confiança",
      15,
      criarValoresMarca()
    ),
    catalogo.principais.length > 0
      ? bloco(
          "home.categorias",
          "COLECOES_CATEGORIAS",
          "Navegação por categorias",
          20,
          criarGridCategorias(
            "Explore por categoria",
            "Encontre peças nas categorias disponíveis da loja.",
            catalogo.principais
          )
        )
      : null,
    ids.length > 0
      ? bloco(
          "home.novidades",
          "LISTA_PRODUTOS",
          "Novidades",
          30,
          criarListaProdutos({
            titulo: "Novidades",
            descricao: "Peças disponíveis para descobrir agora.",
            produtosIds: ids.slice(0, 8),
          })
        )
      : null,
    ids.length > 0
      ? bloco(
          "home.novidades-cta",
          "CTA_SIMPLES",
          "CTA de novidades",
          35,
          criarCta({
            primario: { texto: "Ver novidades", href: "/loja/p/novidades" },
          })
        )
      : null,
    bloco(
      "home.editorial",
      "TEXTO_IMAGEM",
      "Editorial",
      40,
      criarTextoImagem({
        titulo: "Escolhas que acompanham seu estilo",
        texto: "Descubra peças para combinar com diferentes momentos e preferências.",
        textoBotao: "Explorar a loja",
        linkBotao: "/loja/p/novidades",
        lado: "ESQUERDA",
      })
    ),
    ids.length > 0
      ? bloco(
          "home.destaques",
          "LISTA_PRODUTOS",
          "Destaques",
          50,
          criarListaProdutos({
            titulo: "Destaques",
            descricao: "Uma seleção atual de peças disponíveis na loja.",
            produtosIds: ids.slice(0, 8),
          })
        )
      : null,
    bloco(
      "home.presentes",
      "TEXTO_IMAGEM",
      "Guia de presentes",
      60,
      criarTextoImagem({
        titulo: "Ideias para presentear",
        texto: "Explore uma seleção de peças para diferentes momentos.",
        textoBotao: "Ver ideias",
        linkBotao: "/loja/p/presentes",
        lado: "DIREITA",
      })
    ),
    catalogo.secundarias.length > 0
      ? bloco(
          "home.categorias-destaque",
          "COLECOES_CATEGORIAS",
          "Categorias em destaque",
          70,
          criarGridCategorias(
            "Mais categorias para explorar",
            "Continue navegando por seleções disponíveis.",
            catalogo.secundarias
          )
        )
      : null,
    bloco(
      "home.informacoes",
      "DESTAQUES_CARDS",
      "Informações para compra",
      80,
      criarCardsInformativos()
    ),
    bloco(
      "home.story",
      "TEXTO_IMAGEM",
      "[REVISAR] História da marca",
      82,
      criarTextoImagem({
        titulo: "Sobre a Stella",
        texto: "Conteúdo institucional em preparação para revisão.",
        textoBotao: "",
        linkBotao: "",
        lado: "ESQUERDA",
      }),
      false
    ),
    bloco(
      "home.galeria",
      "GALERIA_EDITORIAL_FULL_BLEED",
      "Galeria editorial",
      85,
      criarGaleriaEditorial()
    ),
    bloco(
      "home.cta-final",
      "CTA_SIMPLES",
      "CTA final",
      90,
      criarCta({
        titulo: "Continue explorando",
        texto: "Veja a seleção disponível na Stella Colari.",
        primario: { texto: "Ver novidades", href: "/loja/p/novidades" },
        secundario: { texto: "Contato", href: "/loja/contato" },
      })
    ),
  ].filter(Boolean);

  return [
    {
      slug: "home",
      titulo: "Home",
      tipo: "HOME",
      ativo: true,
      statusPublicacao: "PUBLICADA",
      seoTitle: "Stella Colari | Loja Online",
      seoDescription: "Explore a seleção de joias disponível na loja online Stella Colari.",
      blocos: homeBlocos,
    },
    {
      slug: "novidades",
      titulo: "Novidades",
      tipo: "GERAL",
      ativo: true,
      statusPublicacao: "PUBLICADA",
      seoTitle: "Novidades",
      seoDescription: "Veja uma seleção atual de peças disponíveis na Stella Colari.",
      blocos: [
        bloco(
          "novidades.hero",
          "BANNER_HERO_V2",
          "Hero de novidades",
          10,
          criarHero({
            titulo: "Novidades",
            texto: "Uma seleção atual de peças disponíveis na loja.",
            altura: "25VH",
          })
        ),
        ...(ids.length > 0
          ? [
              bloco(
                "novidades.produtos",
                "LISTA_PRODUTOS",
                "Produtos recentes disponíveis",
                20,
                criarListaProdutos({
                  titulo: "Explore as novidades",
                  descricao: "Use os filtros para encontrar sua próxima escolha.",
                  produtosIds: ids,
                  filtros: true,
                })
              ),
            ]
          : []),
        bloco(
          "novidades.cta",
          "CTA_SIMPLES",
          "CTA de novidades",
          30,
          criarCta({
            primario: { texto: "Voltar ao início", href: "/loja" },
          })
        ),
      ],
    },
    {
      slug: "presentes",
      titulo: "Presentes",
      tipo: "GERAL",
      ativo: true,
      statusPublicacao: "PUBLICADA",
      seoTitle: "Presentes",
      seoDescription: "Explore uma seleção de peças para presentear na Stella Colari.",
      blocos: [
        bloco(
          "presentes.hero",
          "BANNER_HERO_V2",
          "Hero de presentes",
          10,
          criarHero({
            titulo: "Ideias para presentear",
            texto: "Peças disponíveis para escolher com calma.",
            altura: "25VH",
          })
        ),
        bloco(
          "presentes.editorial",
          "TEXTO_IMAGEM",
          "Introdução de presentes",
          20,
          criarTextoImagem({
            titulo: "Uma escolha para cada momento",
            texto: "Navegue pela seleção disponível e encontre uma peça para presentear.",
            textoBotao: "Ver categorias",
            linkBotao: "/loja",
            lado: "ESQUERDA",
          })
        ),
        ...(ids.length > 0
          ? [
              bloco(
                "presentes.produtos",
                "LISTA_PRODUTOS",
                "Seleção para presentear",
                30,
                criarListaProdutos({
                  titulo: "Seleção para presentear",
                  descricao: "Explore as peças disponíveis e use os filtros da loja.",
                  produtosIds: ids,
                  filtros: true,
                })
              ),
            ]
          : []),
      ],
    },
    {
      slug: "sobre",
      titulo: "Sobre a Stella",
      tipo: "GERAL",
      ativo: false,
      statusPublicacao: "RASCUNHO",
      seoTitle: "Sobre a Stella",
      seoDescription: "Página institucional da Stella Colari em preparação.",
      blocos: [
        bloco(
          "sobre.hero",
          "BANNER_HERO_V2",
          "[REVISAR] Hero institucional",
          10,
          criarHero({
            titulo: "Sobre a Stella",
            texto: "Conteúdo institucional em preparação para revisão.",
            altura: "25VH",
          })
        ),
      ],
    },
    {
      slug: "atendimento",
      titulo: "Atendimento",
      tipo: "GERAL",
      ativo: false,
      statusPublicacao: "RASCUNHO",
      seoTitle: "Atendimento",
      seoDescription: "Central de informações da loja Stella Colari.",
      blocos: [
        bloco(
          "atendimento.hero",
          "BANNER_HERO_V2",
          "[REVISAR] Hero de atendimento",
          10,
          criarHero({
            titulo: "Atendimento",
            texto: "Revise os canais oficiais antes de publicar esta página.",
            altura: "25VH",
          })
        ),
        bloco(
          "atendimento.links",
          "DESTAQUES_CARDS",
          "Links de atendimento",
          20,
          criarCardsAtendimento()
        ),
      ],
    },
    {
      slug: "ofertas",
      titulo: "Ofertas",
      tipo: "GERAL",
      ativo: false,
      statusPublicacao: "RASCUNHO",
      seoTitle: "Ofertas",
      seoDescription: "Página de ofertas da Stella Colari.",
      blocos: [
        bloco(
          "ofertas.hero",
          "BANNER_HERO_V2",
          "Hero de ofertas",
          10,
          criarHero({
            titulo: "Ofertas",
            texto: "Esta página será publicada quando houver descontos reais ativos.",
            altura: "25VH",
          })
        ),
        bloco(
          "ofertas.produtos",
          "LISTA_PRODUTOS",
          "Produtos com desconto",
          20,
          criarListaProdutos({
            titulo: "Ofertas disponíveis",
            descricao: "",
            produtosIds: [],
            filtros: true,
            fonte: "DESCONTOS",
          })
        ),
      ],
    },
  ];
}

function montarMenus() {
  return [
    { slug: "inicio", nome: "Início", href: "/loja", ordem: 10 },
    {
      slug: "novidades",
      nome: "Novidades",
      href: "/loja/p/novidades",
      ordem: 20,
    },
    {
      slug: "presentes",
      nome: "Presentes",
      href: "/loja/p/presentes",
      ordem: 30,
    },
  ];
}

function montarRodape() {
  return {
    _stellaSetup: {
      namespace: NAMESPACE,
      key: "menu-rodape",
      version: VERSAO,
    },
    menu: {
      ativo: true,
      linksManuaisAtivos: true,
      categoriasAutomaticasAtivas: true,
      mostrarCategoriasMae: true,
      mostrarCategoriasFilhas: true,
      mostrarApenasCategoriasVisiveis: true,
      ordenacaoCategorias: "ORDEM",
      exibicaoCategorias: "DROPDOWN",
      categoriasOcultasIds: [],
    },
    rodape: {
      ativo: true,
      textoInstitucional: "Stella Colari. Explore o catálogo disponível na loja online.",
      copyright: "Stella Colari",
      mostrarLinksMenu: true,
      mostrarCarrinho: true,
      colunas: [
        {
          id: "loja",
          titulo: "Loja",
          links: [
            {
              id: "novidades",
              label: "Novidades",
              href: "/loja/p/novidades",
              ativo: true,
            },
            {
              id: "presentes",
              label: "Presentes",
              href: "/loja/p/presentes",
              ativo: true,
            },
          ],
        },
        {
          id: "atendimento",
          titulo: "Atendimento",
          links: [
            {
              id: "contato",
              label: "Contato",
              href: "/loja/contato",
              ativo: true,
            },
            {
              id: "frete-prazos",
              label: "Frete e prazos",
              href: "/loja/frete-e-prazos",
              ativo: true,
            },
            {
              id: "trocas-devolucoes",
              label: "Trocas e devoluções",
              href: "/loja/trocas-e-devolucoes",
              ativo: true,
            },
          ],
        },
        {
          id: "legal",
          titulo: "Legal",
          links: [
            {
              id: "privacidade",
              label: "Privacidade",
              href: "/loja/politica-de-privacidade",
              ativo: true,
            },
            {
              id: "termos",
              label: "Termos de uso",
              href: "/loja/termos-de-uso",
              ativo: true,
            },
          ],
        },
      ],
    },
    redesSociais: [
      { id: "instagram", nome: "Instagram", url: "", ativo: false },
      { id: "whatsapp", nome: "WhatsApp", url: "", ativo: false },
      { id: "tiktok", nome: "TikTok", url: "", ativo: false },
      { id: "pinterest", nome: "Pinterest", url: "", ativo: false },
      { id: "facebook", nome: "Facebook", url: "", ativo: false },
      { id: "youtube", nome: "YouTube", url: "", ativo: false },
    ],
    selos: [],
  };
}

function validarEscopo(estado, paginasDesejadas, menusDesejados) {
  const slugsPaginas = new Set(paginasDesejadas.map((pagina) => pagina.slug));
  const montagemExistente = missaoJaAplicada(estado);

  for (const pagina of estado.paginas) {
    if (!slugsPaginas.has(pagina.slug) || pagina.slug === "home") continue;
    if (paginaPertenceMissao(pagina)) continue;

    throw new Error(
      `Conflito de escopo: a página '${pagina.slug}' já existe e não pertence a ${NAMESPACE}.`
    );
  }

  for (const menuDesejado of menusDesejados) {
    const existente = estado.menus.find((menu) => menu.slug === menuDesejado.slug);
    if (
      !montagemExistente &&
      existente &&
      existente.linkUrl !== menuDesejado.href
    ) {
      throw new Error(
        `Conflito de escopo: o menu '${menuDesejado.slug}' já existe com outro destino.`
      );
    }
  }

  if (estado.rodape && !pertenceMissao(estado.rodape.configJson)) {
    throw new Error(
      "Conflito de escopo: já existe uma configuração manual de menu/rodapé não criada por esta missão."
    );
  }
}

function montarRelatorio(estado, catalogo, paginasDesejadas, menusDesejados) {
  const montagemExistente = missaoJaAplicada(estado);

  return {
    modo: temFlag("execute") ? "execute" : "dry-run",
    namespace: NAMESPACE,
    catalogo: {
      produtosPublicos: estado.produtos.length,
      produtosSelecionados: catalogo.produtosDisponiveis.length,
      categoriasPrincipais: catalogo.principais.map((item) => item.nome),
      categoriasSecundarias: catalogo.secundarias.map((item) => item.nome),
      descontosReais: catalogo.descontosValidos.length,
    },
    paginas: paginasDesejadas.map((pagina) => {
      const atual = estado.paginas.find((item) => item.slug === pagina.slug);
      const preservarPagina = paginaPertenceMissao(atual);

      return {
        slug: pagina.slug,
        status: preservarPagina
          ? atual.statusPublicacao
          : pagina.statusPublicacao,
        ativo: preservarPagina ? atual.ativo : pagina.ativo,
        blocos: pagina.blocos.map((item) => {
          const blocoAtual = blocoDaMissaoPorChave(atual, item.key);
          const ordem = blocoAtual?.ordem ?? item.ordem;
          const ativo = blocoAtual?.ativo ?? item.ativo;
          const migracao = blocoAtual
            ? migrarConfigExistente(item.key, blocoAtual.configJson)
            : null;
          const operacao = !blocoAtual
            ? "criar"
            : migracao?.alterada
              ? "migrar"
              : "preservar";

          return `${ordem}:${item.key}:${blocoAtual?.tipo || item.tipo}:${
            ativo ? "ativo" : "inativo"
          }:${operacao}`;
        }),
        operacao: !atual
          ? "criar"
          : preservarPagina
            ? "preservar estado e publicação"
            : "configurar primeira montagem",
      };
    }),
    menus: menusDesejados.map((menu) => {
      const atual = estado.menus.find((item) => item.slug === menu.slug);

      return {
        nome: atual && montagemExistente ? atual.nome : menu.nome,
        href: atual && montagemExistente ? atual.linkUrl : menu.href,
        ativo: atual && montagemExistente ? atual.ativo : true,
        ordem: atual && montagemExistente ? atual.ordem : menu.ordem,
        operacao: !atual
          ? "criar"
          : montagemExistente
            ? "preservar"
            : "configurar primeira montagem",
      };
    }),
    rodape: estado.rodape ? "preservar configuração da missão" : "criar",
    garantias: [
      "não altera produtos, preços ou estoque",
      "não altera usuários, checkout, Stripe, frete ou permissões",
      "não cria migration",
      "não publica ofertas sem desconto real",
      "na primeira montagem, desativa blocos antigos da home",
      "em reexecuções, preserva publicação, ativação e ordem definidas no Builder",
    ],
  };
}

async function salvarSnapshot(estado) {
  const agora = new Date();
  const stamp = agora.toISOString().replace(/[:.]/g, "-");
  const arquivoRelativo = path.join(SNAPSHOT_DIR, `loja-builder-antes-${stamp}.json`);
  const ignorado = spawnSync("git", ["check-ignore", "-q", arquivoRelativo], {
    cwd: process.cwd(),
    stdio: "ignore",
  });

  if (ignorado.status !== 0) {
    throw new Error(`Snapshot recusado: '${arquivoRelativo}' não está ignorado pelo Git.`);
  }

  await mkdir(SNAPSHOT_DIR, { recursive: true });
  await writeFile(
    arquivoRelativo,
    JSON.stringify(
      {
        geradoEm: agora.toISOString(),
        namespace: NAMESPACE,
        paginas: estado.paginas,
        menus: estado.menus,
        menuRodape: estado.rodape,
      },
      null,
      2
    ),
    "utf8"
  );

  return arquivoRelativo;
}

function migrarConfigExistente(key, configExistente) {
  const configAtual = registro(configExistente);
  const setupAtual = setupDe(configAtual);

  if (
    setupAtual.namespace === NAMESPACE &&
    setupAtual.key === key &&
    key === "home.novidades-cta" &&
    setupAtual.version < 2 &&
    configAtual.exibirTexto === false &&
    !String(configAtual.titulo || "").trim() &&
    !String(configAtual.texto || "").trim()
  ) {
    return {
      alterada: true,
      configJson: {
        ...configAtual,
        exibirTexto: true,
        _stellaSetup: {
          ...registro(configAtual._stellaSetup),
          namespace: NAMESPACE,
          key,
          version: 2,
        },
      },
    };
  }

  return { alterada: false, configJson: configAtual };
}

async function aplicarMontagem(
  estado,
  paginasDesejadas,
  menusDesejados,
  rodapeDesejado
) {
  const montagemExistente = missaoJaAplicada(estado);

  await prisma.$transaction(async (tx) => {
    for (const paginaDesejada of paginasDesejadas) {
      const existente = await tx.lojaPagina.findUnique({
        where: { slug: paginaDesejada.slug },
        include: { blocos: true },
      });
      const preservarPagina = paginaPertenceMissao(existente);
      let pagina = existente;

      if (!existente) {
        pagina = await tx.lojaPagina.create({
          data: {
            titulo: paginaDesejada.titulo,
            slug: paginaDesejada.slug,
            tipo: paginaDesejada.tipo,
            ativo: paginaDesejada.ativo,
            statusPublicacao: paginaDesejada.statusPublicacao,
            seoTitle: paginaDesejada.seoTitle,
            seoDescription: paginaDesejada.seoDescription,
            publicadoEm:
              paginaDesejada.statusPublicacao === "PUBLICADA"
                ? new Date()
                : null,
          },
        });
      } else if (!preservarPagina) {
        pagina = await tx.lojaPagina.update({
          where: { id: existente.id },
          data: {
            titulo: paginaDesejada.titulo,
            tipo: paginaDesejada.tipo,
            ativo: paginaDesejada.ativo,
            statusPublicacao: paginaDesejada.statusPublicacao,
            seoTitle: paginaDesejada.seoTitle,
            seoDescription: paginaDesejada.seoDescription,
            publicadoEm:
              paginaDesejada.statusPublicacao === "PUBLICADA"
                ? new Date()
                : null,
          },
        });
      }

      const blocosAtuais = existente?.blocos || [];

      for (const blocoDesejado of paginaDesejada.blocos) {
        const correspondentes = blocosAtuais.filter((item) => {
          const setup = setupDe(item.configJson);
          return (
            setup.namespace === NAMESPACE && setup.key === blocoDesejado.key
          );
        });

        if (correspondentes.length > 1) {
          throw new Error(
            `Bloco duplicado para a chave '${blocoDesejado.key}' na página '${pagina.slug}'.`
          );
        }

        const atual = correspondentes[0];

        if (atual) {
          const migracao = migrarConfigExistente(
            blocoDesejado.key,
            atual.configJson
          );

          if (migracao.alterada) {
            await tx.lojaPaginaBloco.update({
              where: { id: atual.id },
              data: { configJson: migracao.configJson },
            });
          }
        } else {
          await tx.lojaPaginaBloco.create({
            data: {
              paginaId: pagina.id,
              tipo: blocoDesejado.tipo,
              titulo: blocoDesejado.titulo,
              ordem: blocoDesejado.ordem,
              ativo: blocoDesejado.ativo,
              configJson: blocoDesejado.configJson,
            },
          });
        }
      }

      if (!preservarPagina && pagina.slug === "home") {
        for (const blocoAtual of blocosAtuais) {
          if (pertenceMissao(blocoAtual.configJson) || !blocoAtual.ativo) {
            continue;
          }

          await tx.lojaPaginaBloco.update({
            where: { id: blocoAtual.id },
            data: { ativo: false },
          });
        }
      }
    }

    for (const menu of menusDesejados) {
      const atual = await tx.menuLoja.findUnique({
        where: { slug: menu.slug },
      });

      if (!atual) {
        await tx.menuLoja.create({
          data: {
            nome: menu.nome,
            slug: menu.slug,
            tipo: "LINK",
            linkUrl: menu.href,
            ativo: true,
            ordem: menu.ordem,
            destaque: false,
          },
        });
      } else if (!montagemExistente) {
        await tx.menuLoja.update({
          where: { id: atual.id },
          data: {
            nome: menu.nome,
            tipo: "LINK",
            linkUrl: menu.href,
            ativo: true,
            ordem: menu.ordem,
            destaque: false,
            dataInicio: null,
            dataFim: null,
          },
        });
      }
    }

    const rodapeAtual = await tx.lojaMenuRodapeConfiguracao.findUnique({
      where: { chave: "PADRAO" },
    });
    if (!rodapeAtual) {
      await tx.lojaMenuRodapeConfiguracao.create({
        data: {
          chave: "PADRAO",
          configJson: rodapeDesejado,
        },
      });
    }
  });
}

async function main() {
  const executar = temFlag("execute");
  const confirmacao = valorArg("confirm");

  if (executar && confirmacao !== CONFIRMACAO) {
    throw new Error(
      `Execução recusada. Use --execute --confirm=${CONFIRMACAO}.`
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL ausente. Execute o script com os arquivos de ambiente já existentes, sem imprimir seus valores."
    );
  }

  const estado = await lerEstado();
  const catalogo = selecionarCatalogo(estado);

  if (catalogo.produtosDisponiveis.length === 0) {
    throw new Error(
      "Montagem recusada: não há produto público com imagem e disponibilidade para as vitrines."
    );
  }

  if (catalogo.principais.length === 0) {
    throw new Error(
      "Montagem recusada: não há categoria pública não vazia para a navegação da home."
    );
  }

  const paginasDesejadas = montarPaginas(catalogo);
  const menusDesejados = montarMenus();
  const rodapeDesejado = montarRodape();

  validarEscopo(estado, paginasDesejadas, menusDesejados);

  const relatorio = montarRelatorio(
    estado,
    catalogo,
    paginasDesejadas,
    menusDesejados
  );

  if (!executar) {
    console.log(JSON.stringify(relatorio, null, 2));
    return;
  }

  const snapshot = await salvarSnapshot(estado);
  await aplicarMontagem(
    estado,
    paginasDesejadas,
    menusDesejados,
    rodapeDesejado
  );

  console.log(
    JSON.stringify(
      {
        ...relatorio,
        resultado: "montagem aplicada",
        snapshot,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
