export const CONTEUDO_LOJA_SCHEMA_VERSION = 1;
export const CONTEUDO_LOJA_MARCA_AZUL = "#2e7b99";
export const CONTEUDO_LOJA_MARCA_AZUL_ACESSIVEL = CONTEUDO_LOJA_MARCA_AZUL;

export type ConteudoCampoTipo =
  | "TEXTO"
  | "TEXTO_LONGO"
  | "IMAGEM"
  | "LINK"
  | "BOOLEANO"
  | "DATA_HORA"
  | "NUMERO"
  | "PRODUTOS"
  | "CATEGORIAS";

export type ConteudoCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ConteudoCrop = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  aspect: number;
  focalX?: number;
  focalY?: number;
  areaPercent: ConteudoCropArea;
};

export type ConteudoImagem = {
  assetId: string;
  desktopUrl: string;
  mobileAssetId: string;
  mobileUrl: string;
  alt: string;
  desktop: ConteudoCrop;
  mobile: ConteudoCrop;
};

export type ConteudoValor = string | number | boolean | string[] | ConteudoImagem;

export type ConteudoPaginaPayload = {
  contractKey: string;
  contractVersion: number;
  values: Record<string, ConteudoValor>;
};

export type ConteudoCampoDefinicao = {
  key: string;
  label: string;
  tipo: ConteudoCampoTipo;
  descricao?: string;
  placeholder?: string;
  obrigatorio?: boolean;
  obrigatorioPublicar?: boolean;
  limite?: number;
  minimo?: number;
  maximo?: number;
  passo?: number;
  proporcaoDesktop?: number;
  proporcaoMobile?: number;
  tamanhoRecomendadoDesktop?: string;
  tamanhoRecomendadoMobile?: string;
  publico?: boolean;
  editavel?: boolean;
  valorPadrao: ConteudoValor;
};

export type ConteudoSecaoDefinicao = {
  key: string;
  label: string;
  descricao: string;
  tipoVisual:
    | "HERO"
    | "TEXTO"
    | "EDITORIAL"
    | "PRODUTOS"
    | "CATEGORIAS"
    | "DESTAQUES"
    | "GALERIA"
    | "CTA"
    | "SEO"
    | "CAMPANHA";
  campos: ConteudoCampoDefinicao[];
};

export type ConteudoContrato = {
  key: string;
  version: number;
  label: string;
  descricao: string;
  sections: ConteudoSecaoDefinicao[];
};

export type ConteudoImagemPublica = Omit<
  ConteudoImagem,
  "assetId" | "mobileAssetId"
>;

export type ConteudoContratoPublico = {
  key: string;
  sections: Array<{
    key: string;
    tipoVisual: ConteudoSecaoDefinicao["tipoVisual"];
    temCardsLinks: boolean;
  }>;
};

export type ConteudoPaginaPublica = {
  values: Record<
    string,
    string | number | boolean | string[] | ConteudoImagemPublica
  >;
};

function copiarCropPublico(crop: ConteudoCrop): ConteudoCrop {
  return {
    x: crop.x,
    y: crop.y,
    zoom: crop.zoom,
    rotation: crop.rotation,
    aspect: crop.aspect,
    ...(typeof crop.focalX === "number" ? { focalX: crop.focalX } : {}),
    ...(typeof crop.focalY === "number" ? { focalY: crop.focalY } : {}),
    areaPercent: {
      x: crop.areaPercent.x,
      y: crop.areaPercent.y,
      width: crop.areaPercent.width,
      height: crop.areaPercent.height,
    },
  };
}

/**
 * Projeta somente o contrato visual e os valores necessarios ao renderer publico.
 * Metadados editoriais, SEO, campanha e IDs internos de midia permanecem no servidor.
 */
export function projetarConteudoPublico(
  contrato: ConteudoContrato,
  conteudo: ConteudoPaginaPayload,
): {
  contrato: ConteudoContratoPublico;
  conteudo: ConteudoPaginaPublica;
} {
  const sections = contrato.sections.filter(
    (section) => section.tipoVisual !== "SEO" && section.tipoVisual !== "CAMPANHA",
  );
  const values: ConteudoPaginaPublica["values"] = {};

  for (const section of sections) {
    for (const field of section.campos.filter((item) => item.publico !== false)) {
      const value = conteudo.values[field.key];
      if (value === undefined) continue;

      if (field.tipo === "IMAGEM") {
        const image = value as ConteudoImagem;
        values[field.key] = {
          desktopUrl: image.desktopUrl,
          mobileUrl: image.mobileUrl,
          alt: image.alt,
          desktop: copiarCropPublico(image.desktop),
          mobile: copiarCropPublico(image.mobile),
        };
      } else if (Array.isArray(value)) {
        values[field.key] = [...value];
      } else {
        values[field.key] = value;
      }
    }
  }

  return {
    contrato: {
      key: contrato.key,
      sections: sections.map((section) => ({
        key: section.key,
        tipoVisual: section.tipoVisual,
        temCardsLinks: section.campos.some(
          (field) => field.key === `${section.key}.card1.title`,
        ),
      })),
    },
    conteudo: { values },
  };
}

