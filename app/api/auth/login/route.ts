import { NextRequest, NextResponse } from 'next/server';
import { loginUser, DEMO_USERS } from '@/server/auth/session.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, role } = body;

    // Quick role switch for demo
    if (role && DEMO_USERS[role]) {
      const user = DEMO_USERS[role];
      const res = NextResponse.json({ ok: true, user });
      res.cookies.set('ijuru_demo_role', role, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600,
      });
      return res;
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await loginUser(email, password);
    if (!result) {
      return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user: result.user });
    res.cookies.set('ijuru_session', result.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 3600,
    });
    res.cookies.set('ijuru_demo_role', result.user.role, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 3600,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
