import BannerRenderer from "@/components/loja/paginas/blocos/BannerRenderer";
import type { BlocoPublicoProps } from "@/components/loja/paginas/blocos/utils";

export default function BannerPublico({ bloco, produtos = [] }: BlocoPublicoProps) {
  return <BannerRenderer bloco={bloco} produtos={produtos} />;
}
