import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBoolean,
  getButtonRadiusClass,
  getButtonHref,
  getResponsiveTextAlignClass,
  getStringWithDefault,
  getImageDesktop,
  getImageMobile,
  hasTextContent,
  getMediaPosition,
  getRichText,
  getSpacingClass,
  getString,
  getArray,
  moeda,
  produtoTemDesconto,
  type BlocoPublicoProps,
  type ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

function getHeightClass(altura: string, modelo: string) {
  if (altura === "COMPACTA") return "min-h-[360px] md:min-h-[420px]";
  if (altura === "TELA_CHEIA") return "min-h-[calc(100vh-80px)]";
  if (modelo === "HERO_TELA_CHEIA") return "min-h-[calc(100vh-80px)]";
  if (modelo === "FAIXA_PROMOCIONAL") return "min-h-[260px] md:min-h-[320px]";
  if (modelo === "CATEGORIA") return "min-h-[360px] md:min-h-[520px]";

  return "min-h-[460px] md:min-h-[580px]";
}

function getContentAlignClass(alinhamento: string) {
  if (alinhamento === "CENTRO") {
    return "items-center text-center";
  }

  if (alinhamento === "DIREITA") {
    return "items-end text-right";
  }

  return "items-start text-left";
}

function getOverlayClass(overlay: string) {
  if (overlay === "NENHUM") return "bg-transparent";
  if (overlay === "MEDIO") return "bg-slate-950/50";
  if (overlay === "GRADIENTE") {
    return "bg-gradient-to-r from-slate-950/70 via-slate-950/35 to-transparent";
  }

  return "bg-slate-950/28";
}

function getTextClass(corTexto: string) {
  if (corTexto === "ESCURO") {
    return {
      title: "text-slate-950",
      body: "text-slate-700",
      primary: "bg-slate-950 text-white hover:bg-slate-800",
      secondary:
        "border-slate-950/25 text-slate-950 hover:border-slate-950 hover:bg-white/50",
    };
  }

  return {
    title: "text-white",
    body: "text-white/86",
    primary: "bg-white text-slate-950 hover:bg-white/90",
    secondary:
      "border-white/55 text-white hover:border-white hover:bg-white/10",
  };
}

function BannerProdutoFlutuante({ produto }: { produto: ProdutoPublico }) {
  const precoFinal =
    produtoTemDesconto(produto) && produto.precoPromocional
      ? produto.precoPromocional
      : produto.precoVenda;

  return (
    <Link
      href={`/loja/produto/${produto.id}`}
      className="group block overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
    >
      <div className="aspect-[3/4] bg-slate-100">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-950">
          {produto.nome}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {moeda(precoFinal)}
        </p>
      </div>
    </Link>
  );
}

