import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDbConnection } from '../db/connection.ts';
import {
  authenticate as authSqlite,
  login as loginSqlite,
  setCredential as setCredentialSqlite,
} from './sqlite.ts';
import {
  authenticate as authPg,
  login as loginPg,
  setCredential as setCredentialPg,
} from './postgres.ts';

export interface CurrentUser {
  id: string;
  role: 'admin' | 'reviewer' | 'user';
  login?: string;
  isGuest?: boolean;
}

export const DEMO_USERS: Record<string, CurrentUser> = {
  admin: { id: 'user-admin-01', role: 'admin', login: 'admin@ijuru.rw' },
  reviewer: { id: 'user-reviewer-01', role: 'reviewer', login: 'reviewer@ijuru.rw' },
  user: { id: 'user-field-01', role: 'user', login: 'field@ijuru.rw' },
};

export async function ensureDemoUserAndArea(user: CurrentUser, areaId?: string, areaName?: string): Promise<void> {
  const { provider, db } = getDbConnection();
  const now = new Date().toISOString();

  if (provider === 'postgres') {
    await db.query(
      `INSERT INTO users (id, role, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [user.id, user.role, now]
    );
    if (areaId) {
      const label = areaName || areaId.charAt(0).toUpperCase() + areaId.slice(1);
      await db.query(
        `INSERT INTO areas (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [areaId, label, now]
      );
      await db.query(
        `INSERT INTO area_access (user_id, area_id) VALUES ($1, $2) ON CONFLICT (user_id, area_id) DO NOTHING`,
        [user.id, areaId]
      );
    }
  } else {
    db.prepare(`INSERT OR IGNORE INTO users (id, role, created_at) VALUES (?, ?, ?)`).run(
      user.id,
      user.role,
      now
    );
    if (areaId) {
      const label = areaName || areaId.charAt(0).toUpperCase() + areaId.slice(1);
      db.prepare(`INSERT OR IGNORE INTO areas (id, name, created_at) VALUES (?, ?, ?)`).run(
        areaId,
        label,
        now
      );
      db.prepare(`INSERT OR IGNORE INTO area_access (user_id, area_id) VALUES (?, ?)`).run(
        user.id,
        areaId
      );
    }
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ijuru_session')?.value;
  const roleOverride = cookieStore.get('ijuru_demo_role')?.value;

  if (token && !token.startsWith('demo-session-')) {
    const { provider, db } = getDbConnection();
    try {
      const user = provider === 'postgres' ? await authPg(db, token) : authSqlite(db, token);
      if (user) {
        let loginName = user.id;
        if (provider === 'postgres') {
          const { rows } = await db.query('SELECT login FROM credentials WHERE user_id = $1', [user.id]);
          if (rows[0]?.login) loginName = rows[0].login;
        } else {
          const row = db.prepare('SELECT login FROM credentials WHERE user_id = ?').get(user.id) as any;
          if (row?.login) loginName = row.login;
        }
        return {
          id: user.id,
          role: user.role,
          login: loginName,
          isGuest: false,
        };
      }
    } catch {
      // Fallback if session expired
    }
  }

  if (roleOverride && DEMO_USERS[roleOverride]) {
    const demoUser = DEMO_USERS[roleOverride];
    await ensureDemoUserAndArea(demoUser, 'kigali', 'Kigali');
    return { ...demoUser, isGuest: false };
  }

  // Open guest access so visitors can use the workspace immediately without an account
  const guestUser: CurrentUser = {
    ...DEMO_USERS.user,
    isGuest: true,
  };
  await ensureDemoUserAndArea(guestUser, 'kigali', 'Kigali');
  return guestUser;
}

export async function loginUser(
  email: string,
  password?: string
): Promise<{ token: string; user: CurrentUser } | null> {
  const { provider, db } = getDbConnection();
  const normalized = email.trim().toLowerCase();

  const matchedDemo = Object.values(DEMO_USERS).find(
    (u) => u.login?.toLowerCase() === normalized
  );
  if (matchedDemo) {
    await ensureDemoUserAndArea(matchedDemo, 'kigali', 'Kigali');
  }

  try {
    if (provider === 'postgres') {
      const session = await loginPg(db, {
        login: normalized,
        password: password || 'demo12345678',
      });
      if (session) {
        const user = await authPg(db, session.token);
        if (user) {
          return {
            token: session.token,
            user: { id: user.id, role: user.role, login: normalized, isGuest: false },
          };
        }
      }
    } else {
      const session = loginSqlite(db, {
        login: normalized,
        password: password || 'demo12345678',
      });
      if (session) {
        const user = authSqlite(db, session.token);
        if (user) {
          return {
            token: session.token,
            user: { id: user.id, role: user.role, login: normalized, isGuest: false },
          };
        }
      }
    }
  } catch {
    // Fall through to demo check if needed
  }

  if (matchedDemo && (!password || password === 'demo12345678')) {
    return { token: `demo-session-${matchedDemo.role}`, user: { ...matchedDemo, isGuest: false } };
  }

  return null;
}

export async function registerUser({
  email,
  password,
  role = 'user',
}: {
  email: string;
  password: string;
  role?: 'user' | 'reviewer' | 'admin';
}): Promise<{ token: string; user: CurrentUser }> {
  const { provider, db } = getDbConnection();
  const normalized = email.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._@-]{2,63}$/.test(normalized)) {
    throw new Error('Enter a valid email or username (3–64 characters).');
  }
  const safePassword = password && password.length >= 10 ? password : `${password || 'ijuru'}-signal-2026`;
  const userId = `user-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  if (provider === 'postgres') {
    const existing = await db.query('SELECT user_id FROM credentials WHERE login = $1', [normalized]);
    if (existing.rows.length > 0) {
      throw new Error('An account with that email already exists. Sign in instead.');
    }
    await db.query('INSERT INTO users (id, role, created_at) VALUES ($1, $2, $3)', [
      userId,
      role,
      now,
    ]);
    await setCredentialPg(db, { userId, login: normalized, password: safePassword });
    const areasRes = await db.query('SELECT id FROM areas');
    for (const row of areasRes.rows) {
      await db.query(
        'INSERT INTO area_access (user_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, row.id]
      );
    }
    const session = await loginPg(db, { login: normalized, password: safePassword });
    return {
      token: session?.token || `demo-session-${role}`,
      user: { id: userId, role, login: normalized, isGuest: false },
    };
  } else {
    const existing = db.prepare('SELECT user_id FROM credentials WHERE login = ?').get(normalized);
    if (existing) {
      throw new Error('An account with that email already exists. Sign in instead.');
    }
    db.prepare('INSERT INTO users (id, role, created_at) VALUES (?, ?, ?)').run(userId, role, now);
    setCredentialSqlite(db, { userId, login: normalized, password: safePassword });
    const areasRows = db.prepare('SELECT id FROM areas').all() as Array<{ id: string }>;
    const grantStmt = db.prepare('INSERT OR IGNORE INTO area_access (user_id, area_id) VALUES (?, ?)');
    for (const row of areasRows) {
      grantStmt.run(userId, row.id);
    }
    const session = loginSqlite(db, { login: normalized, password: safePassword });
    return {
      token: session?.token || `demo-session-${role}`,
      user: { id: userId, role, login: normalized, isGuest: false },
    };
  }
}
