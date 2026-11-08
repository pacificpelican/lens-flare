declare module 'exif-parser' {
  export interface ExifTags {
    [key: string]: any;
  }

  export interface ParseResult {
    tags: ExifTags;
    hasThumbnail(): boolean;
    getThumbnailBuffer(): Buffer;
  }

  export default class ExifParser {
    static create(buffer: Buffer): ExifParser;
    parse(): ParseResult;
  }
}
