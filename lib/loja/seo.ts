import type { Metadata } from "next";

export const LOJA_NOME = "Stella Colari";
export const LOJA_DESCRICAO_PADRAO =
  "Joias e acessorios selecionados da Stella Colari para comprar online com praticidade.";

const SITE_URL_FALLBACK = "https://sistema-stella-colari.vercel.app";
const MOEDA_PADRAO = "BRL";

type MetadataOptions = {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  robots?: Metadata["robots"];
  type?: "website" | "article";
};

type BuilderBlockLike = {
  configJson?: unknown;
};

type ProductJsonLdProduto = {
  id: string;
  nome: string;
  imagemUrl?: string | null;
  imagens?: string[];
  categoria?: string | null;
  precoVenda: number;
  descontoAtivo?: boolean;
  precoPromocional?: number | null;
  descricaoLoja?: string | null;
  disponivel?: boolean;
};

export function getLojaBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return normalizarBaseUrl(configuredUrl || SITE_URL_FALLBACK);
}

export function getLojaUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = getLojaBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

export function criarMetadataLoja({
  title,
  description,
  path,
  image,
  robots,
  type = "website",
}: MetadataOptions): Metadata {
  const metadataBase = new URL(getLojaBaseUrl());
  const canonical = getLojaUrl(path);
  const resolvedDescription =
    limparTexto(description) || LOJA_DESCRICAO_PADRAO;
  const imageUrl = normalizarImagemAbsoluta(image);
  const images = imageUrl ? [{ url: imageUrl }] : undefined;

  return {
    title,
    description: resolvedDescription,
    metadataBase,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description: resolvedDescription,
      url: canonical,
      siteName: LOJA_NOME,
      locale: "pt_BR",
      type,
      images,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description: resolvedDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots,
  };
}

export function criarDescricaoProduto(produto: ProductJsonLdProduto) {
  const descricao = limparTexto(produto.descricaoLoja);

  if (descricao) {
    return limitarTexto(descricao, 158);
  }

  const preco = formatarPrecoProduto(produto);
  const categoria = limparTexto(produto.categoria);

  if (categoria && preco) {
    return `${produto.nome} em ${categoria}, disponivel na Stella Colari por ${preco}.`;
  }

  if (categoria) {
    return `${produto.nome} em ${categoria}, disponivel na Stella Colari.`;
  }

  if (preco) {
    return `${produto.nome}, disponivel na Stella Colari por ${preco}.`;
  }

  return `${produto.nome}, disponivel na loja online Stella Colari.`;
}

export function criarJsonLdProduto(produto: ProductJsonLdProduto) {
  const imagens = getImagensProduto(produto)
    .map((imagem) => normalizarImagemAbsoluta(imagem))
    .filter((imagem): imagem is string => Boolean(imagem));
  const precoAtual = getPrecoAtualProduto(produto);
  const availability =
    produto.disponivel === false
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

  return removerCamposVazios({
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    description: criarDescricaoProduto(produto),
    image: imagens.length > 0 ? imagens : undefined,
    brand: {
      "@type": "Brand",
      name: LOJA_NOME,
    },
    category: limparTexto(produto.categoria) || undefined,
    offers: removerCamposVazios({
      "@type": "Offer",
      url: getLojaUrl(`/loja/produto/${produto.id}`),
      priceCurrency: MOEDA_PADRAO,
      price: precoAtual.toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    }),
  });
}

export function getImagemPrincipalProduto(produto: ProductJsonLdProduto) {
  return getImagensProduto(produto)[0] || null;
}

export function getPrecoAtualProduto(produto: ProductJsonLdProduto) {
  if (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional !== undefined &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  ) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
}

export function getImagemSeoBlocos(blocos: BuilderBlockLike[] = []) {
  for (const bloco of blocos) {
    const imagem = encontrarImagemEmObjeto(bloco.configJson);

    if (imagem) {
      return imagem;
    }
  }

  return null;
}

