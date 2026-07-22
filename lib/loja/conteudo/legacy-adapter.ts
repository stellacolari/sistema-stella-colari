import {
  criarConteudoPadrao,
  criarImagemConteudoVazia,
  normalizarConteudoPagina,
  resolverContratoPagina,
  type ConteudoContrato,
  type ConteudoImagem,
  type ConteudoPaginaPayload,
} from "./contracts.ts";
import {
  getStellaHomeBlockKey,
  STELLA_HOME_HERO_TITLE,
} from "../stella-home-contract.ts";

export type BlocoLegadoConteudo = {
  id: string;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ordem: number;
  configJson: unknown;
};

export type PaginaLegadaConteudo = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  blocos: BlocoLegadoConteudo[];
};

export type ResultadoAdaptacaoLegado = {
  contrato: ConteudoContrato;
  conteudo: ConteudoPaginaPayload;
  avisos: string[];
  blocosNaoMapeados: Array<{ id: string; tipo: string; titulo: string | null }>;
  blocosMapeadosIds: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function legacyZoom(value: unknown) {
  const parsed = numberValue(value, 100);
  return Math.max(1, parsed <= 4 ? parsed : parsed / 100);
}

function getSetupKey(bloco: BlocoLegadoConteudo) {
  const setup = asRecord(asRecord(bloco.configJson)._stellaSetup);
  return stringValue(setup.key);
}

function getBlock(
  blocos: BlocoLegadoConteudo[],
  keys: string[],
  tipos: string[] = [],
) {
  const byKey = blocos.find((bloco) => keys.includes(getSetupKey(bloco)));
  if (byKey) return byKey;
  return blocos.find((bloco) => tipos.includes(bloco.tipo));
}

function mediaFromLegacy(
  input: unknown,
  aspectDesktop: number,
  aspectMobile: number,
): ConteudoImagem {
  const config = asRecord(input);
  const nested = asRecord(config.midia);
  const desktop = asRecord(nested.desktop);
  const mobile = asRecord(nested.mobile);
  const result = criarImagemConteudoVazia(aspectDesktop, aspectMobile);

  const desktopUrl =
    stringValue(desktop.url) ||
    stringValue(config.imagemDesktopUrl) ||
    stringValue(config.imagemDesktop) ||
    stringValue(config.imagemUrl);
  const mobileUrl =
    stringValue(config.mobileUrl) ||
    stringValue(config.imagemMobileUrl) ||
    stringValue(config.imagemMobile) ||
    stringValue(mobile.url);
  const alt =
    stringValue(desktop.alt) ||
    stringValue(config.imagemAlt) ||
    stringValue(config.alt) ||
    stringValue(mobile.alt);
  const desktopX = numberValue(
    desktop.positionX ?? config.mediaCropDesktopX ?? config.focoX,
    50,
  );
  const desktopY = numberValue(
    desktop.positionY ?? config.mediaCropDesktopY ?? config.focoY,
    50,
  );
  const mobileX = numberValue(
    mobile.positionX ?? config.mediaCropMobileX ?? config.focoMobileX,
    50,
  );
  const mobileY = numberValue(
    mobile.positionY ?? config.mediaCropMobileY ?? config.focoMobileY,
    50,
  );

  return {
    ...result,
    assetId: stringValue(desktop.assetId ?? config.assetId),
    desktopUrl,
    mobileAssetId: stringValue(mobile.assetId ?? config.mobileAssetId),
    mobileUrl,
    alt,
    desktop: {
      ...result.desktop,
      zoom: legacyZoom(desktop.zoom ?? config.mediaZoomDesktop ?? config.zoom),
      focalX: desktopX,
      focalY: desktopY,
    },
    mobile: {
      ...result.mobile,
      zoom: legacyZoom(mobile.zoom ?? config.mediaZoomMobile ?? config.zoomMobile),
      focalX: mobileX,
      focalY: mobileY,
    },
  };
}

function applyHero(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);
  const slide = asRecord(asArray(config.slides)[0]);
  const content = asRecord(slide.conteudo);
  const eyebrow = asRecord(content.eyebrow);
  const title = asRecord(content.titulo);
  const text = asRecord(content.texto);
  const buttons = asArray(content.botoes).map(asRecord);
  const primary = buttons[0] ?? {};
  const secondary = buttons[1] ?? {};

  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.eyebrow`] =
    stringValue(eyebrow.conteudo) || stringValue(config.eyebrow);
  values[`${prefix}.title`] =
    stringValue(title.conteudo) ||
    stringValue(config.titulo) ||
    stringValue(config.textoPrincipal) ||
    bloco.titulo || "";
  values[`${prefix}.text`] =
    stringValue(text.conteudo) || stringValue(config.descricao) || stringValue(config.texto);
  values[`${prefix}.image`] = mediaFromLegacy(
    Object.keys(slide).length > 0 ? slide : config,
    16 / 9,
    4 / 5,
  );
  values[`${prefix}.primaryLabel`] =
    stringValue(primary.texto) ||
    stringValue(primary.label) ||
    stringValue(config.textoBotao);
  values[`${prefix}.primaryHref`] =
    stringValue(primary.href) ||
    stringValue(primary.link) ||
    stringValue(primary.linkValor) ||
    stringValue(config.linkBotao) ||
    stringValue(config.linkUrl);
  values[`${prefix}.secondaryLabel`] =
    stringValue(secondary.texto) || stringValue(secondary.label);
  values[`${prefix}.secondaryHref`] =
    stringValue(secondary.href) ||
    stringValue(secondary.link) ||
    stringValue(secondary.linkValor);
}

function applyEditorial(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);

  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.title`] = stringValue(config.titulo) || bloco.titulo || "";
  values[`${prefix}.text`] =
    stringValue(config.texto) || stringValue(config.descricao) || stringValue(config.conteudo);
  values[`${prefix}.image`] = mediaFromLegacy(config, 4 / 5, 4 / 5);
  values[`${prefix}.ctaLabel`] =
    stringValue(config.textoBotao) || stringValue(config.botaoTexto);
  values[`${prefix}.ctaHref`] =
    stringValue(config.linkBotao) || stringValue(config.botaoLink) || stringValue(config.linkUrl);
}

