import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/server/auth/session.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email or username is required.' }, { status: 400 });
    }

    const validRole = ['user', 'reviewer', 'admin'].includes(role) ? role : 'user';
    const result = await registerUser({
      email,
      password: typeof password === 'string' && password ? password : 'demo12345678',
      role: validRole,
    });

    const res = NextResponse.json({ ok: true, user: result.user });
    res.cookies.set('ijuru_session', result.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 3600,
    });
    res.cookies.delete('ijuru_demo_role');
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Account creation failed.' },
      { status: 400 }
    );
  }
}
