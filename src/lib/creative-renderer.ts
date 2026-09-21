import { readFile } from "node:fs/promises";
import path from "node:path";

import { Font, parse } from "opentype.js";
import sharp from "sharp";

const WIDTH = 720;
const HEIGHT = 1280;
const creativeFont = readFile(path.join(process.cwd(), "public", "fonts", "Lato-Bold.ttf"))
  .then((buffer) => parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));

function textWidth(font: Font, value: string, fontSize: number) {
  return font.getAdvanceWidth(value, fontSize, { kerning: true });
}

function textPath(font: Font, value: string, x: number, y: number, fontSize: number, fill: string, options?: { anchor?: "start" | "middle" }) {
  const startX = options?.anchor === "middle" ? x - textWidth(font, value, fontSize) / 2 : x;
  return `<path d="${font.getPath(value, startX, y, fontSize, { kerning: true }).toPathData(2)}" fill="${fill}" />`;
}

function wrapHeadline(font: Font, value: string, maximumWidth = 608) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
    if (textWidth(font, candidate, 60) <= maximumWidth && lines.length) lines[lines.length - 1] = candidate;
    else lines.push(word);
  }
  return lines.slice(0, 3);
}

export async function renderCreative(input: {
  background: ArrayBuffer;
  brandName: string;
  headline: string;
  cta: string;
}) {
  const font = await creativeFont;
  const headlineLines = wrapHeadline(font, input.headline);
  const headline = headlineLines.map((line, index) => textPath(font, line, 56, 148 + index * 70, 60, "#ffffff")).join("");
  const brandName = textPath(font, input.brandName.toUpperCase(), 56, 70, 19, "#f4eff8");
  const cta = textPath(font, input.cta, 360, 1187, 27, "#211b28", { anchor: "middle" });

  const overlay = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#17131d" stop-opacity="0.92" />
          <stop offset="0.72" stop-color="#17131d" stop-opacity="0.58" />
          <stop offset="1" stop-color="#17131d" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="bottomScrim" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#17131d" stop-opacity="0.92" />
          <stop offset="0.74" stop-color="#17131d" stop-opacity="0.55" />
          <stop offset="1" stop-color="#17131d" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="720" height="440" fill="url(#topScrim)" />
      <rect y="950" width="720" height="330" fill="url(#bottomScrim)" />
      ${brandName}
      ${headline}
      <rect x="56" y="1126" width="608" height="96" rx="48" fill="#ffffff" />
      ${cta}
    </svg>
  `);

  return sharp(Buffer.from(input.background))
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
