import type { ReasonCode } from './models.js';

const messages: Record<ReasonCode, string> = {
  missing_credentials: 'No supported local credentials found. Sign in using the provider CLI.',
  invalid_credentials: 'Local credentials are malformed or expired. Sign in using the provider CLI.',
  credential_read_error: 'Could not read the local credential store. Check its permissions and format.',
  unauthorized: 'The provider rejected these credentials. Sign in using the provider CLI.',
  timeout: 'The provider did not respond before the deadline.',
  rate_limited: 'The provider is rate limiting usage requests. Try again after the cache expires.',
  http_error: 'The provider usage endpoint returned an HTTP error.',
  invalid_response: 'The provider returned an unrecognized or malformed usage response.',
  provider_error: 'The provider could not report usage.',
};

/** Only fixed messages reach output; errors may otherwise contain credentials. */
export class UsageError extends Error {
  constructor(readonly code: ReasonCode) { super(messages[code]); }
}
export function safeReason(error: unknown): { code: ReasonCode; message: string } {
  const code = error instanceof UsageError && Object.hasOwn(messages, error.code) ? error.code : 'provider_error';
  return { code, message: messages[code] };
}