export type ConteudoValidacaoQuestao = {
  campo: string;
  mensagem: string;
  nivel: "ERRO" | "AVISO";
};

export function parseDataHoraConteudo(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:(Z)|([+-]\d{2}:\d{2}))?$/i,
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText || 0);
  const calendarProbe = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarProbe.getUTCFullYear() !== year ||
    calendarProbe.getUTCMonth() !== month - 1 ||
    calendarProbe.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const hasTimezone = Boolean(match[7] || match[8]);
  const withSeconds = secondText ? text : text.replace(/(?=(?:Z|[+-]\d{2}:\d{2})?$)/, ":00");
  const parsed = new Date(hasTimezone ? withSeconds : `${withSeconds}-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type CampoOpcoes = Omit<ConteudoCampoDefinicao, "key" | "label" | "tipo" | "valorPadrao"> & {
  valorPadrao?: ConteudoValor;
};

const texto = (
  key: string,
  label: string,
  opcoes: CampoOpcoes = {},
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "TEXTO",
  valorPadrao: "",
  limite: 140,
  ...opcoes,
});

const textoLongo = (
  key: string,
  label: string,
  opcoes: CampoOpcoes = {},
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "TEXTO_LONGO",
  valorPadrao: "",
  limite: 900,
  ...opcoes,
});

const link = (
  key: string,
  label: string,
  opcoes: CampoOpcoes = {},
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "LINK",
  valorPadrao: "",
  limite: 500,
  placeholder: "/loja ou https://...",
  ...opcoes,
});

const selecao = (
  key: string,
  label: string,
  tipo: "PRODUTOS" | "CATEGORIAS",
  opcoes: CampoOpcoes = {},
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo,
  valorPadrao: [],
  limite: 24,
  ...opcoes,
});

export function criarImagemConteudoVazia(
  proporcaoDesktop = 16 / 9,
  proporcaoMobile = 4 / 5,
): ConteudoImagem {
  const cropPadrao = (aspect: number): ConteudoCrop => ({
    x: 0,
    y: 0,
    zoom: 1,
    rotation: 0,
    aspect,
    focalX: 50,
    focalY: 50,
    areaPercent: { x: 0, y: 0, width: 100, height: 100 },
  });

  return {
    assetId: "",
    desktopUrl: "",
    mobileAssetId: "",
    mobileUrl: "",
    alt: "",
    desktop: cropPadrao(proporcaoDesktop),
    mobile: cropPadrao(proporcaoMobile),
  };
}

const imagem = (
  key: string,
  label: string,
  proporcaoDesktop: number,
  proporcaoMobile: number,
  opcoes: CampoOpcoes = {},
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "IMAGEM",
  proporcaoDesktop,
  proporcaoMobile,
  valorPadrao: criarImagemConteudoVazia(proporcaoDesktop, proporcaoMobile),
  ...opcoes,
});

const booleano = (
  key: string,
  label: string,
  valorPadrao = true,
  opcoes: Pick<ConteudoCampoDefinicao, "publico"> = {},
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "BOOLEANO",
  valorPadrao,
  ...opcoes,
});

const dataHora = (key: string, label: string): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "DATA_HORA",
  valorPadrao: "",
});

const numero = (
  key: string,
  label: string,
  valorPadrao: number,
  minimo: number,
  maximo: number,
): ConteudoCampoDefinicao => ({
  key,
  label,
  tipo: "NUMERO",
  valorPadrao,
  minimo,
  maximo,
  passo: 1,
});

const seoSection = (): ConteudoSecaoDefinicao => ({
  key: "seo",
  label: "SEO",
  descricao: "Como esta página aparece em buscadores e compartilhamentos.",
  tipoVisual: "SEO",
  campos: [
    texto("seo.title", "Título SEO", { limite: 70 }),
    textoLongo("seo.description", "Descrição SEO", { limite: 180 }),
    link("seo.canonical", "Canonical", {
      descricao: "Deixe vazio para usar a rota oficial da página.",
    }),
    imagem("seo.image", "Imagem de compartilhamento", 1.91, 1.91, {
      tamanhoRecomendadoDesktop: "1200 x 630 px",
      tamanhoRecomendadoMobile: "1200 x 630 px",
    }),
    booleano("seo.noindex", "Não indexar esta página", false),
  ],
});

const heroFields = (
  prefix: string,
  defaults: { eyebrow?: string; title?: string; text?: string } = {},
): ConteudoCampoDefinicao[] => [
  booleano(`${prefix}.enabled`, "Exibir seção", true),
  texto(`${prefix}.eyebrow`, "Assinatura", {
    valorPadrao: defaults.eyebrow ?? "Stella Colari",
    limite: 60,
  }),
  texto(`${prefix}.title`, "Título", {
    valorPadrao: defaults.title ?? "",
    limite: 90,
    obrigatorioPublicar: true,
  }),
  textoLongo(`${prefix}.text`, "Texto de apoio", {
    valorPadrao: defaults.text ?? "",
    limite: 280,
  }),
  imagem(`${prefix}.image`, "Imagem", 16 / 9, 4 / 5, {
    tamanhoRecomendadoDesktop: "2400 x 1350 px",
    tamanhoRecomendadoMobile: "1440 x 1800 px",
  }),
  texto(`${prefix}.primaryLabel`, "Texto do botão principal", { limite: 42 }),
  link(`${prefix}.primaryHref`, "Destino do botão principal"),
  texto(`${prefix}.secondaryLabel`, "Texto do botão secundário", { limite: 42 }),
  link(`${prefix}.secondaryHref`, "Destino do botão secundário"),
];

const editorialFields = (
  prefix: string,
  defaults: { title?: string; text?: string } = {},
): ConteudoCampoDefinicao[] => [
  booleano(`${prefix}.enabled`, "Exibir seção", true),
  texto(`${prefix}.title`, "Título", {
    valorPadrao: defaults.title ?? "",
    limite: 100,
  }),
  textoLongo(`${prefix}.text`, "Texto", {
    valorPadrao: defaults.text ?? "",
    limite: 900,
  }),
  imagem(`${prefix}.image`, "Imagem editorial", 4 / 5, 4 / 5, {
    tamanhoRecomendadoDesktop: "1600 x 2000 px",
    tamanhoRecomendadoMobile: "1080 x 1350 px",
  }),
  texto(`${prefix}.ctaLabel`, "Texto do botão", { limite: 42 }),
  link(`${prefix}.ctaHref`, "Destino do botão"),
];

const productFields = (
  prefix: string,
  defaults: { title?: string; text?: string } = {},
): ConteudoCampoDefinicao[] => [
  booleano(`${prefix}.enabled`, "Exibir seção", true),
  texto(`${prefix}.title`, "Título", {
    valorPadrao: defaults.title ?? "",
    limite: 90,
  }),
  textoLongo(`${prefix}.text`, "Texto de apoio", {
    valorPadrao: defaults.text ?? "",
    limite: 280,
  }),
  selecao(`${prefix}.productIds`, "Produtos selecionados", "PRODUTOS", {
    descricao: "Sem seleção manual, a regra dinâmica da experiência é usada.",
    limite: 16,
  }),
  selecao(`${prefix}.categoryIds`, "Categorias de origem", "CATEGORIAS", {
    limite: 8,
  }),
  texto(`${prefix}.ctaLabel`, "Texto do link da seção", { limite: 42 }),
  link(`${prefix}.ctaHref`, "Destino do link da seção"),
];

const ctaFields = (
  prefix: string,
  defaults: { title?: string; text?: string } = {},
): ConteudoCampoDefinicao[] => [
  booleano(`${prefix}.enabled`, "Exibir seção", true),
  texto(`${prefix}.title`, "Título", {
    valorPadrao: defaults.title ?? "",
    limite: 100,
  }),
  textoLongo(`${prefix}.text`, "Texto", {
    valorPadrao: defaults.text ?? "",
    limite: 320,
  }),
  texto(`${prefix}.label`, "Texto do botão", { limite: 42 }),
  link(`${prefix}.href`, "Destino do botão"),
  texto(`${prefix}.secondaryLabel`, "Texto do botão secundário", { limite: 42 }),
  link(`${prefix}.secondaryHref`, "Destino do botão secundário"),
];

const linkCardsFields = (prefix: string, count: number): ConteudoCampoDefinicao[] => [
  booleano(`${prefix}.enabled`, "Exibir seção", true),
  texto(`${prefix}.title`, "Título", { limite: 90 }),
  textoLongo(`${prefix}.text`, "Texto de apoio", { limite: 500 }),
  ...Array.from({ length: count }, (_, index) => {
    const card = `${prefix}.card${index + 1}`;
    return [
      texto(`${card}.title`, `Item ${index + 1} — título`, { limite: 90 }),
      textoLongo(`${card}.text`, `Item ${index + 1} — texto`, { limite: 320 }),
      texto(`${card}.label`, `Item ${index + 1} — texto do link`, { limite: 42 }),
      link(`${card}.href`, `Item ${index + 1} — destino`),
    ];
  }).flat(),
];

const galleryItemsFields = (prefix: string, count: number): ConteudoCampoDefinicao[] =>
  Array.from({ length: count }, (_, index) => {
    const item = `${prefix}.item${index + 1}`;
    return [
      imagem(`${item}.image`, `Imagem ${index + 1}`, 4 / 5, 4 / 5),
      texto(`${item}.title`, `Imagem ${index + 1} — título`, { limite: 90 }),
      textoLongo(`${item}.text`, `Imagem ${index + 1} — texto`, { limite: 240 }),
      texto(`${item}.label`, `Imagem ${index + 1} — texto do link`, { limite: 42 }),
      link(`${item}.href`, `Imagem ${index + 1} — destino`),
    ];
  }).flat();

const homeContract: ConteudoContrato = {
  key: "home",
  version: 1,
  label: "Home",
  descricao: "Página inicial editorial da loja, com ordem e responsividade definidas em código.",
  sections: [
    {
      key: "hero",
      label: "Hero",
      descricao: "Abertura principal da loja.",
      tipoVisual: "HERO",
      campos: heroFields("hero", {
        eyebrow: "Stella Colari",
        title: "Viva Stella Colari.",
      }),
    },
    {
      key: "values",
      label: "Valores",
      descricao: "Mensagem curta de confiança e identidade.",
      tipoVisual: "DESTAQUES",
      campos: linkCardsFields("values", 4),
    },
    {
      key: "categories",
      label: "Categorias",
      descricao: "Atalhos para categorias reais da loja.",
      tipoVisual: "CATEGORIAS",
      campos: [
        booleano("categories.enabled", "Exibir seção", true),
        texto("categories.title", "Título", { valorPadrao: "Explore por categoria" }),
        textoLongo("categories.text", "Texto", { limite: 260 }),
        selecao("categories.categoryIds", "Categorias", "CATEGORIAS", { limite: 8 }),
      ],
    },
    {
      key: "newArrivals",
      label: "Novidades",
      descricao: "Seleção de produtos recentes ou escolhidos manualmente.",
      tipoVisual: "PRODUTOS",
      campos: productFields("newArrivals", { title: "Novidades" }),
    },
    {
      key: "editorial",
      label: "Editorial",
      descricao: "Imagem e narrativa editorial da marca.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("editorial"),
    },
    {
      key: "featured",
      label: "Destaques",
      descricao: "Produtos em evidência.",
      tipoVisual: "PRODUTOS",
      campos: productFields("featured", { title: "Destaques" }),
    },
    {
      key: "gifts",
      label: "Presentes",
      descricao: "Chamada editorial para o guia de presentes.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("gifts", { title: "Presentes" }),
    },
    {
      key: "featuredCategories",
      label: "Categorias em destaque",
      descricao: "Segunda seleção editorial de categorias, em posição fixa na Home.",
      tipoVisual: "CATEGORIAS",
      campos: [
        booleano("featuredCategories.enabled", "Exibir seção", true),
        texto("featuredCategories.title", "Título", { limite: 90 }),
        textoLongo("featuredCategories.text", "Texto", { limite: 260 }),
        selecao("featuredCategories.categoryIds", "Categorias", "CATEGORIAS", {
          limite: 8,
        }),
      ],
    },
    {
      key: "benefits",
      label: "Benefícios",
      descricao: "Informações de compra, sem promessas não validadas.",
      tipoVisual: "DESTAQUES",
      campos: linkCardsFields("benefits", 4),
    },
    {
      key: "gallery",
      label: "Galeria",
      descricao: "Quatro imagens editoriais com enquadramento independente.",
      tipoVisual: "GALERIA",
      campos: [
        booleano("gallery.enabled", "Exibir seção", true),
        texto("gallery.title", "Título", { limite: 90 }),
        textoLongo("gallery.text", "Texto de apoio", { limite: 320 }),
        ...galleryItemsFields("gallery", 4),
      ],
    },
    {
      key: "finalCta",
      label: "Chamada final",
      descricao: "Encerramento da página.",
      tipoVisual: "CTA",
      campos: ctaFields("finalCta"),
    },
    seoSection(),
  ],
};

const newArrivalsContract: ConteudoContrato = {
  key: "novidades",
  version: 1,
  label: "Novidades",
  descricao: "Experiência de lançamentos com regra de produtos protegida pelo código.",
  sections: [
    {
      key: "hero",
      label: "Hero",
      descricao: "Apresentação da seleção de novidades.",
      tipoVisual: "HERO",
      campos: heroFields("hero", { title: "Novidades" }),
    },
    {
      key: "products",
      label: "Produtos",
      descricao: "Produtos recentes ou seleção manual.",
      tipoVisual: "PRODUTOS",
      campos: productFields("products", { title: "Explore as novidades" }),
    },
    {
      key: "cta",
      label: "Chamada final",
      descricao: "Ação de encerramento.",
      tipoVisual: "CTA",
      campos: ctaFields("cta"),
    },
    seoSection(),
  ],
};

const giftsContract: ConteudoContrato = {
  key: "presentes",
  version: 1,
  label: "Presentes",
  descricao: "Guia de presentes com conteúdo editorial e seleções reais.",
  sections: [
    {
      key: "hero",
      label: "Hero",
      descricao: "Abertura do guia de presentes.",
      tipoVisual: "HERO",
      campos: heroFields("hero", { title: "Presentes" }),
    },
    {
      key: "categories",
      label: "Categorias",
      descricao: "Categorias que ajudam a navegar pelo guia.",
      tipoVisual: "CATEGORIAS",
      campos: [
        booleano("categories.enabled", "Exibir seção", true),
        texto("categories.title", "Título", { valorPadrao: "Escolha por ocasião" }),
        selecao("categories.categoryIds", "Categorias", "CATEGORIAS", { limite: 8 }),
      ],
    },
    {
      key: "editorial",
      label: "Editorial",
      descricao: "Narrativa visual da página.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("editorial", { title: "Uma escolha para cada momento" }),
    },
    {
      key: "products",
      label: "Seleção",
      descricao: "Produtos para presentear; não altera preços ou descontos.",
      tipoVisual: "PRODUTOS",
      campos: productFields("products", { title: "Seleção para presentear" }),
    },
    seoSection(),
  ],
};

const aboutContract: ConteudoContrato = {
  key: "sobre",
  version: 1,
  label: "Sobre a Stella",
  descricao: "História e valores da marca, sem texto inventado pelo sistema.",
  sections: [
    {
      key: "hero",
      label: "Hero",
      descricao: "Abertura institucional.",
      tipoVisual: "HERO",
      campos: heroFields("hero", { title: "Sobre a Stella" }),
    },
    {
      key: "story",
      label: "História",
      descricao: "História aprovada da marca.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("story"),
    },
    {
      key: "values",
      label: "Valores",
      descricao: "Valores e compromissos aprovados.",
      tipoVisual: "DESTAQUES",
      campos: [
        booleano("values.enabled", "Exibir seção", true),
        texto("values.title", "Título", { limite: 90 }),
        textoLongo("values.text", "Texto", { limite: 900 }),
      ],
    },
    {
      key: "cta",
      label: "Chamada final",
      descricao: "Próximo passo oferecido ao visitante.",
      tipoVisual: "CTA",
      campos: ctaFields("cta"),
    },
    seoSection(),
  ],
};

const supportContract: ConteudoContrato = {
  key: "atendimento",
  version: 1,
  label: "Atendimento",
  descricao: "Canais e orientações aprovados; nenhum contato é inventado.",
  sections: [
    {
      key: "hero",
      label: "Introdução",
      descricao: "Apresentação da central de atendimento.",
      tipoVisual: "HERO",
      campos: heroFields("hero", { title: "Atendimento" }),
    },
    {
      key: "links",
      label: "Atalhos de atendimento",
      descricao: "Links para os canais e páginas oficiais de suporte.",
      tipoVisual: "DESTAQUES",
      campos: linkCardsFields("links", 5),
    },
    {
      key: "contacts",
      label: "Canais",
      descricao: "Informe somente canais oficiais validados.",
      tipoVisual: "TEXTO",
      campos: [
        booleano("contacts.enabled", "Exibir seção", true),
        texto("contacts.title", "Título", { limite: 90 }),
        textoLongo("contacts.text", "Orientações e horários", { limite: 1200 }),
        texto("contacts.primaryLabel", "Nome do canal principal", { limite: 60 }),
        link("contacts.primaryHref", "Destino do canal principal"),
      ],
    },
    {
      key: "faq",
      label: "Perguntas frequentes",
      descricao: "Perguntas e respostas aprovadas.",
      tipoVisual: "DESTAQUES",
      campos: [
        booleano("faq.enabled", "Exibir seção", true),
        texto("faq.question1", "Pergunta 1", { limite: 160 }),
        textoLongo("faq.answer1", "Resposta 1", { limite: 800 }),
        texto("faq.question2", "Pergunta 2", { limite: 160 }),
        textoLongo("faq.answer2", "Resposta 2", { limite: 800 }),
        texto("faq.question3", "Pergunta 3", { limite: 160 }),
        textoLongo("faq.answer3", "Resposta 3", { limite: 800 }),
      ],
    },
    seoSection(),
  ],
};

const offersContract: ConteudoContrato = {
  key: "ofertas",
  version: 1,
  label: "Ofertas",
  descricao: "Apresentação de produtos que já possuem desconto real.",
  sections: [
    {
      key: "hero",
      label: "Hero",
      descricao: "Abertura da página de ofertas.",
      tipoVisual: "HERO",
      campos: heroFields("hero", { title: "Ofertas" }),
    },
    {
      key: "products",
      label: "Produtos",
      descricao: "A experiência filtra somente descontos existentes.",
      tipoVisual: "PRODUTOS",
      campos: productFields("products", { title: "Peças em oferta" }),
    },
    seoSection(),
  ],
};

const categoryContract: ConteudoContrato = {
  key: "categoria",
  version: 1,
  label: "Categoria",
  descricao: "Conteúdo editorial da categoria; a grade de produtos continua dinâmica.",
  sections: [
    {
      key: "hero",
      label: "Capa",
      descricao: "Título alternativo, descrição e imagem da categoria.",
      tipoVisual: "HERO",
      campos: heroFields("hero").map((field) =>
        field.key === "hero.title"
          ? {
              ...field,
              obrigatorioPublicar: false,
              descricao: "Deixe vazio para usar o nome da categoria.",
            }
          : field,
      ),
    },
    {
      key: "beforeGrid",
      label: "Antes da grade",
      descricao: "Conteúdo opcional antes dos produtos.",
      tipoVisual: "TEXTO",
      campos: [
        booleano("beforeGrid.enabled", "Exibir seção", false),
        texto("beforeGrid.title", "Título", { limite: 90 }),
        textoLongo("beforeGrid.text", "Texto", { limite: 900 }),
      ],
    },
    {
      key: "afterGrid",
      label: "Depois da grade",
      descricao: "Conteúdo opcional depois dos produtos.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("afterGrid"),
    },
    seoSection(),
  ],
};

const productContract: ConteudoContrato = {
  key: "produto",
  version: 1,
  label: "Produto — conteúdo global",
  descricao: "Conteúdo comum à experiência de produto; preço, estoque e dados da peça não ficam aqui.",
  sections: [
    {
      key: "trust",
      label: "Confiança",
      descricao: "Texto auxiliar e benefícios aprovados.",
      tipoVisual: "DESTAQUES",
      campos: [
        booleano("trust.enabled", "Exibir seção", true),
        texto("trust.title", "Título", { limite: 90 }),
        textoLongo("trust.text", "Texto", { limite: 900 }),
      ],
    },
    {
      key: "editorial",
      label: "Editorial",
      descricao: "Imagem e mensagem institucional.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("editorial"),
    },
    {
      key: "recommendations",
      label: "Recomendações",
      descricao: "Título da seleção; produtos continuam dinâmicos.",
      tipoVisual: "PRODUTOS",
      campos: productFields("recommendations", { title: "Você também pode gostar" }).map(
        (field) =>
          field.key === "recommendations.productIds" ||
          field.key === "recommendations.categoryIds"
            ? { ...field, publico: false, editavel: false }
            : field,
      ),
    },
    seoSection(),
  ],
};

const searchContract: ConteudoContrato = {
  key: "busca",
  version: 1,
  label: "Busca",
  descricao: "Textos da busca; consulta e filtros permanecem no código e a rota continua noindex.",
  sections: [
    {
      key: "header",
      label: "Cabeçalho",
      descricao: "Orientação para a busca.",
      tipoVisual: "TEXTO",
      campos: [
        texto("header.title", "Título", { valorPadrao: "Buscar na loja", limite: 90 }),
        textoLongo("header.text", "Texto", { limite: 320 }),
        texto("header.emptyTitle", "Título sem resultados", { limite: 90 }),
        textoLongo("header.emptyText", "Texto sem resultados", { limite: 320 }),
      ],
    },
    seoSection(),
  ],
};

const campaignContract: ConteudoContrato = {
  key: "campanha",
  version: 1,
  label: "Campanha",
  descricao: "Landing editorial agendada; não altera preços, descontos ou cupons.",
  sections: [
    {
      key: "settings",
      label: "Planejamento",
      descricao: "Identificação, janela de exibição e prioridade.",
      tipoVisual: "CAMPANHA",
      campos: [
        texto("settings.internalName", "Nome interno", {
          limite: 120,
          obrigatorioPublicar: true,
        }),
        dataHora("settings.startAt", "Início"),
        dataHora("settings.endAt", "Fim"),
        numero("settings.priority", "Prioridade", 0, 0, 100),
      ],
    },
    {
      key: "hero",
      label: "Hero",
      descricao: "Abertura da landing page.",
      tipoVisual: "HERO",
      campos: heroFields("hero"),
    },
    {
      key: "editorial",
      label: "Editorial",
      descricao: "Conteúdo principal da campanha.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("editorial"),
    },
    {
      key: "selection",
      label: "Seleção",
      descricao: "Produtos e categorias apresentados pela campanha.",
      tipoVisual: "PRODUTOS",
      campos: productFields("selection"),
    },
    {
      key: "cta",
      label: "Chamada final",
      descricao: "Próximo passo da campanha.",
      tipoVisual: "CTA",
      campos: ctaFields("cta"),
    },
    seoSection(),
  ],
};

const legalContract: ConteudoContrato = {
  key: "legal",
  version: 1,
  label: "Página legal",
  descricao: "Conteúdo jurídico estruturado; exige revisão humana antes de publicar.",
  sections: [
    {
      key: "content",
      label: "Conteúdo",
      descricao: "Não publique texto provisório ou não revisado.",
      tipoVisual: "TEXTO",
      campos: [
        texto("content.title", "Título", { limite: 100, obrigatorioPublicar: true }),
        textoLongo("content.introduction", "Introdução", { limite: 1200 }),
        textoLongo("content.body", "Conteúdo", {
          limite: 12000,
          obrigatorioPublicar: true,
        }),
        texto("content.effectiveDate", "Data de vigência", { limite: 80 }),
        booleano(
          "content.reviewConfirmed",
          "Confirmo que este texto passou por revisão humana antes da publicação",
          false,
          { publico: false },
        ),
      ],
    },
    seoSection(),
  ],
};

const genericContract: ConteudoContrato = {
  key: "pagina-editorial",
  version: 1,
  label: "Página editorial",
  descricao: "Página de conteúdo com composição fixa em código.",
  sections: [
    {
      key: "hero",
      label: "Hero",
      descricao: "Abertura da página.",
      tipoVisual: "HERO",
      campos: heroFields("hero"),
    },
    {
      key: "editorial",
      label: "Conteúdo",
      descricao: "Texto e imagem principais.",
      tipoVisual: "EDITORIAL",
      campos: editorialFields("editorial"),
    },
    {
      key: "selection",
      label: "Produtos",
      descricao: "Seleção opcional de produtos.",
      tipoVisual: "PRODUTOS",
      campos: productFields("selection"),
    },
    {
      key: "cta",
      label: "Chamada final",
      descricao: "Encerramento opcional.",
      tipoVisual: "CTA",
      campos: ctaFields("cta"),
    },
    seoSection(),
  ],
};

export const CONTEUDO_CONTRATOS: readonly ConteudoContrato[] = [
  homeContract,
  productContract,
  categoryContract,
  searchContract,
  newArrivalsContract,
  giftsContract,
  aboutContract,
  supportContract,
  offersContract,
  campaignContract,
  legalContract,
  genericContract,
];

export function getConteudoContrato(key: string) {
  return CONTEUDO_CONTRATOS.find((contrato) => contrato.key === key) ?? genericContract;
}

export function getConteudoContratoVersionado(key: string, version: number) {
  const contrato = CONTEUDO_CONTRATOS.find(
    (item) => item.key === key && item.version === version,
  );
  if (!contrato) {
    throw new Error(`Contrato de conteúdo desconhecido: ${key}@${version}.`);
  }
  return contrato;
}

export function resolverContratoPagina(pagina: { tipo: string; slug: string }) {
  if (pagina.tipo === "HOME" || pagina.slug === "home") return homeContract;
  if (pagina.tipo === "PRODUTO_GLOBAL") return productContract;
  if (pagina.tipo === "BUSCA_GLOBAL") return searchContract;
  if (pagina.tipo === "CATEGORIA" || pagina.tipo === "TEMPLATE_CATEGORIA") {
    return categoryContract;
  }
  if (pagina.tipo === "CAMPANHA") return campaignContract;
  if (pagina.tipo === "LEGAL") return legalContract;

  const keyPorSlug: Record<string, string> = {
    novidades: "novidades",
    presentes: "presentes",
    sobre: "sobre",
    "quem-somos": "sobre",
    atendimento: "atendimento",
    contato: "atendimento",
    ofertas: "ofertas",
    descontos: "ofertas",
    "politica-de-privacidade": "legal",
    "termos-de-uso": "legal",
    "trocas-e-devolucoes": "legal",
  };

  return getConteudoContrato(keyPorSlug[pagina.slug] ?? "pagina-editorial");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizarArea(value: unknown): ConteudoCropArea {
  const input = asRecord(value);
  const width = clamp(finiteNumber(input.width, 100), 1, 100);
  const height = clamp(finiteNumber(input.height, 100), 1, 100);

  return {
    x: clamp(finiteNumber(input.x, 0), 0, 100 - width),
    y: clamp(finiteNumber(input.y, 0), 0, 100 - height),
    width,
    height,
  };
}

function normalizarCrop(value: unknown, aspect: number): ConteudoCrop {
  const input = asRecord(value);

  return {
    x: finiteNumber(input.x, 0),
    y: finiteNumber(input.y, 0),
    zoom: clamp(finiteNumber(input.zoom, 1), 1, 4),
    rotation: clamp(finiteNumber(input.rotation, 0), -180, 180),
    aspect,
    focalX: clamp(finiteNumber(input.focalX, 50), 0, 100),
    focalY: clamp(finiteNumber(input.focalY, 50), 0, 100),
    areaPercent: normalizarArea(input.areaPercent),
  };
}

export function normalizarConteudoImagem(
  value: unknown,
  proporcaoDesktop: number,
  proporcaoMobile: number,
): ConteudoImagem {
  const input = asRecord(value);

  return {
    assetId: String(input.assetId ?? "").trim(),
    desktopUrl: String(input.desktopUrl ?? "").trim(),
    mobileAssetId: String(input.mobileAssetId ?? "").trim(),
    mobileUrl: String(input.mobileUrl ?? "").trim(),
    alt: String(input.alt ?? "").trim().slice(0, 240),
    desktop: normalizarCrop(input.desktop, proporcaoDesktop),
    mobile: normalizarCrop(input.mobile, proporcaoMobile),
  };
}

export function criarConteudoPadrao(contrato: ConteudoContrato): ConteudoPaginaPayload {
  const values: Record<string, ConteudoValor> = {};

  for (const section of contrato.sections) {
    for (const field of section.campos) {
      values[field.key] = field.valorPadrao;
    }
  }

  return {
    contractKey: contrato.key,
    contractVersion: contrato.version,
    values,
  };
}

export function normalizarConteudoPagina(
  contrato: ConteudoContrato,
  value: unknown,
): ConteudoPaginaPayload {
  const input = asRecord(value);
  const inputValues = asRecord(input.values);
  const defaults = criarConteudoPadrao(contrato);
  const values: Record<string, ConteudoValor> = {};

  for (const section of contrato.sections) {
    for (const field of section.campos) {
      const raw = inputValues[field.key];

      if (field.tipo === "IMAGEM") {
        values[field.key] = normalizarConteudoImagem(
          raw,
          field.proporcaoDesktop ?? 16 / 9,
          field.proporcaoMobile ?? 4 / 5,
        );
      } else if (field.tipo === "BOOLEANO") {
        values[field.key] = typeof raw === "boolean" ? raw : Boolean(field.valorPadrao);
      } else if (field.tipo === "NUMERO") {
        values[field.key] = clamp(
          finiteNumber(raw, Number(field.valorPadrao)),
          field.minimo ?? Number.MIN_SAFE_INTEGER,
          field.maximo ?? Number.MAX_SAFE_INTEGER,
        );
      } else if (field.tipo === "PRODUTOS" || field.tipo === "CATEGORIAS") {
        values[field.key] = Array.isArray(raw)
          ? raw
              .map((item) => String(item).trim())
              .filter(Boolean)
              .slice(0, field.limite ?? 24)
          : (defaults.values[field.key] as string[]);
      } else {
        values[field.key] = String(raw ?? field.valorPadrao ?? "")
          .trim()
          .slice(0, field.limite ?? 12000);
      }
    }
  }

  return {
    contractKey: contrato.key,
    contractVersion: contrato.version,
    values,
  };
}

function canonicalizarConteudoParaComparacao(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizarConteudoParaComparacao);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizarConteudoParaComparacao(item)]),
    );
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1_000_000_000) / 1_000_000_000;
  }

  return value;
}

export function assinaturaConteudoPagina(value: unknown) {
  return JSON.stringify(canonicalizarConteudoParaComparacao(value));
}

export function conteudosPaginaIguais(left: unknown, right: unknown) {
  return assinaturaConteudoPagina(left) === assinaturaConteudoPagina(right);
}

export function urlConteudoPermitida(value: string) {
  const url = value.trim();
  if (!url) return true;
  if ((url.startsWith("/") && !url.startsWith("//")) || url.startsWith("#")) return true;
  if (url.startsWith("mailto:") || url.startsWith("tel:")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validarConteudoPagina(
  contrato: ConteudoContrato,
  payload: ConteudoPaginaPayload,
  modo: "RASCUNHO" | "PUBLICAR",
): ConteudoValidacaoQuestao[] {
  const issues: ConteudoValidacaoQuestao[] = [];

  if (payload.contractKey !== contrato.key || payload.contractVersion !== contrato.version) {
    issues.push({
      campo: "contract",
      mensagem: "O contrato do conteúdo está desatualizado.",
      nivel: "ERRO",
    });
  }

  for (const section of contrato.sections) {
    for (const field of section.campos) {
      const value = payload.values[field.key];
      const required = field.obrigatorio || (modo === "PUBLICAR" && field.obrigatorioPublicar);

      if (required && (value === "" || value === null || typeof value === "undefined")) {
        issues.push({ campo: field.key, mensagem: `${field.label} é obrigatório.`, nivel: "ERRO" });
      }

      if (typeof value === "string" && field.limite && value.length > field.limite) {
        issues.push({
          campo: field.key,
          mensagem: `${field.label} ultrapassa ${field.limite} caracteres.`,
          nivel: "ERRO",
        });
      }

      if (field.tipo === "LINK" && typeof value === "string" && !urlConteudoPermitida(value)) {
        issues.push({ campo: field.key, mensagem: `${field.label} possui um destino inválido.`, nivel: "ERRO" });
      }

      if (field.tipo === "IMAGEM") {
        const media = value as ConteudoImagem;
        const hasImage = Boolean(
          media?.assetId ||
            media?.desktopUrl ||
            media?.mobileAssetId ||
            media?.mobileUrl,
        );

        if (hasImage && !media.alt.trim()) {
          issues.push({
            campo: field.key,
            mensagem: `${field.label} precisa de texto alternativo.`,
            nivel: modo === "PUBLICAR" ? "ERRO" : "AVISO",
          });
        }
      }
    }
  }

  if (contrato.key === "campanha") {
    const startAt = String(payload.values["settings.startAt"] ?? "");
    const endAt = String(payload.values["settings.endAt"] ?? "");
    const startDate = parseDataHoraConteudo(startAt);
    const endDate = parseDataHoraConteudo(endAt);

    if (startAt && !startDate) {
      issues.push({ campo: "settings.startAt", mensagem: "Data inicial inválida.", nivel: "ERRO" });
    }
    if (endAt && !endDate) {
      issues.push({ campo: "settings.endAt", mensagem: "Data final inválida.", nivel: "ERRO" });
    }
    if (startDate && endDate && startDate >= endDate) {
      issues.push({
        campo: "settings.endAt",
        mensagem: "O fim da campanha deve ser posterior ao início.",
        nivel: "ERRO",
      });
    }
  }

  if (
    modo === "PUBLICAR" &&
    contrato.key === "legal" &&
    payload.values["content.reviewConfirmed"] !== true
  ) {
    issues.push({
      campo: "content.reviewConfirmed",
      mensagem: "Confirme a revisão humana do conteúdo jurídico antes de publicar.",
      nivel: "ERRO",
    });
  }

  return issues;
}

export function extrairReferenciasMidia(payload: ConteudoPaginaPayload) {
  const usages: Array<{
    assetId: string;
    slot: string;
    dispositivo: "DESKTOP" | "MOBILE";
  }> = [];

  for (const [slot, value] of Object.entries(payload.values)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const media = value as ConteudoImagem;

    if (media.assetId) {
      usages.push({ assetId: media.assetId, slot, dispositivo: "DESKTOP" });
    }
    if (media.mobileAssetId) {
      usages.push({ assetId: media.mobileAssetId, slot, dispositivo: "MOBILE" });
    } else if (media.assetId) {
      usages.push({ assetId: media.assetId, slot, dispositivo: "MOBILE" });
    }
  }

  return usages;
}

export function extrairSeoConteudo(payload: ConteudoPaginaPayload) {
  const image = payload.values["seo.image"] as ConteudoImagem | undefined;
  return {
    title: String(payload.values["seo.title"] ?? "").trim(),
    description: String(payload.values["seo.description"] ?? "").trim(),
    canonical: String(payload.values["seo.canonical"] ?? "").trim(),
    image: image?.desktopUrl || image?.mobileUrl || "",
    noindex: payload.values["seo.noindex"] === true,
  };
}
