"use client";

import { useMemo } from "react";
import type { CategoriaMenuPublicoItem } from "@/components/loja/MenuPublicoLoja";
import StellaHomeBlockRenderer, {
  canRenderStellaHomeBlock,
} from "@/components/loja/home/StellaHomeBlockRenderer";
import type {
  ConteudoContratoPublico,
  ConteudoCrop,
  ConteudoImagemPublica,
  ConteudoPaginaPublica,
} from "@/lib/loja/conteudo/contracts";
import type { ProdutoPublico } from "@/lib/loja/produto-publico";
import {
  STELLA_HOME_BLOCK_ORDER,
  type StellaHomeBlockKey,
} from "@/lib/loja/stella-home-contract";

export type StellaHomeExperiencePage = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
};

export type StellaHomeExperienceBlock = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  ativo?: boolean;
  configJson: unknown;
  stellaHomeKey?: StellaHomeBlockKey | null;
};

type StellaHomeManagedContent = {
  contrato: ConteudoContratoPublico;
  conteudo: ConteudoPaginaPublica;
};

type StellaHomeExperienceProps = {
  pagina: StellaHomeExperiencePage;
  blocos: StellaHomeExperienceBlock[];
  produtos: ProdutoPublico[];
  categorias: CategoriaMenuPublicoItem[];
  conteudoGerenciado?: StellaHomeManagedContent | null;
};

type PublicValue = ConteudoPaginaPublica["values"][string];

const SECTION_BY_BLOCK: Partial<Record<StellaHomeBlockKey, string>> = {
  "home.hero": "hero",
  "home.valores": "values",
  "home.categorias": "categories",
  "home.novidades": "newArrivals",
  "home.novidades-cta": "newArrivals",
  "home.editorial": "editorial",
  "home.destaques": "featured",
  "home.presentes": "gifts",
  "home.categorias-destaque": "featuredCategories",
  "home.informacoes": "benefits",
  "home.galeria": "gallery",
  "home.cta-final": "finalCta",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: PublicValue | undefined) {
  return typeof value === "string" ? value : "";
}

function stringArrayValue(value: PublicValue | undefined) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function imageValue(
  value: PublicValue | undefined,
): ConteudoImagemPublica | null {
  const record = asRecord(value);

  return record.desktop && record.mobile
    ? (value as ConteudoImagemPublica)
    : null;
}

function cropFocus(crop: ConteudoCrop, axis: "x" | "y") {
  const focal = axis === "x" ? crop.focalX : crop.focalY;
  return typeof focal === "number" ? focal : 50;
}

function zoomPercent(crop: ConteudoCrop) {
  return Math.max(20, Math.min(220, crop.zoom * 100));
}

function cloneRecordArray(value: unknown) {
  return asArray(value).map((item) => ({ ...asRecord(item) }));
}

