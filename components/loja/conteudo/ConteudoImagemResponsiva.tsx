import type {
  ConteudoCrop,
  ConteudoImagemPublica,
} from "@/lib/loja/conteudo/contracts";
import { calcularEstiloCropPercentual } from "@/lib/loja/conteudo/crop";

function MediaFrame({
  url,
  alt,
  crop,
  className,
  eager,
}: {
  url: string;
  alt: string;
  crop: ConteudoCrop;
  className: string;
  eager: boolean;
}) {
  return (
    <span className={`absolute inset-0 overflow-hidden ${className}`}>
      <img
        src={url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        draggable={false}
        style={calcularEstiloCropPercentual(crop)}
      />
    </span>
  );
}

export default function ConteudoImagemResponsiva({
  media,
  className = "",
  eager = false,
}: {
  media: ConteudoImagemPublica;
  className?: string;
  eager?: boolean;
}) {
  const desktopUrl = media.desktopUrl;
  const mobileUrl = media.mobileUrl || desktopUrl;
  if (!desktopUrl && !mobileUrl) return null;

  return (
    <span className={`relative block overflow-hidden bg-[#eef3f8] ${className}`}>
      {desktopUrl ? (
        <MediaFrame
          url={desktopUrl}
          alt={media.alt}
          crop={media.desktop}
          className="hidden md:block"
          eager={eager}
        />
      ) : null}
      {mobileUrl ? (
        <MediaFrame
          url={mobileUrl}
          alt={media.alt}
          crop={media.mobile}
          className="block md:hidden"
          eager={eager}
        />
      ) : null}
    </span>
  );
}
