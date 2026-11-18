import { NextResponse } from 'next/server';
import { checkRegistrationEmail, EmailCheckError } from '@/lib/registration-email.server';
import { EMAIL_CHECK_UNAVAILABLE } from '@/lib/registration-email';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403, headers });
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length') || 0) > 2048) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400, headers });
    const reader = request.body?.getReader(); if (!reader) throw new Error('invalid');
    const chunks: Uint8Array[] = []; let length = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > 2048) { await reader.cancel(); return NextResponse.json({ error: 'Dados inválidos.' }, { status: 413, headers }); } chunks.push(part.value); } }
    finally { reader.releaseLock(); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof body?.sourceLeadId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sourceLeadId)
      || typeof body.email !== 'string' || body.email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
      || typeof body.phone !== 'string' || body.phone.length > 40) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400, headers });
    return NextResponse.json({ available: await checkRegistrationEmail(request, body.sourceLeadId, body.email, body.phone) }, { headers });
  } catch (error) { return NextResponse.json({ error: EMAIL_CHECK_UNAVAILABLE }, { status: error instanceof EmailCheckError ? error.status : 503, headers }); }
}
