import assert from "node:assert/strict";
import { criarImagemConteudoVazia } from "../lib/loja/conteudo/contracts.ts";
import { calcularEstiloCropPercentual } from "../lib/loja/conteudo/crop.ts";

const media = criarImagemConteudoVazia(16 / 9, 4 / 5);
media.desktop.areaPercent = { x: 25, y: 10, width: 50, height: 40 };

const cropped = calcularEstiloCropPercentual(media.desktop);
assert.equal(cropped.width, "200%");
assert.equal(cropped.height, "250%");
assert.equal(cropped.left, "-50%");
assert.equal(cropped.top, "-25%");
assert.equal(cropped.objectFit, "fill");

const full = criarImagemConteudoVazia().desktop;
full.focalX = 37;
full.focalY = 61;
full.zoom = 1.4;
const fallback = calcularEstiloCropPercentual(full);
assert.equal(fallback.objectPosition, "37% 61%");
assert.equal(fallback.transform, "scale(1.4) rotate(0deg)");

console.log("Crop percentual e fallback focal validados.");
