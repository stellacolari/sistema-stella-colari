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

  if (/^\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/.test(position)) {
    return position;
  }

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
  placeholder = "",
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
    const mobileVideoSrc = videoMobile || videoDesktop;
    const desktopVideoSrc = videoDesktop || videoMobile;
    const renderMobileVariant =
      Boolean(mobileVideoSrc) && (Boolean(videoMobile) || mobilePosition !== desktopPosition);

    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {renderMobileVariant ? (
          <video
            className={`${baseMediaClass} md:hidden`}
            src={mobileVideoSrc}
            poster={poster || undefined}
            autoPlay
            loop={videoLoop}
            muted={videoMuted}
            playsInline
            style={mobileStyle}
          />
        ) : null}

        <video
          className={`${baseMediaClass} ${renderMobileVariant ? "hidden md:block" : ""}`}
          src={desktopVideoSrc}
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
    const mobileImageSrc = imageMobile || imageDesktop;
    const desktopImageSrc = imageDesktop || imageMobile;
    const renderMobileVariant =
      Boolean(mobileImageSrc) && (Boolean(imageMobile) || mobilePosition !== desktopPosition);

    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {renderMobileVariant ? (
          <img
            src={mobileImageSrc}
            alt={alt}
            className={`${baseMediaClass} md:hidden`}
            style={mobileStyle}
          />
        ) : null}

        <img
          src={desktopImageSrc}
          alt={alt}
          className={`${baseMediaClass} ${renderMobileVariant ? "hidden md:block" : ""}`}
          style={desktopStyle}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#f8fafc_34%,var(--brand-blue-soft)_100%)] text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 ${className}`}
    >
      {placeholder || null}
    </div>
  );
}
