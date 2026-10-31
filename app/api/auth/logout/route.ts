import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('ijuru_session');
  res.cookies.delete('ijuru_demo_role');
  return res;
}
