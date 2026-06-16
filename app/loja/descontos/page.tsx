import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaClient, {
  type LojaBannerItem,
  type LojaMenuItem,
} from "@/components/loja/LojaClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Descontos | Stella Colari",
  description: "Produtos Stella Colari com descontos ativos para comprar online.",
  path: "/loja/descontos",
});

export const dynamic = "force-dynamic";

function produtoTemDesconto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

export default async function LojaDescontosPage() {
  const [
    produtosPublicos,
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
    bannersRaw,
  ] = await Promise.all([
      buscarProdutosPublicos(),
      buscarMenusPublicos(),
      buscarCategoriasMenuPublico(),
      buscarConfiguracaoMenuRodape(),

      prisma.bannerLoja.findMany({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
        take: 1,
      }),
    ]);

  const produtos = produtosPublicos.filter(produtoTemDesconto);

  const banners: LojaBannerItem[] = bannersRaw.map((banner, index) => {
    const bannerComMobile = banner as typeof banner & {
      imagemMobileUrl?: string | null;
    };

    return {
      id: banner.id,
      titulo: banner.titulo,
      subtitulo: banner.subtitulo,
      imagemUrl: banner.imagemUrl,
      imagemMobileUrl: bannerComMobile.imagemMobileUrl ?? null,
      linkUrl: banner.linkUrl,
      ordem: banner.ordem ?? index,
      ativo: banner.ativo ?? true,
    };
  });

  const menus: LojaMenuItem[] = menusPublicos.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    slug: "",
    tipo: "LINK",
    href: menu.href,
    categoria: null,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  return (
    <LojaClient
      produtos={produtos}
      banners={banners}
      menus={menus}
      categoriasHome={[]}
      secoesHome={[
        {
          id: "descontos",
          titulo: "Descontos",
          categorias: Array.from(
            new Set(produtos.map((produto) => produto.categoria))
          ),
        },
      ]}
      blocoHome={null}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
      mostrarTodosProdutos={false}
      tituloVazio="Nenhum produto com desconto no momento."
      textoVazio="Ative desconto direto no cadastro de produto para que ele apareça aqui."
    />
  );
}
