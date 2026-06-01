import type { CSSProperties, ReactNode } from "react";

export type PublicRichTextValue = {
  type?: string;
  content?: PublicRichTextNode[];
};

type PublicRichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown> | null;
  marks?: PublicRichTextMark[];
  content?: PublicRichTextNode[];
};

type PublicRichTextMark = {
  type?: string;
  attrs?: Record<string, unknown> | null;
};

type PublicRichTextRendererProps = {
  value?: unknown;
  fallback?: string | null;
  className?: string;
  style?: CSSProperties;
  paragraphClassName?: string;
};

const FONT_FAMILY_PRESETS: Record<string, string> = {
  PADRAO: "inherit",
  SERIF_ELEGANTE: "Georgia, 'Times New Roman', serif",
  SANS_CLEAN: "Inter, Arial, sans-serif",
  DISPLAY_LUXO: "'Playfair Display', Georgia, serif",
  ASSINATURA: "'Brush Script MT', 'Segoe Script', cursive",
};

const FONT_SIZE_PRESETS: Record<string, string> = {
  PP: "0.75rem",
  P: "0.875rem",
  M: "1rem",
  G: "1.25rem",
  GG: "1.5rem",
  XG: "2rem",
  PEQUENO: "0.875rem",
  MEDIO: "1rem",
  GRANDE: "1.5rem",
  EXTRA_GRANDE: "2rem",
};

const FONT_WEIGHT_PRESETS: Record<string, number> = {
  LIGHT: 300,
  REGULAR: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
};

const LETTER_SPACING_PRESETS: Record<string, string> = {
  NORMAL: "0",
  LEVE: "0.02em",
  MEDIO: "0.06em",
  ALTO: "0.1em",
};

