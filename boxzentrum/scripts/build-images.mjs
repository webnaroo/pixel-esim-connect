// Erzeugt responsive AVIF/WebP-Varianten der Hallenfotos mit einheitlichem,
// dunklem Farblook, plus Blur-Platzhalter. Quelle: assets/photos/*.jpg
// Ausgabe: public/img/<id>-<breite>.(avif|webp) und src/content/photos.gen.ts
import sharp from "sharp";
import { readdir, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "assets/photos");
const outDir = path.join(root, "public/img");
const WIDTHS = [320, 640, 1024, 1600, 2048];

// Einheitlicher Look: etwas weniger Sättigung, tiefere Schatten, mehr Kontrast.
const grade = (img) => img.modulate({ saturation: 0.86, brightness: 0.95 }).linear(1.07, -7);

await mkdir(outDir, { recursive: true });
const files = (await readdir(srcDir)).filter((f) => f.endsWith(".jpg")).sort();
const meta = {};

for (const file of files) {
  const id = file.replace(/\.jpg$/, "");
  const input = path.join(srcDir, file);
  const { width, height } = await sharp(input).rotate().metadata();
  const widths = WIDTHS.filter((w) => w <= width);
  if (!widths.includes(width) && width < WIDTHS.at(-1)) widths.push(width);
  for (const w of widths) {
    const target = path.join(outDir, `${id}-${w}.avif`);
    if (await access(target).then(() => true, () => false)) continue; // schon erzeugt
    const base = grade(sharp(input).rotate().resize({ width: w }));
    await base.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(outDir, `${id}-${w}.avif`));
    await base.clone().webp({ quality: 74, effort: 5 }).toFile(path.join(outDir, `${id}-${w}.webp`));
  }
  const lqip = await grade(sharp(input).rotate().resize({ width: 20 })).blur(1.2).webp({ quality: 40 }).toBuffer();
  meta[id] = { width, height, widths, lqip: `data:image/webp;base64,${lqip.toString("base64")}` };
  console.log(`✓ ${id} (${widths.join(", ")})`);
}

const body = `// Automatisch erzeugt von scripts/build-images.mjs – nicht von Hand bearbeiten.
export const photoMeta = ${JSON.stringify(meta, null, 2)} as const;
export type PhotoId = keyof typeof photoMeta;
`;
await writeFile(path.join(root, "src/content/photos.gen.ts"), body);

// Open-Graph-Bild (1200×630) für Link-Vorschauen
await mkdir(path.join(root, "public/og"), { recursive: true });
const vignette = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070606" stop-opacity=".15"/><stop offset=".6" stop-color="#070606" stop-opacity=".35"/><stop offset="1" stop-color="#070606" stop-opacity=".85"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`,
);
await grade(sharp(path.join(srcDir, "halle-ring-decke.jpg")).rotate().resize(1200, 630, { fit: "cover", position: "centre" }))
  .composite([{ input: vignette }])
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(path.join(root, "public/og/boxzentrum-kiel.jpg"));
console.log("✓ og/boxzentrum-kiel.jpg");
