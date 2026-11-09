import ExifParser from 'exif-parser';
import fs from 'fs/promises';

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  dateDigitized?: string;
  dateModified?: string;
  orientation?: number;
  xResolution?: number;
  yResolution?: number;
  software?: string;
  // Camera settings
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focusDistance?: number;
  // Lens info
  focalLength?: number;
  focalLengthIn35mm?: number;
  lensModel?: string;
  // GPS
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  // Other
  flash?: number;
  whiteBalance?: number;
  meteringMode?: number;
  exposureProgram?: number;
}

export class ExifService {
  /**
   * Extract EXIF data from a file path
   */
  async extractExif(filePath: string): Promise<ExifData | null> {
    try {
      const buffer = await fs.readFile(filePath);
      const parser = ExifParser.create(buffer);
      const result = parser.parse();

      if (!result.tags || Object.keys(result.tags).length === 0) {
        return null;
      }

      const tags = result.tags;
      const rawTags = ExifParser.create(buffer).enableSimpleValues(false).parse().tags;
      return {
        make: tags.Make ? String(tags.Make) : undefined,
        model: tags.Model ? String(tags.Model) : undefined,
        dateTime: typeof rawTags.DateTimeOriginal === 'string' ? rawTags.DateTimeOriginal : undefined,
        dateDigitized: typeof rawTags.CreateDate === 'string' ? rawTags.CreateDate : undefined,
        dateModified: typeof rawTags.ModifyDate === 'string' ? rawTags.ModifyDate : undefined,
        orientation: tags.Orientation ? Number(tags.Orientation) : undefined,
        xResolution: tags.XResolution ? Number(tags.XResolution) : undefined,
        yResolution: tags.YResolution ? Number(tags.YResolution) : undefined,
        software: tags.Software ? String(tags.Software) : undefined,
        exposureTime: tags.ExposureTime ? Number(tags.ExposureTime) : undefined,
        fNumber: tags.FNumber ? Number(tags.FNumber) : undefined,
        iso: tags.ISOSpeedRatings ? Number(tags.ISOSpeedRatings) : undefined,
        focusDistance: tags.SubjectDistance ? Number(tags.SubjectDistance) : undefined,
        focalLength: tags.FocalLength ? Number(tags.FocalLength) : undefined,
        focalLengthIn35mm: tags.FocalLengthIn35mmFilm ? Number(tags.FocalLengthIn35mmFilm) : undefined,
        lensModel: tags.LensModel ? String(tags.LensModel) : undefined,
        gpsLatitude: tags.GPSLatitude ? Number(tags.GPSLatitude) : undefined,
        gpsLongitude: tags.GPSLongitude ? Number(tags.GPSLongitude) : undefined,
        gpsAltitude: tags.GPSAltitude ? Number(tags.GPSAltitude) : undefined,
        flash: tags.Flash ? Number(tags.Flash) : undefined,
        whiteBalance: tags.WhiteBalance ? Number(tags.WhiteBalance) : undefined,
        meteringMode: tags.MeteringMode ? Number(tags.MeteringMode) : undefined,
        exposureProgram: tags.ExposureProgram ? Number(tags.ExposureProgram) : undefined,
      };
    } catch (error) {
      // EXIF extraction failed - not all image formats have EXIF data
      console.debug(`No EXIF data found in ${filePath}:`, error instanceof Error ? error.message : 'unknown error');
      return null;
    }
  }

  /**
   * Format EXIF data for display
   */
  formatExifForDisplay(exif: ExifData): Record<string, string> {
    const formatted: Record<string, string> = {};

    if (exif.make) formatted['Camera Make'] = exif.make;
    if (exif.model) formatted['Camera Model'] = exif.model;
    if (exif.lensModel) formatted['Lens'] = exif.lensModel;

    const formatDate = (value: string) => {
      const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(value);
      return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]} (camera time; timezone not shown)` : value;
    };
    if (exif.dateTime) formatted['Date Taken'] = formatDate(exif.dateTime);
    if (exif.dateDigitized) formatted['Date Digitized'] = formatDate(exif.dateDigitized);
    if (exif.dateModified) formatted['Date Modified'] = formatDate(exif.dateModified);

    if (exif.exposureTime) {
      // Format shutter speed (e.g., 1/200)
      const shutter = exif.exposureTime < 1 ? `1/${Math.round(1 / exif.exposureTime)}` : `${exif.exposureTime}"`;
      formatted['Shutter Speed'] = shutter;
    }

    if (exif.fNumber) formatted['Aperture'] = `f/${exif.fNumber.toFixed(1)}`;
    if (exif.iso) formatted['ISO'] = String(exif.iso);
    if (exif.focalLength) formatted['Focal Length'] = `${exif.focalLength}mm`;

    if (exif.xResolution && exif.yResolution) {
      formatted['Resolution'] = `${exif.xResolution}×${exif.yResolution} dpi`;
    }

    if (exif.software) formatted['Software'] = exif.software;

    // Flash status
    if (typeof exif.flash === 'number') {
      const flashStatus = exif.flash & 1 ? 'Fired' : 'Did not fire';
      formatted['Flash'] = flashStatus;
    }

    // GPS coordinates
    if (exif.gpsLatitude && exif.gpsLongitude) {
      formatted['GPS Latitude'] = exif.gpsLatitude.toFixed(6);
      formatted['GPS Longitude'] = exif.gpsLongitude.toFixed(6);
      if (exif.gpsAltitude) {
        formatted['GPS Altitude'] = `${exif.gpsAltitude}m`;
      }
    }

    return formatted;
  }
}
