// The AI provider integration boundary's own error types -- kept distinct
// from NestJS HTTP exceptions so ai.controller.ts can translate each one to
// the right status code without the service layer knowing about HTTP.
export class AiProviderNotConfiguredException extends Error {
  constructor() {
    super(
      'AI provider is not configured. Set ANTHROPIC_API_KEY in the backend environment to enable this feature.',
    );
    this.name = 'AiProviderNotConfiguredException';
  }
}

export class AiProviderTimeoutException extends Error {
  constructor() {
    super('The AI provider request timed out. Please try again.');
    this.name = 'AiProviderTimeoutException';
  }
}

export class AiProviderRateLimitException extends Error {
  constructor() {
    super('The AI provider rate limit was exceeded. Please try again shortly.');
    this.name = 'AiProviderRateLimitException';
  }
}

export class AiProviderRequestException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderRequestException';
  }
}