function applyProducts(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);

  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.title`] = stringValue(config.titulo) || bloco.titulo || "";
  values[`${prefix}.text`] = stringValue(config.descricao) || stringValue(config.texto);
  values[`${prefix}.productIds`] = asArray(config.produtosIds)
    .map(stringValue)
    .filter(Boolean);
  values[`${prefix}.categoryIds`] = [
    ...asArray(config.categoriasIds),
    ...asArray(config.categorias),
    config.categoriaId,
  ]
    .map(stringValue)
    .filter(Boolean);
}

function applyCategories(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);
  const itens = asArray(config.itens).map(asRecord);

  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.title`] = stringValue(config.titulo) || bloco.titulo || "";
  values[`${prefix}.text`] = stringValue(config.descricao) || stringValue(config.subtitulo);
  values[`${prefix}.categoryIds`] = itens
    .map((item) => item.categoriaId || item.id)
    .map(stringValue)
    .filter(Boolean);
}

function applyLinkCards(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
  limit: number,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);
  const cards = asArray(config.cards).map(asRecord).slice(0, limit);

  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.title`] = stringValue(config.titulo) || bloco.titulo || "";
  values[`${prefix}.text`] = stringValue(config.descricao) || stringValue(config.texto);

  cards.forEach((card, index) => {
    const cardPrefix = `${prefix}.card${index + 1}`;
    values[`${cardPrefix}.title`] = stringValue(card.titulo);
    values[`${cardPrefix}.text`] = stringValue(card.texto) || stringValue(card.descricao);
    values[`${cardPrefix}.label`] = stringValue(card.textoBotao);
    values[`${cardPrefix}.href`] = stringValue(card.linkBotao) || stringValue(card.linkValor);
  });
}

function applyProductCta(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);
  values[`${prefix}.ctaLabel`] =
    stringValue(config.textoBotaoPrimario) || stringValue(config.textoBotao);
  values[`${prefix}.ctaHref`] =
    stringValue(config.linkBotaoPrimario) || stringValue(config.linkBotao);
}

function applyGallery(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);
  const items = asArray(config.itens).map(asRecord).slice(0, 4);

  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.title`] = stringValue(config.titulo) || bloco.titulo || "";
  values[`${prefix}.text`] = stringValue(config.descricao);

  items.forEach((item, index) => {
    const itemPrefix = `${prefix}.item${index + 1}`;
    values[`${itemPrefix}.image`] = mediaFromLegacy(item, 4 / 5, 4 / 5);
    values[`${itemPrefix}.title`] = stringValue(item.titulo);
    values[`${itemPrefix}.text`] = stringValue(item.subtitulo);
    values[`${itemPrefix}.label`] = stringValue(item.botaoTexto);
    values[`${itemPrefix}.href`] = stringValue(item.linkValor);
  });
}

