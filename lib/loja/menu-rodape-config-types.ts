export type LojaRodapeLink = {
  id: string;
  label: string;
  href: string;
  ativo: boolean;
  novaAba?: boolean;
};

export type LojaRodapeColuna = {
  id: string;
  titulo: string;
  links: LojaRodapeLink[];
};

export type LojaRedeSocial = {
  id: string;
  nome: string;
  url: string;
  ativo: boolean;
};

export type LojaSeloRodape = {
  id: string;
  nome: string;
  imagemUrl: string;
  altText?: string;
  linkUrl?: string;
  ativo: boolean;
};

export type LojaMenuRodapeConfig = {
  menu: {
    ativo: boolean;
    linksManuaisAtivos: boolean;
    categoriasAutomaticasAtivas: boolean;
    mostrarCategoriasMae: boolean;
    mostrarCategoriasFilhas: boolean;
    mostrarApenasCategoriasVisiveis: boolean;
    ordenacaoCategorias: "ORDEM" | "AZ";
    exibicaoCategorias: "SIMPLES" | "DROPDOWN" | "GRUPO";
    categoriasOcultasIds: string[];
  };
  rodape: {
    ativo: boolean;
    textoInstitucional: string;
    copyright: string;
    mostrarLinksMenu: boolean;
    mostrarCarrinho: boolean;
    colunas: LojaRodapeColuna[];
  };
  redesSociais: LojaRedeSocial[];
  selos: LojaSeloRodape[];
};

export const LOJA_MENU_RODAPE_CHAVE = "PADRAO";

export const lojaMenuRodapeConfigPadrao: LojaMenuRodapeConfig = {
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
    textoInstitucional:
      "Stella Colari. Produtos selecionados para compra online.",
    copyright: "Stella Colari",
    mostrarLinksMenu: true,
    mostrarCarrinho: true,
    colunas: [
      {
        id: "institucional",
        titulo: "Institucional",
        links: [
          {
            id: "quem-somos",
            label: "Quem somos",
            href: "/loja/quem-somos",
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
            label: "Fale conosco",
            href: "/loja/contato",
            ativo: true,
          },
        ],
      },
    ],
  },
  redesSociais: [
    {
      id: "instagram",
      nome: "Instagram",
      url: "",
      ativo: false,
    },
    {
      id: "whatsapp",
      nome: "WhatsApp",
      url: "",
      ativo: false,
    },
    {
      id: "tiktok",
      nome: "TikTok",
      url: "",
      ativo: false,
    },
    {
      id: "pinterest",
      nome: "Pinterest",
      url: "",
      ativo: false,
    },
    {
      id: "facebook",
      nome: "Facebook",
      url: "",
      ativo: false,
    },
    {
      id: "youtube",
      nome: "YouTube",
      url: "",
      ativo: false,
    },
    {
      id: "outro",
      nome: "Outro",
      url: "",
      ativo: false,
    },
  ],
  selos: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;

  return fallback;
}

function getString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;

  return fallback;
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizarLinks(value: unknown): LojaRodapeLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): LojaRodapeLink | null => {
      if (!isRecord(item)) return null;

      const id = getString(item.id, `link-${index}`);
      const label = getString(item.label).trim();
      const href = getString(item.href).trim();

      if (!label || !href) return null;

      return {
        id,
        label,
        href,
        ativo: getBoolean(item.ativo, true),
        novaAba: getBoolean(item.novaAba, false),
      };
    })
    .filter((item): item is LojaRodapeLink => Boolean(item));
}

function normalizarColunas(value: unknown): LojaRodapeColuna[] {
  if (!Array.isArray(value)) return lojaMenuRodapeConfigPadrao.rodape.colunas;

  const colunas = value
    .map((item, index) => {
      if (!isRecord(item)) return null;

      const titulo = getString(item.titulo).trim();

      if (!titulo) return null;

      return {
        id: getString(item.id, `coluna-${index}`),
        titulo,
        links: normalizarLinks(item.links),
      };
    })
    .filter((item): item is LojaRodapeColuna => Boolean(item));

  return colunas.length > 0
    ? colunas
    : lojaMenuRodapeConfigPadrao.rodape.colunas;
}