function applyHero(
  config: Record<string, unknown>,
  values: ConteudoPaginaPublica["values"],
  changed: (key: string) => boolean,
) {
  const slides = cloneRecordArray(config.slides);
  const slide = { ...asRecord(slides[0]) };
  const content = { ...asRecord(slide.conteudo) };
  const setContent = (name: "eyebrow" | "titulo" | "texto", key: string) => {
    if (!changed(key)) return;
    content[name] = {
      ...asRecord(content[name]),
      conteudo: stringValue(values[key]),
    };
  };

  setContent("eyebrow", "hero.eyebrow");
  setContent("titulo", "hero.title");
  setContent("texto", "hero.text");

  const buttons = cloneRecordArray(content.botoes);
  const buttonFields = [
    ["hero.primaryLabel", "hero.primaryHref"],
    ["hero.secondaryLabel", "hero.secondaryHref"],
  ] as const;
  buttonFields.forEach(([labelKey, hrefKey], index) => {
    if (!changed(labelKey) && !changed(hrefKey)) return;
    const button = { ...asRecord(buttons[index]) };
    if (changed(labelKey)) button.texto = stringValue(values[labelKey]);
    if (changed(hrefKey)) {
      button.linkTipo = "URL";
      button.linkValor = stringValue(values[hrefKey]);
    }
    buttons[index] = button;
  });
  content.botoes = buttons;
  slide.conteudo = content;

  if (changed("hero.image")) {
    const image = imageValue(values["hero.image"]);
    if (image) {
      const media = { ...asRecord(slide.midia) };
      media.desktop = {
        ...asRecord(media.desktop),
        url: image.desktopUrl,
        alt: image.alt,
        zoom: zoomPercent(image.desktop),
        positionX: cropFocus(image.desktop, "x"),
        positionY: cropFocus(image.desktop, "y"),
      };
      media.mobile = {
        ...asRecord(media.mobile),
        url: image.mobileUrl,
        alt: image.alt,
        zoom: zoomPercent(image.mobile),
        positionX: cropFocus(image.mobile, "x"),
        positionY: cropFocus(image.mobile, "y"),
      };
      media.usarMidiaMobileAlternativa = false;
      slide.midia = media;
    }
  }

  slides[0] = slide;

  return {
    ...config,
    slides,
    ...(changed("hero.title") ? { stellaUseConfiguredHeroTitle: true } : {}),
  };
}

function applyLinkCards(
  config: Record<string, unknown>,
  prefix: "values" | "benefits",
  values: ConteudoPaginaPublica["values"],
  changed: (key: string) => boolean,
) {
  const result = { ...config };
  if (changed(`${prefix}.title`)) {
    result.titulo = stringValue(values[`${prefix}.title`]);
  }
  if (changed(`${prefix}.text`)) {
    result.descricao = stringValue(values[`${prefix}.text`]);
  }

  const cards = cloneRecordArray(config.cards);
  for (let index = 0; index < 4; index += 1) {
    const cardPrefix = `${prefix}.card${index + 1}`;
    const card = { ...asRecord(cards[index]) };
    if (changed(`${cardPrefix}.title`)) {
      card.titulo = stringValue(values[`${cardPrefix}.title`]);
    }
    if (changed(`${cardPrefix}.text`)) {
      card.texto = stringValue(values[`${cardPrefix}.text`]);
    }
    if (changed(`${cardPrefix}.label`)) {
      card.textoBotao = stringValue(values[`${cardPrefix}.label`]);
    }
    if (changed(`${cardPrefix}.href`)) {
      card.linkBotao = stringValue(values[`${cardPrefix}.href`]);
    }
    cards[index] = card;
  }
  result.cards = cards;

  return result;
}

function applyCategories(
  config: Record<string, unknown>,
  prefix: "categories" | "featuredCategories",
  values: ConteudoPaginaPublica["values"],
  categorias: CategoriaMenuPublicoItem[],
  changed: (key: string) => boolean,
) {
  const result = { ...config };
  if (changed(`${prefix}.title`)) {
    result.titulo = stringValue(values[`${prefix}.title`]);
  }
  if (changed(`${prefix}.text`)) {
    const text = stringValue(values[`${prefix}.text`]);
    result.descricao = text;
    result.subtitulo = text;
  }
  if (changed(`${prefix}.categoryIds`)) {
    const existing = cloneRecordArray(config.itens);
    const existingById = new Map(
      existing.map((item) => [String(item.categoriaId || ""), item]),
    );
    result.itens = stringArrayValue(values[`${prefix}.categoryIds`])
      .map((id, index) => {
        const categoria = categorias.find((item) => item.id === id);
        if (!categoria) return null;
        return {
          tipoMidia: "IMAGEM",
          textoLink: "Explorar",
          ...existingById.get(id),
          id: String(existingById.get(id)?.id || `conteudo-${prefix}-${id}`),
          ordem: index,
          titulo: categoria.nome,
          categoriaId: categoria.id,
          categoriaNome: categoria.nome,
          categoriaSlug: categoria.slug,
          linkUrl: `/loja/categoria/${categoria.slug}`,
        };
      })
      .filter(Boolean);
  }

  return result;
}

