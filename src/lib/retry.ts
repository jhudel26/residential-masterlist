import { logger } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  retryableErrors?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => PromiseLike<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const backoffFactor = options.backoffFactor ?? 2;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries) {
        logger.error(`Operation failed after ${maxRetries} retries`, { attempt }, error);
        throw error;
      }

      if (options.retryableErrors && !options.retryableErrors(error)) {
        throw error;
      }

      logger.warn(`Operation failed, retrying (attempt ${attempt}/${maxRetries}) in ${delay}ms`, { attempt, delay }, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}
