import BannerPublico from "@/components/loja/paginas/blocos/BannerPublico";
import ColecoesCategoriasPublico from "@/components/loja/paginas/blocos/ColecoesCategoriasPublico";
import CtaPublico from "@/components/loja/paginas/blocos/CtaPublico";
import CtaSimplesPublico from "@/components/loja/paginas/blocos/CtaSimplesPublico";
import DestaquesCardsPublico from "@/components/loja/paginas/blocos/DestaquesCardsPublico";
import ListaProdutosPublico from "@/components/loja/paginas/blocos/ListaProdutosPublico";
import TextoImagemPublico from "@/components/loja/paginas/blocos/TextoImagemPublico";
import {
  isBlocoVisualPublico,
  type BlocoPublico,
  type ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

export { isBlocoVisualPublico };

export default function BlocoPublicoRenderer({
  bloco,
  produtos = [],
  listaCompletaProdutos = false,
}: {
  bloco: BlocoPublico;
  produtos?: ProdutoPublico[];
  listaCompletaProdutos?: boolean;
}) {
  if (bloco.tipo === "BANNER" || bloco.tipo === "HERO") {
    return <BannerPublico bloco={bloco} produtos={produtos} />;
  }

  if (bloco.tipo === "TEXTO_IMAGEM" || bloco.tipo === "IMAGEM_TEXTO") {
    return <TextoImagemPublico bloco={bloco} produtos={produtos} />;
  }

  if (bloco.tipo === "DESTAQUES_CARDS") {
    return <DestaquesCardsPublico bloco={bloco} produtos={produtos} />;
  }

  if (bloco.tipo === "COLECOES_CATEGORIAS" || bloco.tipo === "MOSAICO_COLECOES") {
    return <ColecoesCategoriasPublico bloco={bloco} produtos={produtos} />;
  }

  if (bloco.tipo === "LISTA_PRODUTOS") {
    return (
      <ListaProdutosPublico
        bloco={bloco}
        produtos={produtos}
        listaCompletaProdutos={listaCompletaProdutos}
      />
    );
  }

  if (bloco.tipo === "CTA") {
    return <CtaPublico bloco={bloco} produtos={produtos} />;
  }

  if (bloco.tipo === "CTA_SIMPLES") {
    return <CtaSimplesPublico bloco={bloco} produtos={produtos} />;
  }

  if (isBlocoVisualPublico(bloco.tipo)) return null;

  return null;
}
