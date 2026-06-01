import type { CSSProperties } from "react";

type PublicMediaRendererProps = {
  tipoMidia?: string;
  exibirMidia?: boolean;
  imagemDesktopUrl?: string | null;
  imagemMobileUrl?: string | null;
  videoDesktopUrl?: string | null;
  videoMobileUrl?: string | null;
  videoPosterUrl?: string | null;
  videoLoop?: boolean;
  videoMuted?: boolean;
  objectPositionDesktop?: string | null;
  objectPositionMobile?: string | null;
  alt?: string;
  className?: string;
  mediaClassName?: string;
  placeholder?: string;
};

const POSITIONS = new Set([
  "center center",
  "top center",
  "bottom center",
  "center left",
  "center right",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
]);

function normalizarPosition(value?: string | null) {
  const position = String(value || "").trim().toLowerCase();

  if (POSITIONS.has(position)) return position;

  return "center center";
}

function normalizarUrl(value?: string | null) {
  return String(value || "").trim();
}

export default function PublicMediaRenderer({
  tipoMidia = "IMAGEM",
  exibirMidia = true,
  imagemDesktopUrl,
  imagemMobileUrl,
  videoDesktopUrl,
  videoMobileUrl,
  videoPosterUrl,
  videoLoop = true,
  videoMuted = true,
  objectPositionDesktop,
  objectPositionMobile,
  alt = "",
  className = "",
  mediaClassName = "",
  placeholder = "Sem mídia",
}: PublicMediaRendererProps) {
  if (!exibirMidia) return null;

  const desktopPosition = normalizarPosition(objectPositionDesktop);
  const mobilePosition = normalizarPosition(objectPositionMobile);
  const imageDesktop = normalizarUrl(imagemDesktopUrl);
  const imageMobile = normalizarUrl(imagemMobileUrl);
  const videoDesktop = normalizarUrl(videoDesktopUrl);
  const videoMobile = normalizarUrl(videoMobileUrl);
  const poster = normalizarUrl(videoPosterUrl);
  const baseMediaClass = `h-full w-full object-cover ${mediaClassName}`;
  const desktopStyle: CSSProperties = { objectPosition: desktopPosition };
  const mobileStyle: CSSProperties = { objectPosition: mobilePosition };

  if (tipoMidia === "VIDEO" && (videoDesktop || videoMobile)) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {videoMobile ? (
          <video
            className={`${baseMediaClass} md:hidden`}
            src={videoMobile}
            poster={poster || undefined}
            autoPlay
            loop={videoLoop}
            muted={videoMuted}
            playsInline
            style={mobileStyle}
          />
        ) : null}

        <video
          className={`${baseMediaClass} ${videoMobile ? "hidden md:block" : ""}`}
          src={videoDesktop || videoMobile}
          poster={poster || undefined}
          autoPlay
          loop={videoLoop}
          muted={videoMuted}
          playsInline
          style={desktopStyle}
        />
      </div>
    );
  }

  if (imageDesktop || imageMobile) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {imageMobile ? (
          <img
            src={imageMobile}
            alt={alt}
            className={`${baseMediaClass} md:hidden`}
            style={mobileStyle}
          />
        ) : null}

        <img
          src={imageDesktop || imageMobile}
          alt={alt}
          className={`${baseMediaClass} ${imageMobile ? "hidden md:block" : ""}`}
          style={desktopStyle}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 ${className}`}
    >
      {placeholder}
    </div>
  );
}
