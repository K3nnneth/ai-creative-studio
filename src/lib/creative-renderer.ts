import sharp from "sharp";

const WIDTH = 720;
const HEIGHT = 1280;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function wrapHeadline(value: string, maximumCharacters = 19) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
    if (candidate.length <= maximumCharacters && lines.length) lines[lines.length - 1] = candidate;
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
  const headlineLines = wrapHeadline(input.headline);
  const headline = headlineLines.map((line, index) =>
    `<tspan x="56" dy="${index === 0 ? 0 : 70}">${escapeXml(line)}</tspan>`,
  ).join("");

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
      <text x="56" y="70" fill="#f4eff8" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="3">${escapeXml(input.brandName.toUpperCase())}</text>
      <text x="56" y="148" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="700" letter-spacing="-2">${headline}</text>
      <rect x="56" y="1126" width="608" height="96" rx="48" fill="#ffffff" />
      <text x="360" y="1187" text-anchor="middle" fill="#211b28" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" letter-spacing="0.3">${escapeXml(input.cta)}</text>
    </svg>
  `);

  return sharp(Buffer.from(input.background))
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
