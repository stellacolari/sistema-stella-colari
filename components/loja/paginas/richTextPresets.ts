export type RichTextCssPreset = {
  value: string;
  label: string;
  css: string;
};

export const RICH_TEXT_FONT_PRESETS: RichTextCssPreset[] = [
  { value: "PADRAO", label: "Padrão", css: "var(--font-primary)" },
  { value: "SERIF_ELEGANTE", label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { value: "SANS_CLEAN", label: "Sans", css: "var(--font-primary)" },
  { value: "DISPLAY_LUXO", label: "Display", css: "Georgia, 'Times New Roman', serif" },
  { value: "ASSINATURA", label: "Assinatura", css: "'Brush Script MT', 'Segoe Script', cursive" },
];

export const RICH_TEXT_SIZE_PRESETS: RichTextCssPreset[] = [
  { value: "PP", label: "PP", css: "0.75rem" },
  { value: "P", label: "P", css: "0.875rem" },
  { value: "M", label: "M", css: "1rem" },
  { value: "G", label: "G", css: "1.5rem" },
  { value: "GG", label: "GG", css: "2.25rem" },
  { value: "XG", label: "XG", css: "3rem" },
];

export const RICH_TEXT_WEIGHT_PRESETS: RichTextCssPreset[] = [
  { value: "LIGHT", label: "Light", css: "300" },
  { value: "REGULAR", label: "Regular", css: "400" },
  { value: "MEDIUM", label: "Medium", css: "500" },
  { value: "SEMIBOLD", label: "Semibold", css: "600" },
  { value: "BOLD", label: "Bold", css: "700" },
];

export const RICH_TEXT_COLOR_PRESETS: RichTextCssPreset[] = [
  { value: "PADRAO", label: "Padrão", css: "inherit" },
  { value: "PRETO", label: "Preto", css: "#0f172a" },
  { value: "BRANCO", label: "Branco", css: "#ffffff" },
  { value: "CINZA", label: "Cinza", css: "#64748b" },
  { value: "DOURADO", label: "Dourado", css: "#b8892e" },
  { value: "PERSONALIZADO", label: "Personalizado", css: "" },
];

export const RICH_TEXT_LETTER_SPACING_PRESETS: RichTextCssPreset[] = [
  { value: "NORMAL", label: "Normal", css: "0" },
  { value: "LEVE", label: "Leve", css: "0.02em" },
  { value: "MEDIO", label: "Médio", css: "0.08em" },
  { value: "ALTO", label: "Alto", css: "0.14em" },
];

export function getRichTextPresetCss(
  presets: RichTextCssPreset[],
  value: string
) {
  return presets.find((preset) => preset.value === value)?.css || "";
}