function applyProducts(
  config: Record<string, unknown>,
  prefix: "newArrivals" | "featured",
  values: ConteudoPaginaPublica["values"],
  produtos: ProdutoPublico[],
  changed: (key: string) => boolean,
) {
  const result = { ...config };
  if (changed(`${prefix}.title`)) {
    result.titulo = stringValue(values[`${prefix}.title`]);
  }
  if (changed(`${prefix}.text`)) {
    result.descricao = stringValue(values[`${prefix}.text`]);
  }

  if (changed(`${prefix}.productIds`) || changed(`${prefix}.categoryIds`)) {
    const productIds = stringArrayValue(values[`${prefix}.productIds`]);
    const categoryIds = stringArrayValue(values[`${prefix}.categoryIds`]);
    if (productIds.length > 0) {
      result.fonte = "MANUAL";
      result.produtosIds = categoryIds.length > 0
        ? productIds.filter((id) => {
            const produto = produtos.find((item) => item.id === id);
            return produto?.categoriaIds?.some((item) => categoryIds.includes(item));
          })
        : productIds;
      result.categoriasIds = [];
    } else if (categoryIds.length > 0) {
      result.fonte = "CATEGORIAS_SELECIONADAS";
      result.produtosIds = [];
      result.categoriasIds = categoryIds;
    } else {
      result.fonte = prefix === "newArrivals" ? "NOVOS" : "TODOS";
      result.produtosIds = [];
      result.categoriasIds = [];
    }
  }

  if (changed(`${prefix}.ctaLabel`)) {
    result.textoLinkSecao = stringValue(values[`${prefix}.ctaLabel`]);
  }
  if (changed(`${prefix}.ctaHref`)) {
    result.linkSecao = stringValue(values[`${prefix}.ctaHref`]);
  }

  return result;
}

function applyEditorial(
  config: Record<string, unknown>,
  prefix: "editorial" | "gifts",
  values: ConteudoPaginaPublica["values"],
  changed: (key: string) => boolean,
) {
  const result = { ...config };
  if (changed(`${prefix}.title`)) {
    result.titulo = stringValue(values[`${prefix}.title`]);
  }
  if (changed(`${prefix}.text`)) {
    result.texto = stringValue(values[`${prefix}.text`]);
  }
  if (changed(`${prefix}.ctaLabel`)) {
    result.textoBotao = stringValue(values[`${prefix}.ctaLabel`]);
  }
  if (changed(`${prefix}.ctaHref`)) {
    result.linkBotao = stringValue(values[`${prefix}.ctaHref`]);
  }
  if (changed(`${prefix}.image`)) {
    const image = imageValue(values[`${prefix}.image`]);
    if (image) {
      result.imagemDesktopUrl = image.desktopUrl;
      result.imagemDesktop = image.desktopUrl;
      result.imagemUrl = image.desktopUrl;
      result.imagemMobileUrl = image.mobileUrl;
      result.imagemMobile = image.mobileUrl;
      result.imagemAlt = image.alt;
      result.mediaCropDesktopX = cropFocus(image.desktop, "x");
      result.mediaCropDesktopY = cropFocus(image.desktop, "y");
      result.mediaZoomDesktop = zoomPercent(image.desktop);
      result.mediaCropMobileX = cropFocus(image.mobile, "x");
      result.mediaCropMobileY = cropFocus(image.mobile, "y");
      result.mediaZoomMobile = zoomPercent(image.mobile);
      result.stellaUseManagedMediaCrop = true;
    }
  }

  return result;
}