export function limparTexto(valor?: string | null) {
  if (!valor) return "";

  return valor
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function limitarTexto(valor: string, limite = 158) {
  const texto = limparTexto(valor);

  if (texto.length <= limite) {
    return texto;
  }

  return `${texto.slice(0, limite - 1).trim()}...`;
}

function normalizarBaseUrl(url: string) {
  const valor = url.trim().replace(/\/+$/, "");

  if (!valor) {
    return SITE_URL_FALLBACK;
  }

  if (/^https?:\/\//i.test(valor)) {
    return valor;
  }

  return `https://${valor}`;
}

function normalizarImagemAbsoluta(imagem?: string | null) {
  if (!imagem) return null;

  const valor = imagem.trim();

  if (!valor || valor.startsWith("data:")) {
    return null;
  }

  if (/^https?:\/\//i.test(valor)) {
    return valor;
  }

  if (valor.startsWith("//")) {
    return `https:${valor}`;
  }

  return getLojaUrl(valor.startsWith("/") ? valor : `/${valor}`);
}

function getImagensProduto(produto: ProductJsonLdProduto) {
  const imagens = [
    produto.imagemUrl,
    ...(Array.isArray(produto.imagens) ? produto.imagens : []),
  ];

  return Array.from(
    new Set(imagens.filter((imagem): imagem is string => Boolean(imagem)))
  );
}

function formatarPrecoProduto(produto: ProductJsonLdProduto) {
  const preco = getPrecoAtualProduto(produto);

  if (!Number.isFinite(preco)) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: MOEDA_PADRAO,
  }).format(preco);
}

function encontrarImagemEmObjeto(valor: unknown, profundidade = 0): string | null {
  if (!valor || profundidade > 5) {
    return null;
  }

  if (typeof valor === "string") {
    return null;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      const imagem = encontrarImagemEmObjeto(item, profundidade + 1);

      if (imagem) {
        return imagem;
      }
    }

    return null;
  }

  if (typeof valor !== "object") {
    return null;
  }

  const objeto = valor as Record<string, unknown>;
  const chavesPrioritarias = [
    "imagemSocial",
    "ogImage",
    "openGraphImage",
    "imagemDesktop",
    "imagemDesktopUrl",
    "imagemUrl",
    "imagem",
    "backgroundImageUrl",
    "backgroundImage",
    "poster",
    "videoPosterUrl",
    "imagemMobile",
    "imagemMobileUrl",
  ];

  for (const chave of chavesPrioritarias) {
    const item = objeto[chave];

    if (typeof item === "string" && pareceImagem(item)) {
      return item;
    }
  }

  const urlCrop = objeto.url;
  const pareceCropDeImagem =
    Object.prototype.hasOwnProperty.call(objeto, "aspectRatio") &&
    (Object.prototype.hasOwnProperty.call(objeto, "positionX") ||
      Object.prototype.hasOwnProperty.call(objeto, "positionY") ||
      Object.prototype.hasOwnProperty.call(objeto, "zoom"));

  if (
    pareceCropDeImagem &&
    typeof urlCrop === "string" &&
    pareceImagem(urlCrop)
  ) {
    return urlCrop;
  }

  for (const chave of ["imagens", "images"]) {
    const itens = objeto[chave];

    if (!Array.isArray(itens)) continue;

    for (const item of itens) {
      if (typeof item === "string" && pareceImagem(item)) {
        return item;
      }

      const imagem = encontrarImagemEmObjeto(item, profundidade + 1);

      if (imagem) return imagem;
    }
  }

  for (const item of Object.values(objeto)) {
    const imagem = encontrarImagemEmObjeto(item, profundidade + 1);

    if (imagem) {
      return imagem;
    }
  }

  return null;
}

function pareceImagem(valor: string) {
  const texto = valor.trim();

  if (!texto || texto.startsWith("#") || texto.startsWith("data:")) {
    return false;
  }

  return (
    /^https?:\/\//i.test(texto) ||
    texto.startsWith("/") ||
    /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(texto)
  );
}

function removerCamposVazios<T>(objeto: T): T {
  if (!objeto || typeof objeto !== "object" || Array.isArray(objeto)) {
    return objeto;
  }

  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined)
  ) as T;
}
