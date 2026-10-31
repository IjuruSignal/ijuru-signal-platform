import { NextRequest } from 'next/server';
import { handleUssdRequest } from '@/features/ussd/services/ussd-engine.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Africa's Talking USSD Webhook Handler.
 * Africa's Talking sends POST requests with:
 * - sessionId
 * - serviceCode
 * - phoneNumber
 * - text
 *
 * We respond with:
 * - CON <message> to continue session
 * - END <message> to complete session
 */
export async function POST(req: NextRequest) {
  try {
    let sessionId = '';
    let serviceCode = '';
    let phoneNumber = '';
    let text = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      sessionId = String(formData.get('sessionId') || '');
      serviceCode = String(formData.get('serviceCode') || '');
      phoneNumber = String(formData.get('phoneNumber') || '');
      text = String(formData.get('text') || '');
    } else if (contentType.includes('application/json')) {
      const json = await req.json();
      sessionId = String(json.sessionId || '');
      serviceCode = String(json.serviceCode || '');
      phoneNumber = String(json.phoneNumber || '');
      text = String(json.text || '');
    } else {
      // Fallback: parse raw text as urlencoded
      const rawText = await req.text();
      const params = new URLSearchParams(rawText);
      sessionId = params.get('sessionId') || '';
      serviceCode = params.get('serviceCode') || '';
      phoneNumber = params.get('phoneNumber') || '';
      text = params.get('text') || '';
    }

    const responseText = await handleUssdRequest({
      sessionId,
      serviceCode,
      phoneNumber,
      text,
    });

    return new Response(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('USSD Error:', error);
    return new Response('END Habaye ikosa, ongera ugerageze / System error, please try again.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * GET Handler for quick testing via browser or curl.
 * Example: /api/ussd?text=1*1
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || '';
    const phoneNumber = searchParams.get('phoneNumber') || '+250788000000';
    const sessionId = searchParams.get('sessionId') || 'test-session';
    const serviceCode = searchParams.get('serviceCode') || '*384*414#';

    const responseText = await handleUssdRequest({
      sessionId,
      serviceCode,
      phoneNumber,
      text,
    });

    return new Response(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (error: any) {
    return new Response(`END Error: ${error.message}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
