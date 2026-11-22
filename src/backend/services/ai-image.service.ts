import fetch from 'node-fetch';
import type { AiConfig } from './ai-description.service.js';

const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

export class ImageGenerationError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
  }
}

interface OllamaImageChunk {
  response?: string;
  image?: string;
  images?: string[];
  error?: string;
}

export class ImageGenerationService {
  constructor(private config: AiConfig) {}

  isEnabled(): boolean {
    return this.config.enabled && this.config.provider === 'ollama' && !!this.config.imageModel;
  }

  /**
   * Generate an image from a text prompt with the configured Ollama image model.
   * Returns the raw image bytes (PNG).
   */
  async generateImage(prompt: string, signal?: AbortSignal): Promise<Buffer> {
    if (!this.isEnabled() || !this.config.endpoint || !this.config.imageModel) {
      throw new ImageGenerationError('Image generation is not enabled on this server', 503);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abortFromCaller);

    try {
      const response = await fetch(`${this.config.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.imageModel, prompt, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new ImageGenerationError(
          `Ollama image generation failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`
        );
      }

      // Ollama streams NDJSON progress; the finished image arrives in the last chunk(s).
      let image: string | undefined;
      let buffered = '';
      const readLine = (line: string) => {
        if (!line.trim()) return;
        const chunk = JSON.parse(line) as OllamaImageChunk;
        if (chunk.error) throw new ImageGenerationError(chunk.error);
        image = chunk.image || chunk.images?.[0] || image;
      };

      for await (const part of response.body as unknown as AsyncIterable<Buffer>) {
        buffered += part.toString('utf8');
        const lines = buffered.split('\n');
        buffered = lines.pop() ?? '';
        lines.forEach(readLine);
      }
      readLine(buffered);

      if (!image) {
        throw new ImageGenerationError(
          `Model "${this.config.imageModel}" did not return an image. Check that it is an Ollama image-generation model and that your platform supports it.`
        );
      }

      return Buffer.from(image, 'base64');
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ImageGenerationError(
          signal?.aborted ? 'Image generation was cancelled' : 'Image generation timed out',
          signal?.aborted ? 499 : 504
        );
      }
      throw new ImageGenerationError(
        `Could not reach Ollama at ${this.config.endpoint}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}