function normalizarRedes(value: unknown): LojaRedeSocial[] {
  if (!Array.isArray(value)) return lojaMenuRodapeConfigPadrao.redesSociais;

  return value
    .map((item, index): LojaRedeSocial | null => {
      if (!isRecord(item)) return null;

      const nome = getString(item.nome).trim();

      if (!nome) return null;

      return {
        id: getString(item.id, `rede-${index}`),
        nome,
        url: getString(item.url).trim(),
        ativo: getBoolean(item.ativo, false),
      };
    })
    .filter((item): item is LojaRedeSocial => Boolean(item));
}

function normalizarSelos(value: unknown): LojaSeloRodape[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): LojaSeloRodape | null => {
      if (!isRecord(item)) return null;

      const nome = getString(item.nome).trim();
      const imagemUrl = getString(item.imagemUrl).trim();

      if (!nome || !imagemUrl) return null;

      return {
        id: getString(item.id, `selo-${index}`),
        nome,
        imagemUrl,
        altText: getString(item.altText).trim(),
        linkUrl: getString(item.linkUrl).trim(),
        ativo: getBoolean(item.ativo, true),
      };
    })
    .filter((item): item is LojaSeloRodape => Boolean(item));
}

export function normalizarLojaMenuRodapeConfig(
  value: unknown
): LojaMenuRodapeConfig {
  if (!isRecord(value)) return lojaMenuRodapeConfigPadrao;

  const menu = isRecord(value.menu) ? value.menu : {};
  const rodape = isRecord(value.rodape) ? value.rodape : {};

  return {
    menu: {
      ativo: getBoolean(menu.ativo, lojaMenuRodapeConfigPadrao.menu.ativo),
      linksManuaisAtivos: getBoolean(
        menu.linksManuaisAtivos,
        lojaMenuRodapeConfigPadrao.menu.linksManuaisAtivos
      ),
      categoriasAutomaticasAtivas: getBoolean(
        menu.categoriasAutomaticasAtivas,
        lojaMenuRodapeConfigPadrao.menu.categoriasAutomaticasAtivas
      ),
      mostrarCategoriasMae: getBoolean(
        menu.mostrarCategoriasMae,
        lojaMenuRodapeConfigPadrao.menu.mostrarCategoriasMae
      ),
      mostrarCategoriasFilhas: getBoolean(
        menu.mostrarCategoriasFilhas,
        lojaMenuRodapeConfigPadrao.menu.mostrarCategoriasFilhas
      ),
      mostrarApenasCategoriasVisiveis: getBoolean(
        menu.mostrarApenasCategoriasVisiveis,
        lojaMenuRodapeConfigPadrao.menu.mostrarApenasCategoriasVisiveis
      ),
      ordenacaoCategorias:
        menu.ordenacaoCategorias === "AZ" ? "AZ" : "ORDEM",
      exibicaoCategorias:
        menu.exibicaoCategorias === "SIMPLES" ||
        menu.exibicaoCategorias === "GRUPO"
          ? menu.exibicaoCategorias
          : "DROPDOWN",
      categoriasOcultasIds: getStringArray(menu.categoriasOcultasIds),
    },
    rodape: {
      ativo: getBoolean(rodape.ativo, lojaMenuRodapeConfigPadrao.rodape.ativo),
      textoInstitucional: getString(
        rodape.textoInstitucional,
        lojaMenuRodapeConfigPadrao.rodape.textoInstitucional
      ),
      copyright: getString(
        rodape.copyright,
        lojaMenuRodapeConfigPadrao.rodape.copyright
      ),
      mostrarLinksMenu: getBoolean(
        rodape.mostrarLinksMenu,
        lojaMenuRodapeConfigPadrao.rodape.mostrarLinksMenu
      ),
      mostrarCarrinho: getBoolean(
        rodape.mostrarCarrinho,
        lojaMenuRodapeConfigPadrao.rodape.mostrarCarrinho
      ),
      colunas: normalizarColunas(rodape.colunas),
    },
    redesSociais: normalizarRedes(value.redesSociais),
    selos: normalizarSelos(value.selos),
  };
}
