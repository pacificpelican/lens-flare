import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ExportOptions {
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

export class ImageProcessingService {
  /**
   * Get image dimensions
   */
  async getDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
    try {
      const metadata = await sharp(filePath).metadata();
      if (metadata.width && metadata.height) {
        return { width: metadata.width, height: metadata.height };
      }
    } catch (error) {
      console.error('Failed to get image dimensions:', error);
    }
    return null;
  }

  /**
   * Generate a thumbnail from an image
   */
  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = 200,
    height: number = 200
  ): Promise<boolean> {
    try {
      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      return true;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return false;
    }
  }

  /**
   * Resize an image
   */
  async resize(inputPath: string, outputPath: string, options: ResizeOptions): Promise<boolean> {
    try {
      let transform = sharp(inputPath);

      if (options.width || options.height) {
        transform = transform.resize(options.width, options.height, {
          fit: options.fit || 'inside',
          withoutEnlargement: true,
        });
      }

      await transform.jpeg({ quality: 85 }).toFile(outputPath);
      return true;
    } catch (error) {
      console.error('Image resize failed:', error);
      return false;
    }
  }

  /**
   * Convert image format and/or resize
   */
  async convert(
    inputPath: string,
    outputPath: string,
    exportOptions: ExportOptions,
    resizeOptions?: ResizeOptions
  ): Promise<boolean> {
    try {
      let transform = sharp(inputPath);

      // Apply resize if specified
      if (resizeOptions && (resizeOptions.width || resizeOptions.height)) {
        transform = transform.resize(resizeOptions.width, resizeOptions.height, {
          fit: resizeOptions.fit || 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format conversion
      const format = exportOptions.format || 'jpeg';
      const quality = exportOptions.quality || 85;

      if (format === 'jpeg') {
        await transform.jpeg({ quality }).toFile(outputPath);
      } else if (format === 'png') {
        await transform.png({ compressionLevel: 9 }).toFile(outputPath);
      } else if (format === 'webp') {
        await transform.webp({ quality }).toFile(outputPath);
      } else if (format === 'avif') {
        await transform.avif({ quality }).toFile(outputPath);
      } else {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Image conversion failed:', error);
      return false;
    }
  }

  /**
   * Optimize image (reduce file size while maintaining quality)
   */
  async optimize(inputPath: string, outputPath: string, quality: number = 80): Promise<boolean> {
    try {
      const metadata = await sharp(inputPath).metadata();

      // Check if format is one of the ones we want to handle specially
      const formatStr = String(metadata.format).toLowerCase();
      if (formatStr.includes('heic') || formatStr.includes('heif')) {
        // Convert HEIC to JPEG
        await sharp(inputPath)
          .jpeg({ quality, progressive: true })
          .toFile(outputPath);
      } else if (metadata.format === 'png') {
        // Keep PNG but compress
        await sharp(inputPath)
          .png({ compressionLevel: 9 })
          .toFile(outputPath);
      } else {
        // Default: convert to JPEG
        await sharp(inputPath)
          .jpeg({ quality, progressive: true })
          .toFile(outputPath);
      }

      return true;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return false;
    }
  }

  /**
   * Rotate image by degrees
   */
  async rotate(inputPath: string, outputPath: string, degrees: number): Promise<boolean> {
    try {
      await sharp(inputPath)
        .rotate(degrees)
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);
      return true;
    } catch (error) {
      console.error('Image rotation failed:', error);
      return false;
    }
  }

  /**
   * Flip image horizontally or vertically
   */
  async flip(inputPath: string, outputPath: string, direction: 'horizontal' | 'vertical'): Promise<boolean> {
    try {
      let transform = sharp(inputPath);

      if (direction === 'horizontal') {
        transform = transform.flop();
      } else {
        transform = transform.flip();
      }

      await transform.jpeg({ quality: 85, progressive: true }).toFile(outputPath);
      return true;
    } catch (error) {
      console.error('Image flip failed:', error);
      return false;
    }
  }

  /**
   * Get file size in MB
   */
  async getFileSize(filePath: string): Promise<number | null> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.error('Failed to get file size:', error);
      return null;
    }
  }

  /**
   * Generate multiple thumbnail sizes
   */
  async generateThumbnailSizes(
    inputPath: string,
    outputDir: string,
    basename: string
  ): Promise<Record<string, string> | null> {
    try {
      const sizes = [
        { size: 'small', width: 150, height: 150 },
        { size: 'medium', width: 300, height: 300 },
        { size: 'large', width: 600, height: 600 },
      ];

      const results: Record<string, string> = {};

      for (const { size, width, height } of sizes) {
        const filename = `${basename}-${size}-thumb.jpg`;
        const outputPath = path.join(outputDir, filename);

        const success = await this.generateThumbnail(inputPath, outputPath, width, height);
        if (success) {
          results[size] = filename;
        }
      }

      return Object.keys(results).length > 0 ? results : null;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return null;
    }
  }
}
