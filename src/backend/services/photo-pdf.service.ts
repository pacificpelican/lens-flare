import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { PhotoDetail } from '@shared/types';

const require = createRequire(import.meta.url);
const fontDirectory = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const logoPath = fileURLToPath(new URL('../../../src/frontend/public/images/lens-flare-logo.png', import.meta.url));

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}

export async function createPhotoPdf(photos: PhotoDetail[], owner: string, printedAt: Date, uploadDir: string): Promise<Buffer> {
  const document = new PDFDocument({ size: 'LETTER', margin: 45, autoFirstPage: false, info: { Title: `${owner} Photos`, Author: 'Lens Flare' } });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });
  document.registerFont('regular', path.join(fontDirectory, 'DejaVuSans.ttf'));
  document.registerFont('bold', path.join(fontDirectory, 'DejaVuSans-Bold.ttf'));

  const heading = () => {
    document.font('bold').fontSize(21).fillColor('#20212a').text(`${owner} Photos`);
    document.font('regular').fontSize(10).fillColor('#666666').text(`Printed ${printedAt.toISOString()}`);
    document.moveDown(0.8);
  };

  if (photos.length === 0) {
    document.addPage();
    heading();
    document.font('regular').fontSize(12).fillColor('#333333').text('No photos match the current filters.');
  }

  for (const [index, photo] of photos.entries()) {
    document.addPage();
    if (index === 0) heading();
    document.font('bold').fontSize(16).fillColor('#20212a').text(photo.title || photo.original_filename);
    document.moveDown(0.4);
    if (document.y + 285 > document.page.height - document.page.margins.bottom) document.addPage();
    const imageTop = document.y;
    const imageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    try {
      if (path.basename(photo.filename) !== photo.filename) throw new Error('Invalid photo filename');
      const image = await sharp(path.join(uploadDir, photo.filename)).rotate().resize({ width: 1800, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
      document.image(image, document.page.margins.left, imageTop, { fit: [imageWidth, 275], align: 'center', valign: 'center' });
    } catch (error) {
      console.warn('PDF image unavailable:', photo.filename, error);
      document.font('regular').fontSize(11).fillColor('#9b1c1c').text('Image unavailable or unsupported', document.page.margins.left, imageTop, { width: imageWidth, align: 'center' });
    }
    document.y = imageTop + 285;
    document.x = document.page.margins.left;
    document.font('regular').fontSize(9).fillColor('#333333');

    const fields: Array<[string, unknown]> = [
      ['Original filename', photo.original_filename],
      ['Stored filename', photo.filename],
      ['File type', photo.mime_type],
      ['File size', `${photo.file_size} bytes`],
      ['Uploaded', photo.upload_date],
      ['Created', photo.created_at],
      ['Updated', photo.updated_at],
      ['Photo ID', photo.id],
      ['User ID', photo.user_id],
      ['Tags', photo.tags.map((t: any) => t.tag_name).join(', ')],
      ['Description', photo.user_description],
      ['AI description', photo.ai_description],
    ];
    let exif: unknown = photo.exif_data;
    if (typeof exif === 'string') {
      try { exif = JSON.parse(exif); } catch {}
    }
    if (exif && typeof exif === 'object' && !Array.isArray(exif)) {
      for (const [key, value] of Object.entries(exif)) fields.push([`EXIF ${key}`, value]);
    } else if (exif) {
      fields.push(['EXIF', exif]);
    }

    for (const [label, value] of fields) {
      if (value === null || value === undefined || value === '') continue;
      document.font('bold').text(`${label}: `, { continued: true });
      document.font('regular').text(displayValue(value));
    }
  }

  document.addPage();
  document.image(logoPath, (document.page.width - 130) / 2, 150, { fit: [130, 130], align: 'center', valign: 'center' });
  document.font('bold').fontSize(28).fillColor('#20212a').text('Lens Flare', 45, 315, { align: 'center' });
  document.moveDown(0.7);
  document.font('regular').fontSize(12).fillColor('#555555').text('A photo archiver for organizing, editing, and preserving your digital photos.', { align: 'center' });
  document.moveDown(1.2);
  document.fillColor('#5431a0').text('https://github.com/pacificpelican/lens-flare', { align: 'center', link: 'https://github.com/pacificpelican/lens-flare', underline: true });
  document.end();
  return finished;
}