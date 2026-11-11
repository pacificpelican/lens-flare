import { createRequire } from 'module';
import path from 'path';
import sharp, { Sharp } from 'sharp';

const require = createRequire(import.meta.url);
const fontPath = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf', 'DejaVuSans.ttf');

export async function addWatermark(image: Sharp, text: string): Promise<void> {
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Cannot determine image dimensions for watermark');
  }

  const rotated = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rendered = await sharp({
    text: {
      text: `<span foreground="white">${escapedText}</span>`,
      font: 'DejaVu Sans',
      fontfile: fontPath,
      width: Math.max(1, Math.floor(width * 0.8)),
      height: Math.max(1, Math.floor(height * 0.06)),
      wrap: 'none',
      rgba: true,
    },
  }).png().toBuffer({ resolveWithObject: true });

  const margin = Math.floor(Math.min(width, height) * 0.02);
  const padding = Math.min(
    Math.max(0, Math.floor(rendered.info.height * 0.25)),
    Math.floor((width - rendered.info.width) / 2),
    Math.floor((height - rendered.info.height) / 2)
  );
  const backgroundWidth = rendered.info.width + padding * 2;
  const backgroundHeight = rendered.info.height + padding * 2;
  const left = Math.max(0, width - backgroundWidth - margin);
  const top = Math.max(0, height - backgroundHeight - margin);
  const background = await sharp({
    create: {
      width: backgroundWidth,
      height: backgroundHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.55 },
    },
  }).png().toBuffer();

  image.rotate().composite([
    { input: background, left, top },
    { input: rendered.data, left: left + padding, top: top + padding },
  ]);
}