function applyCta(
  values: Record<string, unknown>,
  prefix: string,
  bloco: BlocoLegadoConteudo | undefined,
) {
  if (!bloco) return;
  const config = asRecord(bloco.configJson);
  values[`${prefix}.enabled`] = bloco.ativo;
  values[`${prefix}.title`] = stringValue(config.titulo) || bloco.titulo || "";
  values[`${prefix}.text`] = stringValue(config.texto) || stringValue(config.descricao);
  values[`${prefix}.label`] =
    stringValue(config.textoBotaoPrimario) || stringValue(config.textoBotao);
  values[`${prefix}.href`] =
    stringValue(config.linkBotaoPrimario) || stringValue(config.linkBotao);
  values[`${prefix}.secondaryLabel`] = stringValue(config.textoBotaoSecundario);
  values[`${prefix}.secondaryHref`] = stringValue(config.linkBotaoSecundario);
}

function mappedBlockIds(blocos: Array<BlocoLegadoConteudo | undefined>) {
  return new Set(blocos.filter(Boolean).map((bloco) => bloco!.id));
}

/**
 * @deprecated Adaptador transitório. A fonte legada nunca é modificada aqui.
 */
export function adaptarBuilderLegado(
  pagina: PaginaLegadaConteudo,
): ResultadoAdaptacaoLegado {
  const contrato = resolverContratoPagina(pagina);
  const base = criarConteudoPadrao(contrato);
  const values = { ...base.values } as Record<string, unknown>;
  const ativos = pagina.blocos
    .filter((bloco) => bloco.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  const usados: Array<BlocoLegadoConteudo | undefined> = [];

  const hero = getBlock(ativos, [`${pagina.slug}.hero`, "home.hero"], ["BANNER_HERO_V2", "BANNER"]);
  applyHero(values, "hero", hero);
  if (hero && getStellaHomeBlockKey(hero) === "home.hero") {
    // O renderer aprovado da Home sempre exibiu este título. O contrato legado
    // precisa refletir a saída visual real, não o texto obsoleto ainda guardado
    // no bloco, para que restaurar/publicar não crie uma divergência invisível.
    values["hero.title"] = STELLA_HOME_HERO_TITLE;
    const heroSlide = asRecord(asArray(asRecord(hero.configJson).slides)[0]);
    const heroOverlay = asRecord(heroSlide.overlay);
    values["hero.overlayOpacity"] = Math.max(
      0,
      Math.min(100, numberValue(heroOverlay.opacidade, 58)),
    );
  }
  usados.push(hero);

  if (contrato.key === "home") {
    const valuesBlock = getBlock(ativos, ["home.valores"]);
    const categories = getBlock(ativos, ["home.categorias"], ["COLECOES_CATEGORIAS"]);
    const newArrivals = getBlock(ativos, ["home.novidades"], ["LISTA_PRODUTOS"]);
    const newArrivalsCta = getBlock(ativos, ["home.novidades-cta"]);
    const editorial = getBlock(ativos, ["home.editorial"], ["TEXTO_IMAGEM"]);
    const featured = getBlock(ativos, ["home.destaques"]);
    const gifts = getBlock(ativos, ["home.presentes"]);
    const featuredCategories = getBlock(ativos, ["home.categorias-destaque"]);
    const benefits = getBlock(ativos, ["home.informacoes"]);
    const gallery = getBlock(ativos, ["home.galeria"]);
    const finalCta = getBlock(ativos, ["home.cta-final"], ["CTA_SIMPLES", "CTA"]);

    applyLinkCards(values, "values", valuesBlock, 4);
    applyCategories(values, "categories", categories);
    applyProducts(values, "newArrivals", newArrivals);
    applyProductCta(values, "newArrivals", newArrivalsCta);
    applyEditorial(values, "editorial", editorial);
    applyProducts(values, "featured", featured);
    applyEditorial(values, "gifts", gifts);
    applyCategories(values, "featuredCategories", featuredCategories);
    applyLinkCards(values, "benefits", benefits, 4);
    applyGallery(values, "gallery", gallery);
    applyCta(values, "finalCta", finalCta);
    usados.push(
      valuesBlock,
      categories,
      newArrivals,
      newArrivalsCta,
      editorial,
      featured,
      gifts,
      featuredCategories,
      benefits,
      gallery,
      finalCta,
    );
  } else if (contrato.key === "novidades" || contrato.key === "ofertas") {
    const products = getBlock(
      ativos,
      [`${pagina.slug}.produtos`],
      ["LISTA_PRODUTOS", "PRODUTOS"],
    );
    const cta = getBlock(ativos, [`${pagina.slug}.cta`], ["CTA_SIMPLES", "CTA"]);
    applyProducts(values, "products", products);
    applyCta(values, "cta", cta);
    usados.push(products, cta);
  } else if (contrato.key === "presentes") {
    const editorial = getBlock(ativos, ["presentes.editorial"], ["TEXTO_IMAGEM"]);
    const products = getBlock(ativos, ["presentes.produtos"], ["LISTA_PRODUTOS"]);
    const categories = getBlock(ativos, ["presentes.categorias"], ["COLECOES_CATEGORIAS"]);
    applyEditorial(values, "editorial", editorial);
    applyProducts(values, "products", products);
    applyCategories(values, "categories", categories);
    usados.push(editorial, products, categories);
  } else if (contrato.key === "sobre") {
    const story = getBlock(ativos, ["sobre.historia", "sobre.story"], ["TEXTO_IMAGEM"]);
    const cta = getBlock(ativos, ["sobre.cta"], ["CTA_SIMPLES", "CTA"]);
    applyEditorial(values, "story", story);
    applyCta(values, "cta", cta);
    usados.push(story, cta);
  } else if (contrato.key === "atendimento") {
    const links = getBlock(ativos, ["atendimento.links"], ["DESTAQUES_CARDS"]);
    applyLinkCards(values, "links", links, 5);
    usados.push(links);
  } else if (contrato.key === "campanha" || contrato.key === "pagina-editorial") {
    const editorial = ativos.find((bloco) => bloco.tipo === "TEXTO_IMAGEM");
    const selection = ativos.find((bloco) => ["LISTA_PRODUTOS", "PRODUTOS"].includes(bloco.tipo));
    const cta = ativos.find((bloco) => ["CTA_SIMPLES", "CTA"].includes(bloco.tipo));
    applyEditorial(values, "editorial", editorial);
    applyProducts(values, "selection", selection);
    applyCta(values, "cta", cta);
    usados.push(editorial, selection, cta);
  }

  values["seo.title"] = pagina.seoTitle || "";
  values["seo.description"] = pagina.seoDescription || "";

  const idsMapeados = mappedBlockIds(usados);
  const blocosNaoMapeados = ativos
    .filter((bloco) => !idsMapeados.has(bloco.id))
    .map((bloco) => ({ id: bloco.id, tipo: bloco.tipo, titulo: bloco.titulo }));
  const avisos: string[] = [];

  if (blocosNaoMapeados.length > 0) {
    avisos.push(
      `${blocosNaoMapeados.length} seção(ões) legada(s) ativa(s) exigem revisão antes de ativar a experiência nova.`,
    );
  }

  const conteudo = normalizarConteudoPagina(contrato, {
    contractKey: contrato.key,
    contractVersion: contrato.version,
    values,
  });

  return {
    contrato,
    conteudo,
    avisos,
    blocosNaoMapeados,
    blocosMapeadosIds: Array.from(idsMapeados),
  };
}

export function builderLegadoPodeSerAtivado(result: ResultadoAdaptacaoLegado) {
  return result.blocosNaoMapeados.length === 0;
}
