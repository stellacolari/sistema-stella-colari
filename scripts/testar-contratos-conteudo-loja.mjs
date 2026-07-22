import assert from "node:assert/strict";
import {
  CONTEUDO_CONTRATOS,
  criarConteudoPadrao,
  criarImagemConteudoVazia,
  getConteudoContratoVersionado,
  normalizarConteudoImagem,
  normalizarConteudoPagina,
  parseDataHoraConteudo,
  projetarConteudoPublico,
  urlConteudoPermitida,
  validarConteudoPagina,
} from "../lib/loja/conteudo/contracts.ts";
import {
  rotaPublicaConteudoPagina,
} from "../lib/loja/conteudo/public-route.ts";

const identities = new Set();

assert.equal(urlConteudoPermitida("javascript:alert(1)"), false);
assert.equal(urlConteudoPermitida("//dominio-malicioso.example"), false);
assert.equal(urlConteudoPermitida("/loja/presentes"), true);
assert.equal(urlConteudoPermitida("https://instagram.com/stellacolari"), true);
assert.equal(rotaPublicaConteudoPagina({ tipo: "BUSCA_GLOBAL", slug: "busca-global" }), "/loja/busca");
assert.equal(rotaPublicaConteudoPagina({ tipo: "LEGAL", slug: "termos-de-uso" }), "/loja/termos-de-uso");
assert.equal(rotaPublicaConteudoPagina({ tipo: "PRODUTO_GLOBAL", slug: "produto-global" }), null);
assert.equal(
  rotaPublicaConteudoPagina({
    tipo: "CATEGORIA",
    slug: "pagina-categoria",
    categoria: { slug: "aneis" },
  }),
  "/loja/categoria/aneis",
);

assert.equal(
  parseDataHoraConteudo("2026-07-23T10:00")?.toISOString(),
  "2026-07-23T13:00:00.000Z",
  "Datas locais do painel devem usar o fuso operacional de São Paulo (-03:00).",
);
assert.equal(
  parseDataHoraConteudo("2026-07-23"),
  null,
  "Data sem horário não pode ser aceita como janela de campanha.",
);
assert.equal(
  parseDataHoraConteudo("2026-02-31T10:00"),
  null,
  "Datas de calendário inválidas devem ser rejeitadas.",
);

for (const contract of CONTEUDO_CONTRATOS) {
  const identity = `${contract.key}@${contract.version}`;
  assert(!identities.has(identity), `Contrato duplicado: ${identity}`);
  identities.add(identity);
  assert.equal(getConteudoContratoVersionado(contract.key, contract.version), contract);

  const fieldKeys = contract.sections.flatMap((section) =>
    section.campos.map((field) => field.key),
  );
  assert.equal(
    new Set(fieldKeys).size,
    fieldKeys.length,
    `Campos duplicados em ${identity}`,
  );

  const defaults = criarConteudoPadrao(contract);
  const normalized = normalizarConteudoPagina(contract, defaults);
  assert.deepEqual(normalized, defaults, `Defaults instáveis em ${identity}`);
}

const home = getConteudoContratoVersionado("home", 1);
const invalidHome = criarConteudoPadrao(home);
invalidHome.values["hero.title"] = "Viva Stella Colari.";
invalidHome.values["hero.primaryHref"] = "javascript:alert(1)";
assert(
  validarConteudoPagina(home, invalidHome, "PUBLICAR").some(
    (issue) => issue.campo === "hero.primaryHref" && issue.nivel === "ERRO",
  ),
  "Link inseguro deveria bloquear publicação.",
);

const mobileOnlyHome = criarConteudoPadrao(home);
mobileOnlyHome.values["hero.title"] = "Viva Stella Colari.";
mobileOnlyHome.values["hero.image"] = {
  ...criarImagemConteudoVazia(16 / 9, 4 / 5),
  mobileUrl: "/uploads/conteudo/mobile.webp",
};
assert(
  validarConteudoPagina(home, mobileOnlyHome, "PUBLICAR").some(
    (issue) => issue.campo === "hero.image" && issue.nivel === "ERRO",
  ),
  "Imagem exclusivamente mobile também deve exigir texto alternativo.",
);

