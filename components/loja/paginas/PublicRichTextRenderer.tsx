import type { CSSProperties, ReactNode } from "react";
import {
  RICH_TEXT_COLOR_PRESETS,
  RICH_TEXT_FONT_PRESETS,
  RICH_TEXT_LETTER_SPACING_PRESETS,
  RICH_TEXT_LINE_HEIGHT_PRESETS,
  RICH_TEXT_PARAGRAPH_SPACING_PRESETS,
  RICH_TEXT_SIZE_PRESETS,
  RICH_TEXT_WEIGHT_PRESETS,
  getRichTextPresetCss,
  type RichTextCssPreset,
} from "@/components/loja/paginas/richTextPresets";

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
  forceColor?: CSSProperties["color"];
  paragraphClassName?: string;
  inline?: boolean;
  "data-stella-inline-field"?: string;
  "data-stella-editorial-gallery-item-id"?: string;
};

function resolvePreset(presets: RichTextCssPreset[], value: string) {
  return getRichTextPresetCss(presets, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRichTextValue(value: unknown): value is PublicRichTextValue {
  return isRecord(value) && value.type === "doc" && Array.isArray(value.content);
}

function getPlainTextFromNode(node: unknown): string {
  if (!isRecord(node)) return "";
  if (typeof node.text === "string") return node.text;

  if (Array.isArray(node.content)) {
    return node.content.map(getPlainTextFromNode).join("\n");
  }

  return "";
}

function isRichTextEmpty(value: PublicRichTextValue) {
  return getPlainTextFromNode(value).trim().length === 0;
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

  const presetColor = resolvePreset(RICH_TEXT_COLOR_PRESETS, color);

  if (presetColor) return presetColor;
  if (color === "CLARO") return "#ffffff";
  if (color === "ESCURO") return "#000000";

  return sanitizeCssValue(
    color,
    /^(#[0-9a-fA-F]{3,8}|rgb(a)?\([0-9\s,%.]+\)|hsl(a)?\([0-9\s,%.deg]+\)|[a-zA-Z]+)$/
  );
}

function resolveFontFamily(value: unknown) {
  const fontFamily = getString(value).trim();

  const presetFontFamily = resolvePreset(RICH_TEXT_FONT_PRESETS, fontFamily);

  if (presetFontFamily) return presetFontFamily;
  if (fontFamily === "var(--font-primary)") return fontFamily;

  return sanitizeCssValue(fontFamily, /^[a-zA-Z0-9\s'",-]+$/);
}

function resolveFontSize(value: unknown) {
  const fontSize = getString(value).trim();

  const presetFontSize = resolvePreset(RICH_TEXT_SIZE_PRESETS, fontSize);

  if (presetFontSize) return presetFontSize;
  if (fontSize === "PEQUENO") return "0.875rem";
  if (fontSize === "MEDIO") return "1rem";
  if (fontSize === "GRANDE") return "1.5rem";
  if (fontSize === "EXTRA_GRANDE") return "2.75rem";

  return sanitizeCssValue(fontSize, /^(\d{1,2}(\.\d{1,2})?(rem|em|px|%)|inherit)$/);
}

function resolveFontWeight(value: unknown) {
  const fontWeight = getString(value).trim();

  const presetFontWeight = resolvePreset(RICH_TEXT_WEIGHT_PRESETS, fontWeight);

  if (presetFontWeight) return Number(presetFontWeight);
  if (/^[1-9]00$/.test(fontWeight)) return Number(fontWeight);

  return undefined;
}

function resolveLetterSpacing(value: unknown) {
  const letterSpacing = getString(value).trim();

  const presetLetterSpacing = resolvePreset(
    RICH_TEXT_LETTER_SPACING_PRESETS,
    letterSpacing
  );

  if (presetLetterSpacing) return presetLetterSpacing;

  return sanitizeCssValue(letterSpacing, /^-?\d{1,2}(\.\d{1,2})?(em|rem|px)$/);
}

function resolveLineHeight(value: unknown) {
  const lineHeight = getString(value).trim();

  const presetLineHeight = resolvePreset(RICH_TEXT_LINE_HEIGHT_PRESETS, lineHeight);

  if (presetLineHeight) return presetLineHeight;

  return sanitizeCssValue(lineHeight, /^(\d{1,2}(\.\d{1,2})?|normal)$/);
}

function resolveParagraphSpacing(value: unknown) {
  const paragraphSpacing = getString(value).trim();

  const presetParagraphSpacing = resolvePreset(
    RICH_TEXT_PARAGRAPH_SPACING_PRESETS,
    paragraphSpacing
  );

  if (presetParagraphSpacing) return presetParagraphSpacing;

  return sanitizeCssValue(paragraphSpacing, /^(\d{1,2}(\.\d{1,2})?(em|rem|px)|0)$/);
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

function getTextStyleFromMark(
  mark: PublicRichTextMark,
  forceColor?: CSSProperties["color"]
): CSSProperties {
  const attrs = isRecord(mark.attrs) ? mark.attrs : {};
  const style: CSSProperties = {};

  const color = forceColor || resolveColor(attrs.color);
  const fontFamily = resolveFontFamily(attrs.fontFamily);
  const fontSize = resolveFontSize(attrs.fontSize);
  const fontWeight = resolveFontWeight(attrs.fontWeight);
  const letterSpacing = resolveLetterSpacing(attrs.letterSpacing);
  const lineHeight = resolveLineHeight(attrs.lineHeight);

  if (color) style.color = color;
  if (fontFamily) style.fontFamily = fontFamily;
  if (fontSize) style.fontSize = fontSize;
  if (fontWeight) style.fontWeight = fontWeight;
  if (letterSpacing) style.letterSpacing = letterSpacing;
  if (lineHeight) style.lineHeight = lineHeight;

  return style;
}

function renderWithMarks(
  content: ReactNode,
  marks: PublicRichTextMark[] | undefined,
  keyPrefix: string,
  forceColor?: CSSProperties["color"]
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
      const style = getTextStyleFromMark(mark, forceColor);

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
  paragraphClassName?: string,
  forceColor?: CSSProperties["color"]
): ReactNode {
  const children = Array.isArray(node.content)
    ? node.content.map((child, index) =>
        renderNode(child, `${key}-${index}`, paragraphClassName, forceColor)
      )
    : null;

  if (node.type === "text") {
    return renderWithMarks(node.text || "", node.marks, key, forceColor);
  }

  if (node.type === "paragraph") {
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    const paragraphSpacing = resolveParagraphSpacing(attrs.paragraphSpacing);

    return (
      <p
        key={key}
        className={paragraphClassName}
        style={paragraphSpacing ? { marginBottom: paragraphSpacing } : undefined}
      >
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

function renderInlineNode(
  node: PublicRichTextNode,
  key: string,
  forceColor?: CSSProperties["color"]
): ReactNode {
  const children = Array.isArray(node.content)
    ? node.content.map((child, index) =>
        renderInlineNode(child, `${key}-${index}`, forceColor)
      )
    : null;

  if (node.type === "text") {
    return renderWithMarks(node.text || "", node.marks, key, forceColor);
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  if (node.type === "paragraph" || node.type === "doc") {
    return <span key={key}>{children}</span>;
  }

  return <span key={key}>{children}</span>;
}

export default function PublicRichTextRenderer({
  value,
  fallback,
  className,
  style,
  forceColor,
  paragraphClassName,
  inline = false,
  "data-stella-inline-field": dataStellaInlineField,
  "data-stella-editorial-gallery-item-id": dataStellaEditorialGalleryItemId,
}: PublicRichTextRendererProps) {
  if (isRichTextValue(value) && !isRichTextEmpty(value)) {
    const rendered = value.content?.map((node, index) =>
      inline
        ? renderInlineNode(node, `rt-${index}`, forceColor)
        : renderNode(node, `rt-${index}`, paragraphClassName, forceColor)
    );
    const resolvedStyle = forceColor ? { ...style, color: forceColor } : style;

    if (inline) {
      return (
        <span
          className={className}
          style={resolvedStyle}
          data-stella-inline-field={dataStellaInlineField || undefined}
          data-stella-editorial-gallery-item-id={
            dataStellaEditorialGalleryItemId || undefined
          }
        >
          {rendered}
        </span>
      );
    }

    return (
      <div
        className={className}
        style={resolvedStyle}
        data-stella-inline-field={dataStellaInlineField || undefined}
        data-stella-editorial-gallery-item-id={
          dataStellaEditorialGalleryItemId || undefined
        }
      >
        {rendered}
      </div>
    );
  }

  if (!fallback?.trim()) return null;

  if (inline) {
    return (
      <span
        className={className}
        style={forceColor ? { ...style, color: forceColor } : style}
        data-stella-inline-field={dataStellaInlineField || undefined}
        data-stella-editorial-gallery-item-id={
          dataStellaEditorialGalleryItemId || undefined
        }
      >
        {fallback}
      </span>
    );
  }

  return (
    <div
      className={className}
      style={forceColor ? { ...style, color: forceColor } : style}
      data-stella-inline-field={dataStellaInlineField || undefined}
      data-stella-editorial-gallery-item-id={
        dataStellaEditorialGalleryItemId || undefined
      }
    >
      <p className={paragraphClassName}>{fallback}</p>
    </div>
  );
}
