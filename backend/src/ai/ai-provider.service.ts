import { Injectable } from '@nestjs/common';
import {
  AiProviderNotConfiguredException,
  AiProviderRateLimitException,
  AiProviderRequestException,
  AiProviderTimeoutException,
} from './ai-provider.errors';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 30_000;

export interface AiCompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

// The one and only place this backend talks to an external AI provider.
// Every AI capability in this module goes through here -- nothing else
// calls out to the network. If ANTHROPIC_API_KEY is absent, this throws
// immediately rather than returning a fabricated completion; callers must
// surface that as a clear "not configured" state, never a fake result.
@Injectable()
export class AiProviderService {
  private get apiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  }

  private get model(): string {
    // Verify this against Anthropic's current model list before relying on
    // it in production -- overridable without a code change via env var.
    return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  getModelName(): string | null {
    return this.isConfigured() ? this.model : null;
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new AiProviderNotConfiguredException();
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens ?? 1536,
          system: request.system,
          messages: [{ role: 'user', content: request.prompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiProviderTimeoutException();
      }
      throw new AiProviderRequestException(
        `Could not reach the AI provider: ${error instanceof Error ? error.message : 'unknown network error'}`,
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (response.status === 429) {
      throw new AiProviderRateLimitException();
    }

    if (!response.ok) {
      // Never surface the raw provider body -- it may echo request details
      // back; a status-only message is enough for the caller to act on.
      throw new AiProviderRequestException(`AI provider request failed (HTTP ${response.status}).`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content?.find((block) => block.type === 'text');
    return textBlock?.text ?? '';
  }
}
