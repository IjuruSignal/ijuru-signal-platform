import { NextResponse } from 'next/server';
import { loadConfig } from '@/server/config/index.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = loadConfig(process.env);
    const aiConfigured =
      config.ai.provider !== 'disabled' ||
      Boolean(process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY);

    return NextResponse.json({
      status: 'ok',
      database: config.db.provider,
      aiConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const dbProvider = process.env.DB_PROVIDER || 'sqlite';
    const aiConfigured = Boolean(
      process.env.OPENROUTER_API_KEY ||
        process.env.AI_API_KEY ||
        (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'disabled')
    );

    return NextResponse.json({
      status: 'ok',
      database: dbProvider,
      aiConfigured,
      timestamp: new Date().toISOString(),
      warning: err?.message,
    });
  }
}
