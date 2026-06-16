import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Heart,
  MousePointerClick,
  Search,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  montarIntencaoComercial,
  type IntencaoBusca,
  type IntencaoConteudo,
  type IntencaoProduto,
} from "@/lib/loja/intencao-comercial";
import ImageBox from "@/components/ui/ImageBox";

export const metadata: Metadata = {
  title: "Intencao Comercial | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    dias?: string;
  }>;
};

function numero(value: string | undefined, fallback: number) {
  const result = Number(value);

  return Number.isFinite(result) ? result : fallback;
}

function inteiro(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function moeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function dataCurta(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

export default async function IntencaoComercialPage({ searchParams }: PageProps) {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const params = await searchParams;
  const dias = Math.min(Math.max(Math.round(numero(params.dias, 30)), 7), 120);
  const dados = await montarIntencaoComercial({ dias });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Loja online
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Intencao Comercial
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Sinais anonimos de interesse na loja: visualizacoes, favoritos,
              carrinho, busca, cliques editoriais e inicio de checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 30, 60, 120].map((item) => (
              <Link
                key={item}
                href={`/compras/intencao?dias=${item}`}
                className={`inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  item === dias
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item} dias
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          titulo="Eventos"
          valor={inteiro(dados.resumo.eventos)}
          detalhe={`${inteiro(dados.resumo.sessoes)} sessao(oes)`}
        />
        <ResumoCard
          titulo="Produtos vistos"
          valor={inteiro(dados.resumo.visualizacoesProduto)}
          detalhe={`${inteiro(dados.resumo.favoritos)} favoritos`}
        />
        <ResumoCard
          titulo="Carrinho"
          valor={inteiro(dados.resumo.adicoesCarrinho)}
          detalhe={`${inteiro(dados.resumo.remocoesCarrinho)} remocao(oes)`}
        />
        <ResumoCard
          titulo="Checkout iniciado"
          valor={inteiro(dados.resumo.checkoutsIniciados)}
          detalhe={`${dataCurta(dados.periodo.inicio)} a ${dataCurta(dados.periodo.fim)}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <SectionTitle
            icon={Sparkles}
            title="Produtos com maior intencao"
            description="Score por visualizacao, clique de busca, favorito e carrinho."
          />

          <div className="mt-5 space-y-3">
            {dados.produtos.length > 0 ? (
              dados.produtos.slice(0, 10).map((produto) => (
                <ProdutoLinha key={produto.produtoId} produto={produto} />
              ))
            ) : (
              <EmptyState text="Ainda nao ha sinais de produto no periodo." />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ListaProdutos
            title="Promissores"
            produtos={dados.produtosPromissores}
            empty="Nenhum produto promissor no periodo."
          />
          <ListaProdutos
            title="Interesse travado"
            produtos={dados.produtosTravados}
            empty="Nenhum gargalo forte de produto no periodo."
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListaBusca
          title="Buscas frequentes"
          icon={Search}
          items={dados.buscasFrequentes}
          empty="Nenhuma busca registrada."
        />
        <ListaBusca
          title="Sem resultado"
          icon={Search}
          items={dados.buscasSemResultado}
          empty="Nenhuma busca sem resultado."
        />
        <ListaConteudos items={dados.conteudosClicados} />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <SectionTitle
          icon={MousePointerClick}
          title="Categorias clicadas"
          description="Cliques vindos do menu publico."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dados.categoriasClicadas.length > 0 ? (
            dados.categoriasClicadas.map((categoria) => (
              <Link
                key={categoria.categoriaId}
                href={`/loja/categoria/${categoria.slug}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span>{categoria.nome}</span>
                <span className="text-slate-400">{inteiro(categoria.cliques)}</span>
              </Link>
            ))
          ) : (
            <EmptyState text="Nenhuma categoria clicada no periodo." />
          )}
        </div>
      </section>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {valor}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-400">{detalhe}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function ProdutoLinha({ produto }: { produto: IntencaoProduto }) {
  return (
    <article className="grid gap-4 rounded-3xl border border-slate-200 p-3 sm:grid-cols-[84px_minmax(0,1fr)]">
      <ImageBox src={produto.imagemUrl} alt={produto.nome} />
      <div className="min-w-0">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {produto.codigoInterno} - {produto.categoria}
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">
              {produto.nome}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {produto.diagnostico}
            </p>
          </div>
          <div className="text-sm font-bold text-slate-950">
            Score {inteiro(produto.score)}
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-4">
          <MiniMetric icon={Heart} label="Fav." value={inteiro(produto.favoritos)} />
          <MiniMetric
            icon={ShoppingCart}
            label="Carrinho"
            value={inteiro(produto.adicoesCarrinho)}
          />
          <MiniMetric label="Views" value={inteiro(produto.visualizacoes)} />
          <MiniMetric label="Vendas" value={inteiro(produto.vendasQuantidade)} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
          <span>{produto.taxaFavorito}% favoritou</span>
          <span>{produto.taxaCarrinho}% carrinho</span>
          <span>{produto.taxaConversao}% conversao</span>
          <span>{moeda(produto.receita)} em vendas</span>
        </div>
      </div>
    </article>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
      {Icon ? <Icon className="h-3.5 w-3.5 text-slate-400" /> : null}
      <span>{label}</span>
      <span className="ml-auto text-slate-950">{value}</span>
    </div>
  );
}

function ListaProdutos({
  title,
  produtos,
  empty,
}: {
  title: string;
  produtos: IntencaoProduto[];
  empty: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {produtos.length > 0 ? (
          produtos.map((produto) => (
            <Link
              key={produto.produtoId}
              href={`/produtos/${produto.produtoId}`}
              className="block rounded-2xl border border-slate-200 p-3 transition hover:bg-slate-50"
            >
              <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                {produto.nome}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Score {inteiro(produto.score)} - {produto.diagnostico}
              </p>
            </Link>
          ))
        ) : (
          <EmptyState text={empty} />
        )}
      </div>
    </div>
  );
}

function ListaBusca({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  items: IntencaoBusca[];
  empty: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <SectionTitle icon={icon} title={title} description="Termos da busca da loja." />
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.termo}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-slate-800">{item.termo}</span>
              <span className="text-slate-400">{inteiro(item.quantidade)}</span>
            </div>
          ))
        ) : (
          <EmptyState text={empty} />
        )}
      </div>
    </div>
  );
}

function ListaConteudos({ items }: { items: IntencaoConteudo[] }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <SectionTitle
        icon={MousePointerClick}
        title="Conteudo clicado"
        description="Banners e vitrines editoriais."
      />
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.chave}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.tipo === "BANNER_CTA_CLICADO" ? "Banner" : "Vitrine"}
                  </p>
                </div>
                <span className="text-slate-400">{inteiro(item.quantidade)}</span>
              </div>
              {item.href ? (
                <p className="mt-2 truncate text-xs text-slate-400">{item.href}</p>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState text="Nenhum clique editorial no periodo." />
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}
