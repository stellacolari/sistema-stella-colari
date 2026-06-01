import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBackgroundClass,
  getBoolean,
  getGridColumnsClass,
  getNumber,
  getRichText,
  getSpacingClass,
  getArray,
  getString,
  getStringWithDefault,
  hasTextContent,
  getTextColorForBackground,
  produtoTemDesconto,
  type BlocoPublicoProps,
  type ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

function filtrarProdutos(produtos: ProdutoPublico[], config: Record<string, unknown>) {
  const fonte = getString(config, "fonte", "TODOS");
  const categoriaId = getString(config, "categoriaId");
  const categoriaSlug = getString(config, "categoriaSlug");
  const categoriaNome = getString(config, "categoriaNome");
  const categoriasIds = getArray(config, "categoriasIds").map(String);
  const categoriasLegadas = getArray(config, "categorias").map(String);
  const categoriasSlugs = getArray(config, "categoriasSlugs").map(String);
  const categoriasNomes = getArray(config, "categoriasNomes").map(String);
  const produtosIds = getArray(config, "produtosIds").map(String);
  let resultado = [...produtos];

  if (fonte === "DESCONTOS") {
    resultado = resultado.filter(produtoTemDesconto);
  }

  if (fonte === "NOVOS") {
    resultado = resultado.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  }

  if (fonte === "MAIS_VENDIDOS") {
    resultado = resultado.sort((a, b) => b.vendidosTotal - a.vendidosTotal);
  }

  if (fonte === "CATEGORIA") {
    if (!categoriaId && !categoriaSlug && !categoriaNome) {
      return [];
    }

    resultado = resultado.filter((produto) => {
      return (
        Boolean(categoriaId && produto.categoriaIds?.includes(categoriaId)) ||
        Boolean(categoriaSlug && produto.categoriaSlugs?.includes(categoriaSlug)) ||
        Boolean(
          categoriaNome &&
            (produto.categoria === categoriaNome ||
              produto.categoriaNomes?.includes(categoriaNome))
        )
      );
    });
  }

  if (fonte === "CATEGORIAS_SELECIONADAS") {
    const ids = categoriasIds.length > 0 ? categoriasIds : categoriasLegadas;

    if (
      ids.length === 0 &&
      categoriasSlugs.length === 0 &&
      categoriasNomes.length === 0
    ) {
      return [];
    }

    resultado = resultado.filter((produto) => {
      return (
        ids.some((id) => produto.categoriaIds?.includes(id)) ||
        categoriasSlugs.some((slug) => produto.categoriaSlugs?.includes(slug)) ||
        categoriasNomes.some(
          (nome) =>
            produto.categoria === nome || produto.categoriaNomes?.includes(nome)
        ) ||
        categoriasLegadas.includes(produto.categoria)
      );
    });
  }

  if (fonte === "MANUAL") {
    if (produtosIds.length === 0) return [];

    const ordem = new Map(produtosIds.map((id, index) => [id, index]));

    resultado = resultado
      .filter((produto) => ordem.has(produto.id))
      .sort(
        (a, b) => Number(ordem.get(a.id) ?? 0) - Number(ordem.get(b.id) ?? 0)
      );
  }

  return resultado.slice(0, Math.max(1, getNumber(config, "limite", 8)));
}

export default function ListaProdutosPublico({
  bloco,
  produtos = [],
}: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const produtosFiltrados = filtrarProdutos(produtos, config);
  const layoutMobile = getString(config, "layoutMobile", "GRID");
  const layoutDesktop = getString(config, "layoutDesktop", "GRID");
  const isCarousel = layoutMobile === "CARROSSEL" || layoutDesktop === "CARROSSEL";
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, [
    "subtituloRichText",
    "textoRichText",
  ]);
  const titulo = getString(config, "titulo");
  const subtitulo = getString(config, ["subtitulo", "descricao", "texto"]);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const textoBotao = getStringWithDefault(config, "textoBotao", "Comprar");

  if (!hasTitulo && !hasSubtitulo && produtosFiltrados.length === 0) {
    return null;
  }

  return (
    <section className={`${getBackgroundClass(corFundo)} ${getSpacingClass(getString(config, "espacamento", "PADRAO"))}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {hasTitulo ? (
            <PublicRichTextRenderer
              value={tituloRichText}
              fallback={titulo}
              className={`text-3xl font-light leading-tight md:text-5xl ${colors.title}`}
            />
          ) : null}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 text-base leading-7 ${colors.body}`}
            />
          ) : null}
        </div>

        {produtosFiltrados.length > 0 ? (
          <div
            className={
              isCarousel
                ? "mt-10 flex snap-x gap-5 overflow-x-auto pb-4"
                : `mt-10 grid gap-x-5 gap-y-10 ${getGridColumnsClass(
                    getNumber(config, "colunasMobile", 2),
                    getNumber(config, "colunasTablet", 3),
                    getNumber(config, "colunasDesktop", 4)
                  )}`
            }
          >
            {produtosFiltrados.map((produto) => (
              <div
                key={produto.id}
                className={isCarousel ? "w-[68vw] shrink-0 snap-start sm:w-64" : ""}
              >
                <ProdutoCardLoja
                  produto={produto}
                  exibirPreco={getBoolean(config, "exibirPreco", true)}
                  exibirBotao={getBoolean(config, "exibirBotao", true)}
                  exibirSeloDesconto={getBoolean(config, "exibirSeloDesconto", true)}
                  textoBotao={textoBotao}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
