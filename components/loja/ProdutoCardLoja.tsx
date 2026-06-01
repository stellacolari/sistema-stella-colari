import Link from "next/link";

export type ProdutoCardLojaItem = {
  id: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
};

type ProdutoCardLojaProps = {
  produto: ProdutoCardLojaItem;
  exibirPreco?: boolean;
  exibirBotao?: boolean;
  exibirSeloDesconto?: boolean;
  textoBotao?: string;
  href?: string;
  modoPreview?: boolean;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function produtoTemDesconto(produto: ProdutoCardLojaItem) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function percentualDesconto(produto: ProdutoCardLojaItem) {
  if (!produtoTemDesconto(produto) || produto.precoPromocional === null) {
    return null;
  }

  return Math.round(
    ((produto.precoVenda - produto.precoPromocional) / produto.precoVenda) * 100
  );
}

function ProdutoPreco({ produto }: { produto: ProdutoCardLojaItem }) {
  const temDesconto = produtoTemDesconto(produto);

  if (!temDesconto || produto.precoPromocional === null) {
    return (
      <p className="mt-2 text-sm font-medium tracking-wide text-slate-700">
        {moeda(produto.precoVenda)}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-xs font-normal tracking-wide text-slate-400 line-through">
        {moeda(produto.precoVenda)}
      </span>

      <span className="text-sm font-semibold tracking-wide brand-text">
        {moeda(produto.precoPromocional)}
      </span>
    </div>
  );
}

function ProdutoImagem({ produto }: { produto: ProdutoCardLojaItem }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
      {produto.imagemUrl ? (
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-xs font-medium text-slate-400">
          Sem imagem
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-black/5" />
    </div>
  );
}

export default function ProdutoCardLoja({
  produto,
  exibirPreco = true,
  exibirBotao = false,
  exibirSeloDesconto = true,
  textoBotao = "Comprar",
  href,
  modoPreview = false,
}: ProdutoCardLojaProps) {
  const semEstoque = produto.estoqueTotal <= 0;
  const desconto = percentualDesconto(produto);
  const hasHover = Boolean(produto.imagemHoverUrl);
  const produtoHref = href || `/loja/produto/${produto.id}`;
  const cardClass = `group relative block h-full overflow-hidden bg-white p-2 transition-colors duration-200 hover:bg-slate-50 active:bg-slate-50 ${
    semEstoque ? "opacity-75" : ""
  }`;
  const conteudo = (
    <>
      <div className="relative overflow-hidden">
        <ProdutoImagem produto={produto} />

        {exibirSeloDesconto && desconto !== null ? (
          <div className="absolute right-3 top-3 z-10 brand-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]">
            -{desconto}%
          </div>
        ) : null}

        {semEstoque ? (
          <div className="absolute left-3 top-3 z-10 bg-white/95 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-700">
            Sem estoque
          </div>
        ) : null}
      </div>

      <div className="relative z-10 flex min-h-[88px] flex-col bg-white px-1 pb-1 pt-3 transition-colors duration-200 group-hover:bg-transparent group-active:bg-transparent">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-slate-900 transition-colors duration-200 group-hover:text-[var(--brand-blue)]">
          {produto.nome}
        </h3>

        {exibirPreco ? (
          <div className="mt-auto">
            <ProdutoPreco produto={produto} />
          </div>
        ) : null}

        {exibirBotao && textoBotao ? (
          <span className="mt-3 inline-flex min-h-9 w-full items-center justify-center border border-slate-950 bg-slate-950 px-4 text-xs font-semibold text-white transition group-hover:bg-white group-hover:text-slate-950">
            {textoBotao}
          </span>
        ) : null}
      </div>

      {hasHover && produto.imagemHoverUrl ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100">
          <img
            src={produto.imagemHoverUrl}
            alt={produto.nome}
            className="h-full w-full object-cover object-center"
          />

          <div className="pointer-events-none absolute inset-0 bg-black/5" />
        </div>
      ) : null}
    </>
  );

  if (modoPreview) {
    return <div className={cardClass}>{conteudo}</div>;
  }

  return (
    <Link href={produtoHref} className={cardClass}>
      {conteudo}
    </Link>
  );
}
