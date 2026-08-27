import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Runs the same class-validator DTO used by the module's normal create()
// endpoint against one CSV row, so import validation never drifts from the
// endpoint's own rules. Returns either the validated DTO instance or a
// single human-readable error string (constraint messages joined).
export async function validateRow<T extends object>(
  dtoClass: new () => T,
  plain: Record<string, unknown>,
): Promise<{ dto: T } | { error: string }> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length === 0) {
    return { dto: instance };
  }

  const message = errors
    .flatMap((err) => Object.values(err.constraints ?? {}))
    .join('; ');
  return { error: message || 'Invalid row' };
}