export default function BannerPublico({ bloco, produtos = [] }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const titulo = getString(config, ["titulo", "nome"]);
  const subtitulo = getString(config, ["subtitulo", "texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, ["subtituloRichText", "textoRichText"]);
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const exibirTexto = getBoolean(config, "exibirTexto", true);
  const exibirSubtitulo = getBoolean(config, "exibirSubtitulo", true);
  const exibirBotaoPrimario = getBoolean(config, "exibirBotaoPrimario", true);
  const exibirBotaoSecundario = getBoolean(config, "exibirBotaoSecundario", false);
  const textoBotao = getStringWithDefault(config, ["textoBotao", "botaoTexto"], "Conhecer");
  const linkBotao = getButtonHref(config, ["linkBotao", "botaoLink", "linkUrl"]);
  const textoBotaoSecundario = getStringWithDefault(config, [
    "textoBotaoSecundario",
    "botaoSecundarioTexto",
  ]);
  const linkBotaoSecundario = getButtonHref(config, [
    "linkBotaoSecundario",
    "botaoSecundarioLink",
  ]);
  const modelo = getString(config, "modeloBanner", "BANNER_EDITORIAL");
  const altura = getString(config, "alturaBanner", "PADRAO");
  const largura = getString(config, "larguraBanner", "FULL_BLEED");
  const alinhamento = getString(config, "alinhamentoConteudo", "ESQUERDA");
  const alinhamentoTextoDesktop = getString(
    config,
    "alinhamentoTextoDesktop",
    alinhamento
  );
  const alinhamentoTextoMobile = getString(
    config,
    "alinhamentoTextoMobile",
    alinhamentoTextoDesktop
  );
  const textAlignClass = getResponsiveTextAlignClass({
    desktop: alinhamentoTextoDesktop,
    mobile: alinhamentoTextoMobile,
    fallback: alinhamento,
  });
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "PILULA")
  );
  const overlay = getString(config, "overlayBanner", "LEVE");
  const corTexto = getString(config, "corTextoBanner", "CLARO");
  const textClass = getTextClass(corTexto);
  const produtosFlutuantesAtivos = getBoolean(
    config,
    "produtosFlutuantesAtivos",
    modelo === "PRODUTOS_FLUTUANTES"
  );
  const produtosIds = getArray(config, "produtosIds").map(String);
  const produtosFlutuantes = produtosIds.length
    ? produtos
        .filter((produto) => produtosIds.includes(produto.id))
        .sort((a, b) => produtosIds.indexOf(a.id) - produtosIds.indexOf(b.id))
        .slice(0, 3)
    : [];
  const imageDesktop = getImageDesktop(config);
  const imageMobile = getImageMobile(config);
  const videoDesktop = getString(config, "videoDesktopUrl");
  const videoMobile = getString(config, "videoMobileUrl");
  const hasMedia =
    getBoolean(config, "exibirMidia", true) &&
    Boolean(imageDesktop || imageMobile || videoDesktop || videoMobile);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const hasBotaoPrimario = exibirBotaoPrimario && textoBotao && linkBotao;
  const hasBotaoSecundario =
    exibirBotaoSecundario && textoBotaoSecundario && linkBotaoSecundario;
  const hasConteudo =
    exibirTexto && (hasTitulo || (exibirSubtitulo && hasSubtitulo) || hasBotaoPrimario || hasBotaoSecundario);

  if (!hasMedia && !hasConteudo) {
    return null;
  }

  const wrapperClass =
    largura === "CONTIDA" ? "mx-auto max-w-7xl px-4 py-6 md:px-8" : "";
  const innerClass = `relative overflow-hidden bg-slate-950 ${getHeightClass(
    altura,
    modelo
  )}`;
  const contentAlignForModel =
    modelo === "FAIXA_PROMOCIONAL" ? "CENTRO" : alinhamento;
  const contentNode = hasConteudo ? (
    <div className={`relative z-10 mx-auto flex min-h-[inherit] max-w-7xl ${getSpacingClass(config)}`}>
      <div
        className={`flex w-full flex-col justify-center ${getContentAlignClass(
          contentAlignForModel
        )}`}
      >
        <div
          className={`${
            modelo === "FAIXA_PROMOCIONAL" ? "max-w-4xl" : "max-w-3xl"
          } ${textAlignClass}`}
        >
          {hasTitulo ? (
            <PublicRichTextRenderer
              value={tituloRichText}
              fallback={titulo}
              className={`font-light leading-[1.05] tracking-normal ${
                modelo === "HERO_TELA_CHEIA"
                  ? "text-5xl md:text-7xl"
                  : modelo === "FAIXA_PROMOCIONAL"
                    ? "text-3xl md:text-5xl"
                    : "text-4xl md:text-6xl"
              } ${textClass.title}`}
              paragraphClassName="mb-0"
            />
          ) : null}

          {exibirSubtitulo && hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-5 text-base leading-7 md:text-lg ${textClass.body}`}
              paragraphClassName="mb-0"
            />
          ) : null}

          {hasBotaoPrimario || hasBotaoSecundario ? (
            <div
              className={`mt-8 flex flex-wrap gap-3 ${
                contentAlignForModel === "CENTRO"
                  ? "justify-center"
                  : contentAlignForModel === "DIREITA"
                    ? "justify-end"
                    : "justify-start"
              }`}
            >
              {hasBotaoPrimario ? (
                <Link
                  href={linkBotao}
                  className={`inline-flex min-h-11 items-center justify-center px-6 text-sm font-semibold transition ${buttonRadiusClass} ${textClass.primary}`}
                >
                  {textoBotao}
                </Link>
              ) : null}

              {hasBotaoSecundario ? (
                <Link
                  href={linkBotaoSecundario}
                  className={`inline-flex min-h-11 items-center justify-center border px-6 text-sm font-semibold transition ${buttonRadiusClass} ${textClass.secondary}`}
                >
                  {textoBotaoSecundario}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  if (modelo === "IMAGEM_LATERAL") {
    return (
      <section className={wrapperClass}>
        <div className={innerClass}>
          <div className="absolute inset-0 md:left-[42%]">
            <PublicMediaRenderer
              tipoMidia={tipoMidia}
              exibirMidia={hasMedia}
              imagemDesktopUrl={imageDesktop}
              imagemMobileUrl={imageMobile}
              videoDesktopUrl={videoDesktop}
              videoMobileUrl={videoMobile}
              videoPosterUrl={getString(config, "videoPosterUrl")}
              videoLoop={getBoolean(config, "videoLoop", true)}
              videoMuted={getString(config, "videoSom", "MUDO") !== "COM_SOM"}
              objectPositionDesktop={getMediaPosition(config, "Desktop")}
              objectPositionMobile={getMediaPosition(config, "Mobile")}
              alt={titulo}
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/10" />
          {contentNode}
        </div>
      </section>
    );
  }

  return (
    <section className={wrapperClass}>
      <div className={innerClass}>
        <div className="absolute inset-0">
          <PublicMediaRenderer
            tipoMidia={tipoMidia}
            exibirMidia={hasMedia}
            imagemDesktopUrl={imageDesktop}
            imagemMobileUrl={imageMobile}
            videoDesktopUrl={videoDesktop}
            videoMobileUrl={videoMobile}
            videoPosterUrl={getString(config, "videoPosterUrl")}
            videoLoop={getBoolean(config, "videoLoop", true)}
            videoMuted={getString(config, "videoSom", "MUDO") !== "COM_SOM"}
            objectPositionDesktop={getMediaPosition(config, "Desktop")}
            objectPositionMobile={getMediaPosition(config, "Mobile")}
            alt={titulo}
          />
        </div>

        <div className={`absolute inset-0 ${getOverlayClass(overlay)}`} />

        {contentNode}

        {modelo === "PRODUTOS_FLUTUANTES" &&
        produtosFlutuantesAtivos &&
        produtosFlutuantes.length > 0 ? (
          <div className="pointer-events-none absolute bottom-6 right-4 z-20 hidden w-[44%] max-w-xl grid-cols-3 gap-3 md:grid lg:right-8">
            {produtosFlutuantes.map((produto, index) => (
              <div
                key={produto.id}
                className={`pointer-events-auto ${
                  index === 1 ? "translate-y-10" : ""
                }`}
              >
                <BannerProdutoFlutuante produto={produto} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