function applyGallery(
  config: Record<string, unknown>,
  values: ConteudoPaginaPublica["values"],
  changed: (key: string) => boolean,
) {
  const result = { ...config };
  if (changed("gallery.title")) {
    result.titulo = stringValue(values["gallery.title"]);
  }
  if (changed("gallery.text")) {
    result.descricao = stringValue(values["gallery.text"]);
  }
  const items = cloneRecordArray(config.itens);
  for (let index = 0; index < 4; index += 1) {
    const prefix = `gallery.item${index + 1}`;
    const item = { ...asRecord(items[index]) };
    if (changed(`${prefix}.title`)) {
      item.titulo = stringValue(values[`${prefix}.title`]);
    }
    if (changed(`${prefix}.text`)) {
      item.subtitulo = stringValue(values[`${prefix}.text`]);
    }
    if (changed(`${prefix}.label`)) {
      item.botaoTexto = stringValue(values[`${prefix}.label`]);
    }
    if (changed(`${prefix}.href`)) {
      item.linkTipo = "URL";
      item.linkValor = stringValue(values[`${prefix}.href`]);
    }
    if (changed(`${prefix}.image`)) {
      const image = imageValue(values[`${prefix}.image`]);
      if (image) {
        item.imagemDesktop = image.desktopUrl;
        item.imagemMobile = image.mobileUrl;
        item.alt = image.alt;
        item.focoX = cropFocus(image.desktop, "x");
        item.focoY = cropFocus(image.desktop, "y");
        item.zoom = zoomPercent(image.desktop);
        item.focoMobileX = cropFocus(image.mobile, "x");
        item.focoMobileY = cropFocus(image.mobile, "y");
        item.zoomMobile = zoomPercent(image.mobile);
      }
    }
    items[index] = item;
  }
  result.itens = items;

  return result;
}

function applyCta(
  config: Record<string, unknown>,
  prefix: "newArrivals" | "finalCta",
  values: ConteudoPaginaPublica["values"],
  changed: (key: string) => boolean,
) {
  const result = { ...config };
  const labelKey = prefix === "newArrivals" ? "newArrivals.ctaLabel" : "finalCta.label";
  const hrefKey = prefix === "newArrivals" ? "newArrivals.ctaHref" : "finalCta.href";
  if (changed(labelKey)) {
    result.textoBotao = stringValue(values[labelKey]);
    result.textoBotaoPrimario = stringValue(values[labelKey]);
  }
  if (changed(hrefKey)) {
    result.linkBotao = stringValue(values[hrefKey]);
    result.linkBotaoPrimario = stringValue(values[hrefKey]);
  }
  if (prefix === "finalCta") {
    if (changed("finalCta.title")) {
      result.titulo = stringValue(values["finalCta.title"]);
    }
    if (changed("finalCta.text")) {
      const text = stringValue(values["finalCta.text"]);
      result.texto = text;
      result.descricao = text;
    }
    if (changed("finalCta.secondaryLabel")) {
      result.textoBotaoSecundario = stringValue(values["finalCta.secondaryLabel"]);
      result.exibirBotaoSecundario = Boolean(result.textoBotaoSecundario);
    }
    if (changed("finalCta.secondaryHref")) {
      result.linkBotaoSecundario = stringValue(values["finalCta.secondaryHref"]);
    }
  }

  return result;
}

