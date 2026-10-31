import { cookies } from 'next/headers';
import { getDbConnection } from '../db/connection.ts';
import { authenticate as authSqlite, login as loginSqlite } from './sqlite.ts';
import { authenticate as authPg, login as loginPg } from './postgres.ts';

export interface CurrentUser {
  id: string;
  role: 'admin' | 'reviewer' | 'user';
  login?: string;
}

export const DEMO_USERS: Record<string, CurrentUser> = {
  admin: { id: 'user-admin-01', role: 'admin', login: 'admin@ijuru.rw' },
  reviewer: { id: 'user-reviewer-01', role: 'reviewer', login: 'reviewer@ijuru.rw' },
  user: { id: 'user-field-01', role: 'user', login: 'field@ijuru.rw' },
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ijuru_session')?.value;
  const roleOverride = cookieStore.get('ijuru_demo_role')?.value;

  // If demo role override is set, honor it immediately for effortless role switching
  if (roleOverride && DEMO_USERS[roleOverride]) {
    return DEMO_USERS[roleOverride];
  }

  if (token) {
    const { provider, db } = getDbConnection();
    try {
      const user = provider === 'postgres' ? await authPg(db, token) : authSqlite(db, token);
      if (user) {
        return {
          id: user.id,
          role: user.role,
        };
      }
    } catch {
      // Fallback on token error
    }
  }

  // Default to field user so visitors can immediately see the workspace
  return DEMO_USERS.user;
}

export async function loginUser(email: string, password?: string): Promise<{ token: string; user: CurrentUser } | null> {
  const { provider, db } = getDbConnection();
  const normalized = email.trim().toLowerCase();

  // Quick fallback check for demo convenience
  const matchedDemo = Object.values(DEMO_USERS).find((u) => u.login?.toLowerCase() === normalized);

  if (provider === 'postgres') {
    const session = await loginPg(db, { login: normalized, password: password || 'demo12345678' });
    if (session) {
      const user = await authPg(db, session.token);
      if (user) return { token: session.token, user: { id: user.id, role: user.role, login: normalized } };
    }
  } else {
    const session = loginSqlite(db, { login: normalized, password: password || 'demo12345678' });
    if (session) {
      const user = authSqlite(db, session.token);
      if (user) return { token: session.token, user: { id: user.id, role: user.role, login: normalized } };
    }
  }

  if (matchedDemo) {
    return { token: `demo-session-${matchedDemo.role}`, user: matchedDemo };
  }

  return null;
}
