export type RichTextCssPreset = {
  value: string;
  label: string;
  css: string;
};

export type RichTextFontFamilyToken = RichTextCssPreset & {
  weights: string[];
};

export const RICH_TEXT_FONT_FAMILIES: RichTextFontFamilyToken[] = [
  {
    value: "PRINCIPAL",
    label: "Fonte principal",
    css: "var(--font-primary)",
    weights: ["300", "400", "500", "600", "700"],
  },
  {
    value: "EDITORIAL",
    label: "Fonte editorial",
    css: "Georgia, 'Times New Roman', serif",
    weights: ["400", "600", "700", "900"],
  },
];

export const RICH_TEXT_TYPE_PRESETS: RichTextCssPreset[] = [
  { value: "TITULO", label: "Titulo", css: "2.25rem" },
  { value: "SUBTITULO", label: "Subtitulo", css: "1.5rem" },
  { value: "PARAGRAFO", label: "Paragrafo", css: "1rem" },
  { value: "BOTAO", label: "Botao", css: "0.875rem" },
  { value: "CUSTOMIZADO", label: "Customizado", css: "" },
];

export const RICH_TEXT_FONT_PRESETS: RichTextCssPreset[] = [
  { value: "PADRAO", label: "Fonte do tema", css: "var(--font-primary)" },
  { value: "PRINCIPAL", label: "Fonte principal", css: "var(--font-primary)" },
  { value: "EDITORIAL", label: "Fonte editorial", css: "Georgia, 'Times New Roman', serif" },
  { value: "SERIF_ELEGANTE", label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { value: "SANS_CLEAN", label: "Sans", css: "var(--font-primary)" },
  { value: "DISPLAY_LUXO", label: "Display", css: "Georgia, 'Times New Roman', serif" },
  { value: "ASSINATURA", label: "Assinatura", css: "'Brush Script MT', 'Segoe Script', cursive" },
];

export const RICH_TEXT_SIZE_PRESETS: RichTextCssPreset[] = [
  { value: "PP", label: "Micro", css: "0.75rem" },
  { value: "P", label: "Pequeno", css: "0.875rem" },
  { value: "M", label: "Médio", css: "1rem" },
  { value: "G", label: "Grande", css: "1.5rem" },
  { value: "GG", label: "Editorial", css: "2.25rem" },
  { value: "XG", label: "Editorial amplo", css: "3rem" },
];

export const RICH_TEXT_WEIGHT_PRESETS: RichTextCssPreset[] = [
  { value: "LIGHT", label: "Leve", css: "300" },
  { value: "REGULAR", label: "Regular", css: "400" },
  { value: "MEDIUM", label: "Médio", css: "500" },
  { value: "SEMIBOLD", label: "Semibold", css: "600" },
  { value: "BOLD", label: "Bold", css: "700" },
  { value: "BLACK", label: "Black", css: "900" },
];

export const RICH_TEXT_COLOR_PRESETS: RichTextCssPreset[] = [
  { value: "PADRAO", label: "Cor herdada", css: "inherit" },
  { value: "PRETO", label: "Preto", css: "#0f172a" },
  { value: "BRANCO", label: "Branco", css: "#ffffff" },
  { value: "CINZA", label: "Cinza", css: "#64748b" },
  { value: "DOURADO", label: "Dourado", css: "#b8892e" },
  { value: "PERSONALIZADO", label: "Personalizado", css: "" },
];

export const RICH_TEXT_LETTER_SPACING_PRESETS: RichTextCssPreset[] = [
  { value: "NORMAL", label: "Sem espaçamento", css: "0" },
  { value: "LEVE", label: "Leve", css: "0.02em" },
  { value: "MEDIO", label: "Médio", css: "0.08em" },
  { value: "ALTO", label: "Alto", css: "0.14em" },
];

export const RICH_TEXT_LINE_HEIGHT_PRESETS: RichTextCssPreset[] = [
  { value: "COMPACTO", label: "Compacta", css: "1" },
  { value: "NORMAL", label: "Normal", css: "1.15" },
  { value: "RESPIRADO", label: "Aberta", css: "1.35" },
  { value: "AMPLO", label: "Ampla", css: "1.6" },
];

export const RICH_TEXT_PARAGRAPH_SPACING_PRESETS: RichTextCssPreset[] = [
  { value: "NENHUM", label: "Parágrafo sem espaço", css: "0" },
  { value: "PEQUENO", label: "Parágrafo pequeno", css: "0.35em" },
  { value: "PADRAO", label: "Parágrafo médio", css: "0.65em" },
  { value: "GRANDE", label: "Parágrafo grande", css: "1em" },
];

export function getRichTextPresetCss(
  presets: RichTextCssPreset[],
  value: string
) {
  return presets.find((preset) => preset.value === value)?.css || "";
}