function materializeManagedBlocks({
  blocos,
  produtos,
  categorias,
  conteudoGerenciado,
}: StellaHomeExperienceProps) {
  if (!conteudoGerenciado || conteudoGerenciado.contrato.key !== "home") {
    return blocos;
  }

  const values = conteudoGerenciado.conteudo.values;
  // Em NOVO, o contrato é a única fonte de conteúdo. Os blocos recebidos
  // carregam apenas a base visual congelada na primeira publicação.
  const changed = () => true;

  const orderIndex = new Map(
    STELLA_HOME_BLOCK_ORDER.map((blockKey, index) => [blockKey, index]),
  );
  const blocosOrdenados = blocos
    .map((bloco, index) => ({ bloco, index }))
    .sort((a, b) => {
      const orderA = a.bloco.stellaHomeKey
        ? orderIndex.get(a.bloco.stellaHomeKey)
        : undefined;
      const orderB = b.bloco.stellaHomeKey
        ? orderIndex.get(b.bloco.stellaHomeKey)
        : undefined;
      return (orderA ?? Number.MAX_SAFE_INTEGER) -
        (orderB ?? Number.MAX_SAFE_INTEGER) || a.index - b.index;
    })
    .map(({ bloco }) => bloco);

  return blocosOrdenados.flatMap((bloco) => {
    const blockKey = bloco.stellaHomeKey;
    if (!blockKey) return [bloco];
    if (blockKey === "home.novidades-cta") return [];
    const section = SECTION_BY_BLOCK[blockKey];
    if (section && values[`${section}.enabled`] === false) return [];

    const config = asRecord(bloco.configJson);
    let nextConfig = config;
    if (blockKey === "home.hero") {
      nextConfig = applyHero(config, values, changed);
    } else if (blockKey === "home.valores") {
      nextConfig = applyLinkCards(config, "values", values, changed);
    } else if (blockKey === "home.categorias") {
      nextConfig = applyCategories(config, "categories", values, categorias, changed);
    } else if (blockKey === "home.novidades") {
      nextConfig = applyProducts(config, "newArrivals", values, produtos, changed);
    } else if (blockKey === "home.editorial") {
      nextConfig = applyEditorial(config, "editorial", values, changed);
    } else if (blockKey === "home.destaques") {
      nextConfig = applyProducts(config, "featured", values, produtos, changed);
    } else if (blockKey === "home.presentes") {
      nextConfig = applyEditorial(config, "gifts", values, changed);
    } else if (blockKey === "home.categorias-destaque") {
      nextConfig = applyCategories(
        config,
        "featuredCategories",
        values,
        categorias,
        changed,
      );
    } else if (blockKey === "home.informacoes") {
      nextConfig = applyLinkCards(config, "benefits", values, changed);
    } else if (blockKey === "home.galeria") {
      nextConfig = applyGallery(config, values, changed);
    } else if (blockKey === "home.cta-final") {
      nextConfig = applyCta(config, "finalCta", values, changed);
    }

    return [{ ...bloco, configJson: nextConfig }];
  });
}

export function canRenderStellaHomeExperience(
  pagina: StellaHomeExperiencePage,
  blocos: StellaHomeExperienceBlock[],
) {
  return (
    pagina.tipo === "HOME" &&
    pagina.slug === "home" &&
    blocos.length > 0 &&
    blocos.every(
      (bloco) =>
        Boolean(bloco.stellaHomeKey) &&
        canRenderStellaHomeBlock(bloco, bloco.stellaHomeKey!),
    )
  );
}

export default function StellaHomeExperience(props: StellaHomeExperienceProps) {
  const { pagina, produtos, categorias, conteudoGerenciado } = props;
  const blocosBase = props.blocos;
  const blocos = useMemo(
    () =>
      materializeManagedBlocks({
        pagina,
        blocos: blocosBase,
        produtos,
        categorias,
        conteudoGerenciado,
      }),
    [blocosBase, categorias, conteudoGerenciado, pagina, produtos],
  );

  return blocos.map((bloco) => {
    const blockKey = bloco.stellaHomeKey;
    if (!blockKey || !canRenderStellaHomeBlock(bloco, blockKey)) return null;

    return (
      <div
        key={bloco.id}
        data-studio-bloco-id={bloco.id}
        data-studio-bloco-tipo={bloco.tipo}
      >
        <StellaHomeBlockRenderer
          bloco={bloco}
          blockKey={blockKey}
          produtos={produtos}
          categorias={categorias}
        />
      </div>
    );
  });
}
