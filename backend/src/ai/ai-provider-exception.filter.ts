import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import {
  AiProviderNotConfiguredException,
  AiProviderRateLimitException,
  AiProviderRequestException,
  AiProviderTimeoutException,
} from './ai-provider.errors';

// Translates the AI provider integration boundary's own error types into
// clear HTTP responses -- 503 for "not configured" (the honest, expected
// out-of-the-box state), 504 for a timeout, 429 for a rate limit, 502 for
// anything else the provider rejected. Never a 200 with a fabricated body.
@Catch(AiProviderNotConfiguredException, AiProviderTimeoutException, AiProviderRateLimitException, AiProviderRequestException)
export class AiProviderExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = 502;
    if (exception instanceof AiProviderNotConfiguredException) status = 503;
    else if (exception instanceof AiProviderTimeoutException) status = 504;
    else if (exception instanceof AiProviderRateLimitException) status = 429;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.name,
    });
  }
}