const COLOR_PRESETS: Record<string, string> = {
  PADRAO: "inherit",
  PRETO: "#0f172a",
  BRANCO: "#ffffff",
  CINZA: "#64748b",
  CLARO: "#ffffff",
  ESCURO: "#0f172a",
  DOURADO: "#b8893a",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRichTextValue(value: unknown): value is PublicRichTextValue {
  return isRecord(value) && value.type === "doc" && Array.isArray(value.content);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeCssValue(value: unknown, allowedPattern: RegExp) {
  const cssValue = getString(value).trim();

  if (!cssValue || cssValue.length > 80) return "";
  if (!allowedPattern.test(cssValue)) return "";

  return cssValue;
}

function resolveColor(value: unknown) {
  const color = getString(value).trim();

  if (COLOR_PRESETS[color]) return COLOR_PRESETS[color];

  return sanitizeCssValue(
    color,
    /^(#[0-9a-fA-F]{3,8}|rgb(a)?\([0-9\s,%.]+\)|hsl(a)?\([0-9\s,%.deg]+\)|[a-zA-Z]+)$/
  );
}

function resolveFontFamily(value: unknown) {
  const fontFamily = getString(value).trim();

  if (FONT_FAMILY_PRESETS[fontFamily]) return FONT_FAMILY_PRESETS[fontFamily];

  return sanitizeCssValue(fontFamily, /^[a-zA-Z0-9\s'",-]+$/);
}

function resolveFontSize(value: unknown) {
  const fontSize = getString(value).trim();

  if (FONT_SIZE_PRESETS[fontSize]) return FONT_SIZE_PRESETS[fontSize];

  return sanitizeCssValue(fontSize, /^(\d{1,2}(\.\d{1,2})?(rem|em|px|%)|inherit)$/);
}

function resolveFontWeight(value: unknown) {
  const fontWeight = getString(value).trim();

  if (FONT_WEIGHT_PRESETS[fontWeight]) return FONT_WEIGHT_PRESETS[fontWeight];
  if (/^[1-9]00$/.test(fontWeight)) return Number(fontWeight);

  return undefined;
}

function resolveLetterSpacing(value: unknown) {
  const letterSpacing = getString(value).trim();

  if (LETTER_SPACING_PRESETS[letterSpacing]) {
    return LETTER_SPACING_PRESETS[letterSpacing];
  }

  return sanitizeCssValue(letterSpacing, /^-?\d{1,2}(\.\d{1,2})?(em|rem|px)$/);
}

function sanitizeHref(value: unknown) {
  const href = getString(value).trim();

  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;

  try {
    const parsed = new URL(href);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return href;
    }
  } catch {
    return "";
  }

  return "";
}

function getTextStyleFromMark(mark: PublicRichTextMark): CSSProperties {
  const attrs = isRecord(mark.attrs) ? mark.attrs : {};
  const style: CSSProperties = {};

  const color = resolveColor(attrs.color);
  const fontFamily = resolveFontFamily(attrs.fontFamily);
  const fontSize = resolveFontSize(attrs.fontSize);
  const fontWeight = resolveFontWeight(attrs.fontWeight);
  const letterSpacing = resolveLetterSpacing(attrs.letterSpacing);

  if (color) style.color = color;
  if (fontFamily) style.fontFamily = fontFamily;
  if (fontSize) style.fontSize = fontSize;
  if (fontWeight) style.fontWeight = fontWeight;
  if (letterSpacing) style.letterSpacing = letterSpacing;

  return style;
}

function renderWithMarks(
  content: ReactNode,
  marks: PublicRichTextMark[] | undefined,
  keyPrefix: string
) {
  if (!Array.isArray(marks) || marks.length === 0) return content;

  return marks.reduce<ReactNode>((children, mark, index) => {
    const key = `${keyPrefix}-mark-${index}`;

    if (mark.type === "bold") return <strong key={key}>{children}</strong>;
    if (mark.type === "italic") return <em key={key}>{children}</em>;
    if (mark.type === "underline") {
      return (
        <span key={key} style={{ textDecorationLine: "underline" }}>
          {children}
        </span>
      );
    }

    if (mark.type === "link") {
      const attrs = isRecord(mark.attrs) ? mark.attrs : {};
      const href = sanitizeHref(attrs.href);

      if (!href) return children;

      const isExternal = href.startsWith("http://") || href.startsWith("https://");

      return (
        <a
          key={key}
          href={href}
          rel={isExternal ? "noopener noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
          className="underline decoration-current underline-offset-4"
        >
          {children}
        </a>
      );
    }

    if (mark.type === "textStyle") {
      const style = getTextStyleFromMark(mark);

      if (Object.keys(style).length === 0) return children;

      return (
        <span key={key} style={style}>
          {children}
        </span>
      );
    }

    if (mark.type === "highlight") {
      const attrs = isRecord(mark.attrs) ? mark.attrs : {};
      const color = resolveColor(attrs.color) || "rgba(184,137,58,0.22)";

      return (
        <mark key={key} style={{ backgroundColor: color, color: "inherit" }}>
          {children}
        </mark>
      );
    }

    return children;
  }, content);
}

function renderNode(
  node: PublicRichTextNode,
  key: string,
  paragraphClassName?: string
): ReactNode {
  const children = Array.isArray(node.content)
    ? node.content.map((child, index) =>
        renderNode(child, `${key}-${index}`, paragraphClassName)
      )
    : null;

  if (node.type === "text") {
    return renderWithMarks(node.text || "", node.marks, key);
  }

  if (node.type === "paragraph") {
    return (
      <p key={key} className={paragraphClassName}>
        {children}
      </p>
    );
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  if (node.type === "doc") {
    return children;
  }

  return <span key={key}>{children}</span>;
}

export default function PublicRichTextRenderer({
  value,
  fallback,
  className,
  style,
  paragraphClassName,
}: PublicRichTextRendererProps) {
  if (isRichTextValue(value)) {
    const rendered = value.content?.map((node, index) =>
      renderNode(node, `rt-${index}`, paragraphClassName)
    );

    return (
      <div className={className} style={style}>
        {rendered}
      </div>
    );
  }

  if (!fallback) return null;

  return (
    <div className={className} style={style}>
      <p className={paragraphClassName}>{fallback}</p>
    </div>
  );
}
