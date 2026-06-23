import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  Heart,
  Info,
  Search,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";
import {
  PERIODOS_FUNIL_LOJA,
  type BuscaFunilLoja,
  type ConfiabilidadeFunilLoja,
  type FunilAnalyticsLoja,
  type FunilLojaEtapa,
  type GargaloFunilLoja,
  type ProdutoFunilLoja,
} from "@/lib/analytics/funil-loja";

type Props = {
  dados: FunilAnalyticsLoja;
};

function inteiro(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

function percentual(value: number | null) {
  if (value === null) return "Sem base";

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function variacao(value: number | null) {
  if (value === null) return "Sem base anterior";
  if (value === 0) return "Estavel";

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${percentual(value)}`;
}

function dataCurta(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

function labelConfiabilidade(value: ConfiabilidadeFunilLoja) {
  if (value === "alta") return "Alta";
  if (value === "media") return "Media";
  if (value === "baixa") return "Baixa";
  return "Sem dados";
}

function confiabilidadeClasses(value: ConfiabilidadeFunilLoja) {
  if (value === "alta") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "media") return "border-sky-200 bg-sky-50 text-sky-800";
  if (value === "baixa") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function gargaloClasses(value: GargaloFunilLoja["gravidade"]) {
  if (value === "atencao") return "border-amber-200 bg-amber-50 text-amber-900";
  if (value === "dados") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function etapaIcone(id: FunilLojaEtapa["id"]): LucideIcon {
  if (id === "busca_realizada") return Search;
  if (id === "produto_visualizado") return Eye;
  if (id === "favorito") return Heart;
  if (id === "carrinho") return ShoppingCart;
  if (id === "checkout") return ArrowRight;
  if (id === "pedido_pago") return CheckCircle2;
  return Sparkles;
}

export default function FunilAnalyticsLoja({ dados }: Props) {
  const maiorEtapa = Math.max(...dados.etapas.map((etapa) => etapa.contagem), 1);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Loja online
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Funil da loja
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Entenda como visitantes avancam da busca ao pedido pago.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/compras/intencao"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" />
              Ver intencao
            </Link>
            {PERIODOS_FUNIL_LOJA.map((periodo) => (
              <Link
                key={periodo}
                href={`/compras/intencao/funil?dias=${periodo}`}
                className={`inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  periodo === dados.periodo.dias
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {periodo} dias
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          titulo="Eventos analisados"
          valor={inteiro(dados.resumo.eventosAnalisados)}
          detalhe={`${inteiro(dados.resumo.sessoes)} sessoes`}
        />
        <ResumoCard
          titulo="Pedidos pagos"
          valor={inteiro(dados.resumo.pedidosPagos)}
          detalhe={`${inteiro(dados.resumo.pedidosCriados)} pedidos criados`}
        />
        <ResumoCard
          titulo="Periodo"
          valor={`${dados.periodo.dias} dias`}
          detalhe={`${dataCurta(dados.periodo.inicio)} a ${dataCurta(dados.periodo.fim)}`}
        />
        <ConfiabilidadeCard confiabilidade={dados.resumo.confiabilidade} />
      </section>

      {dados.resumo.amostraPequena && (
        <section className="flex gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Amostra pequena</p>
            <p>Use como sinal, nao como verdade. Compare periodos antes de agir.</p>
          </div>
        </section>
      )}

      {dados.estadoVazio ? (
        <EstadoVazio />
      ) : (
        <>
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionTitle
              icon={BarChart3}
              title="Funil principal"
              description="Taxas aproximadas por contagem de eventos, nao por visitante unico."
            />
            <div className="mt-5 space-y-3">
              {dados.etapas.map((etapa) => (
                <EtapaFunil key={etapa.id} etapa={etapa} maiorEtapa={maiorEtapa} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <SectionTitle
                icon={Sparkles}
                title="Produtos com maior intencao"
                description="Sinais de visualizacao, favorito e carrinho sem expor custo, margem ou receita."
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <ListaProdutos
                  title="Mais vistos"
                  produtos={dados.produtos.maisVisualizados}
                  metrica="visualizacoes"
                  empty="Nenhum produto visualizado no periodo."
                />
                <ListaProdutos
                  title="Mais favoritados"
                  produtos={dados.produtos.maisFavoritados}
                  metrica="favoritos"
                  empty="Nenhum favorito registrado no periodo."
                />
                <ListaProdutos
                  title="Mais carrinho"
                  produtos={dados.produtos.maisCarrinho}
                  metrica="adicoesCarrinho"
                  empty="Nenhum produto foi adicionado ao carrinho."
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <SectionTitle
                icon={Info}
                title="Intencao sem venda"
                description="Produtos com desejo aparente, mas sem pedido pago no periodo."
              />
              <div className="mt-4 space-y-3">
                {dados.produtos.intencaoSemVenda.length > 0 ? (
                  dados.produtos.intencaoSemVenda.map((produto) => (
                    <ProdutoCompacto key={produto.produtoId} produto={produto} />
                  ))
                ) : (
                  <EmptyState text="Nenhum produto com intencao sem venda detectado." />
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ListaBuscas
              title="Termos mais buscados"
              buscas={dados.buscas.frequentes}
              empty="Nenhuma busca registrada no periodo."
            />
            <ListaBuscas
              title="Buscas sem resultado"
              buscas={dados.buscas.semResultado}
              empty="Nenhuma busca sem resultado no periodo."
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <SectionTitle
                icon={AlertTriangle}
                title="Gargalos"
                description="Leituras conservadoras para priorizar revisao manual."
              />
              <div className="mt-4 space-y-3">
                {dados.gargalos.map((gargalo) => (
                  <GargaloCard key={gargalo.titulo} gargalo={gargalo} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <SectionTitle
                icon={CheckCircle2}
                title="Acoes sugeridas"
                description="Sugestoes manuais; nada e executado automaticamente."
              />
              <div className="mt-4 space-y-3">
                {dados.acoesSugeridas.map((acao) => (
                  <div
                    key={acao}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-700"
                  >
                    {acao}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
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
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{valor}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{detalhe}</p>
    </div>
  );
}

function ConfiabilidadeCard({
  confiabilidade,
}: {
  confiabilidade: ConfiabilidadeFunilLoja;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">Confiabilidade</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {labelConfiabilidade(confiabilidade)}
      </p>
      <span
        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${confiabilidadeClasses(
          confiabilidade
        )}`}
      >
        {confiabilidade === "sem_dados" ? "Aguardando eventos" : "Leitura conservadora"}
      </span>
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
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function EtapaFunil({
  etapa,
  maiorEtapa,
}: {
  etapa: FunilLojaEtapa;
  maiorEtapa: number;
}) {
  const Icon = etapaIcone(etapa.id);
  const largura = Math.max(6, Math.round((etapa.contagem / maiorEtapa) * 100));

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-950">{etapa.nome}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">{etapa.descricao}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
            {inteiro(etapa.contagem)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${confiabilidadeClasses(
              etapa.confiabilidade
            )}`}
          >
            {labelConfiabilidade(etapa.confiabilidade)}
          </span>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${largura}%` }} />
      </div>

      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
        <span>Para proxima: {percentual(etapa.taxaProxima)}</span>
        <span>Vs anterior: {variacao(etapa.variacaoPercentual)}</span>
        <span className="sm:text-right">{etapa.observacao}</span>
      </div>
    </article>
  );
}

function ListaProdutos({
  title,
  produtos,
  metrica,
  empty,
}: {
  title: string;
  produtos: ProdutoFunilLoja[];
  metrica: "visualizacoes" | "favoritos" | "adicoesCarrinho";
  empty: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      {produtos.length > 0 ? (
        produtos.map((produto) => (
          <ProdutoLinha
            key={`${title}-${produto.produtoId}`}
            produto={produto}
            valor={produto[metrica]}
          />
        ))
      ) : (
        <EmptyState text={empty} />
      )}
    </div>
  );
}

function ProdutoLinha({
  produto,
  valor,
}: {
  produto: ProdutoFunilLoja;
  valor: number;
}) {
  return (
    <Link
      href={`/loja/produto/${produto.produtoId}`}
      className="grid gap-3 rounded-2xl border border-slate-200 p-3 transition hover:bg-slate-50 sm:grid-cols-[64px_minmax(0,1fr)]"
    >
      <ImageBox src={produto.imagemUrl} alt={produto.nome} />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-slate-950">{produto.nome}</p>
        <p className="mt-1 text-xs text-slate-500">{produto.categoria}</p>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          {inteiro(valor)} sinais - score {inteiro(produto.scoreInteresse)}
        </p>
      </div>
    </Link>
  );
}

function ProdutoCompacto({ produto }: { produto: ProdutoFunilLoja }) {
  return (
    <Link
      href={`/loja/produto/${produto.produtoId}`}
      className="grid gap-3 rounded-2xl border border-slate-200 p-3 transition hover:bg-slate-50 sm:grid-cols-[58px_minmax(0,1fr)]"
    >
      <ImageBox src={produto.imagemUrl} alt={produto.nome} />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-slate-950">{produto.nome}</p>
        <p className="mt-1 text-xs text-slate-500">{produto.diagnostico}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
          <span>{inteiro(produto.visualizacoes)} views</span>
          <span>{inteiro(produto.favoritos)} fav.</span>
          <span>{inteiro(produto.adicoesCarrinho)} carrinho</span>
        </div>
      </div>
    </Link>
  );
}

function ListaBuscas({
  title,
  buscas,
  empty,
}: {
  title: string;
  buscas: BuscaFunilLoja[];
  empty: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <SectionTitle icon={Search} title={title} description="Termos registrados na busca da loja." />
      <div className="mt-4 space-y-3">
        {buscas.length > 0 ? (
          buscas.map((busca) => (
            <Link
              key={`${title}-${busca.termo}`}
              href={`/loja/busca?q=${encodeURIComponent(busca.termo)}`}
              className="block rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {busca.termo}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {busca.oportunidade}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {inteiro(busca.quantidade)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {busca.acaoSugerida}
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

function GargaloCard({ gargalo }: { gargalo: GargaloFunilLoja }) {
  return (
    <article
      className={`rounded-2xl border px-4 py-3 ${gargaloClasses(gargalo.gravidade)}`}
    >
      <p className="text-sm font-bold">{gargalo.titulo}</p>
      <p className="mt-1 text-sm leading-5">{gargalo.descricao}</p>
      <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold leading-5">
        {gargalo.acaoSugerida}
      </p>
    </article>
  );
}

function EstadoVazio() {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <SectionTitle
        icon={Info}
        title="Ainda sem dados suficientes"
        description="Os eventos aparecem aqui conforme clientes buscam, visualizam produtos, favoritam, usam carrinho, iniciam checkout e criam pedidos."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <EmptyState text="Acompanhar a coleta por alguns dias antes de concluir abandono." />
        <EmptyState text="Validar manualmente se busca, favoritos, carrinho e checkout continuam registrando eventos." />
        <EmptyState text="Evitar campanha, reposicao ou recomendacao automatica ate haver amostra maior." />
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium leading-6 text-slate-500">
      {text}
    </div>
  );
}
