import { createHmac } from 'node:crypto';
import { applicationPhoneKey } from './phone';
import { EMAIL_CHECK_UNAVAILABLE } from './registration-email';

export class EmailCheckError extends Error {
  constructor(public readonly status: number) { super(EMAIL_CHECK_UNAVAILABLE); }
}
export async function checkRegistrationEmail(request: Request, sourceLeadId: string, email: string, phone: string): Promise<boolean> {
  const key = process.env.ESCALAMED_FORM_INGEST_KEY;
  if (!key) throw new EmailCheckError(503);
  const endpoint = new URL('./escalamed-email', process.env.METRICS_FORM_INGEST_URL || 'https://metrics.x5med.com.br/api/endomax/integrations/escalamed-application');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const clientHash = createHmac('sha256', key).update(`escalamed-email-check:v1:${ip}`).digest('hex');
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escalamed-key': key },
      body: JSON.stringify({ sourceLeadId, email: email.trim().toLowerCase(), phone: applicationPhoneKey(phone), clientHash }),
      cache: 'no-store', signal: AbortSignal.timeout(8_000) });
    const body = await response.json() as { available?: unknown };
    if (!response.ok || typeof body.available !== 'boolean') throw new EmailCheckError(response.status === 429 ? 429 : 503);
    return body.available;
  } catch (error) { if (error instanceof EmailCheckError) throw error; throw new EmailCheckError(503); }
}
