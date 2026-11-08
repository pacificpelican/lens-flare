import fetch from 'node-fetch';

export interface AiConfig {
  enabled: boolean;
  provider: 'ollama' | 'openai' | 'anthropic' | 'none';
  endpoint?: string;
  model?: string;
  apiKey?: string;
}

export class AiDescriptionService {
  constructor(private config: AiConfig) {}

  /**
   * Check if AI is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && this.config.provider !== 'none' && !!this.config.model;
  }

  /**
   * Generate description for an image using configured AI provider
   */
  async generateDescription(imageBuffer: Buffer, filename: string): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      if (this.config.provider === 'ollama') {
        return await this.generateOllamaDescription(imageBuffer);
      } else if (this.config.provider === 'openai') {
        return await this.generateOpenAiDescription(imageBuffer);
      } else if (this.config.provider === 'anthropic') {
        return await this.generateAnthropicDescription(imageBuffer);
      }
    } catch (error) {
      console.error(
        `AI description generation failed (${this.config.provider}):`,
        error instanceof Error ? error.message : 'unknown error'
      );
      return null;
    }

    return null;
  }

  /**
   * Generate description using Ollama (local)
   */
  private async generateOllamaDescription(imageBuffer: Buffer): Promise<string | null> {
    if (!this.config.endpoint || !this.config.model) {
      throw new Error('Ollama endpoint and model required');
    }

    const base64Image = imageBuffer.toString('base64');

    try {
      const response = await fetch(`${this.config.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: 'Describe this image in 2-3 sentences:',
          images: [base64Image],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { response?: string };
      return data.response?.trim() || null;
    } catch (error) {
      console.error('Ollama generation error:', error);
      return null;
    }
  }

  /**
   * Generate description using OpenAI (cloud)
   */
  private async generateOpenAiDescription(imageBuffer: Buffer): Promise<string | null> {
    if (!this.config.apiKey || !this.config.model) {
      throw new Error('OpenAI API key and model required');
    }

    const base64Image = imageBuffer.toString('base64');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Describe this image in 2-3 sentences:',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('OpenAI generation error:', error);
      return null;
    }
  }

  /**
   * Generate description using Anthropic Claude (cloud)
   */
  private async generateAnthropicDescription(imageBuffer: Buffer): Promise<string | null> {
    if (!this.config.apiKey || !this.config.model) {
      throw new Error('Anthropic API key and model required');
    }

    const base64Image = imageBuffer.toString('base64');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: 'Describe this image in 2-3 sentences:',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const textContent = data.content?.find((c) => c.type === 'text');
      return textContent?.text?.trim() || null;
    } catch (error) {
      console.error('Anthropic generation error:', error);
      return null;
    }
  }
}