const category = getConteudoContratoVersionado("categoria", 1);
const defaultCategory = criarConteudoPadrao(category);
assert(
  !validarConteudoPagina(category, defaultCategory, "PUBLICAR").some(
    (issue) => issue.campo === "hero.title",
  ),
  "O template de categoria deve poder herdar o nome real da categoria.",
);

const legal = getConteudoContratoVersionado("legal", 1);
const legalWithoutReview = criarConteudoPadrao(legal);
legalWithoutReview.values["content.title"] = "Política";
legalWithoutReview.values["content.body"] = "Conteúdo revisável.";
assert(
  validarConteudoPagina(legal, legalWithoutReview, "PUBLICAR").some(
    (issue) => issue.campo === "content.reviewConfirmed" && issue.nivel === "ERRO",
  ),
  "Conteúdo jurídico não pode ser publicado sem confirmação de revisão humana.",
);
legalWithoutReview.values["content.reviewConfirmed"] = true;
assert(
  !validarConteudoPagina(legal, legalWithoutReview, "PUBLICAR").some(
    (issue) => issue.campo === "content.reviewConfirmed",
  ),
  "A confirmação explícita deve liberar a guarda de revisão jurídica.",
);
legalWithoutReview.values["seo.canonical"] = "/interno-nao-serializar";
const legalPublico = projetarConteudoPublico(legal, legalWithoutReview);
assert.equal(legalPublico.conteudo.values["content.reviewConfirmed"], undefined);
assert.equal(legalPublico.conteudo.values["seo.canonical"], undefined);
assert(!legalPublico.contrato.sections.some((section) => section.tipoVisual === "SEO"));

const campaign = getConteudoContratoVersionado("campanha", 1);
const invalidCampaign = criarConteudoPadrao(campaign);
invalidCampaign.values["settings.internalName"] = "Teste";
invalidCampaign.values["hero.title"] = "Teste";
invalidCampaign.values["settings.startAt"] = "2026-07-23T10:00";
invalidCampaign.values["settings.endAt"] = "2026-07-22T10:00";
assert(
  validarConteudoPagina(campaign, invalidCampaign, "PUBLICAR").some(
    (issue) => issue.campo === "settings.endAt" && issue.nivel === "ERRO",
  ),
  "Janela temporal invertida deveria bloquear publicação.",
);
const campanhaPublica = projetarConteudoPublico(campaign, invalidCampaign);
assert.equal(campanhaPublica.conteudo.values["settings.startAt"], undefined);
assert.equal(campanhaPublica.conteudo.values["settings.priority"], undefined);

const homeComMidia = criarConteudoPadrao(home);
homeComMidia.values["hero.image"] = {
  ...criarImagemConteudoVazia(16 / 9, 4 / 5),
  assetId: "asset-interno-desktop",
  mobileAssetId: "asset-interno-mobile",
  desktopUrl: "/uploads/conteudo/hero.webp",
  mobileUrl: "/uploads/conteudo/hero-mobile.webp",
};
const homePublica = projetarConteudoPublico(home, homeComMidia);
const imagemPublica = homePublica.conteudo.values["hero.image"];
assert.equal(imagemPublica.assetId, undefined);
assert.equal(imagemPublica.mobileAssetId, undefined);
assert(!JSON.stringify(homePublica).includes("asset-interno"));

const image = criarImagemConteudoVazia(16 / 9, 4 / 5);
const normalizedImage = normalizarConteudoImagem(
  {
    ...image,
    desktop: {
      ...image.desktop,
      zoom: 99,
      areaPercent: { x: -20, y: 140, width: 0, height: 140 },
    },
  },
  16 / 9,
  4 / 5,
);
assert.equal(normalizedImage.desktop.zoom, 4);
assert.deepEqual(normalizedImage.desktop.areaPercent, {
  x: 0,
  y: 0,
  width: 1,
  height: 100,
});

console.log(`Contratos validados: ${CONTEUDO_CONTRATOS.length}.`);
