import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { withTransaction } from '../db/postgres.mjs';

const saltBytes = 16, hashBytes = 64;
const fakeSalt = Buffer.alloc(saltBytes, 0x61);
const fakeHash = scryptSync('not-a-real-password', fakeSalt, hashBytes);
const loginPattern = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const iso = (value) => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error('Invalid time');
  return value.toISOString();
};
const tokenDigest = (token) => createHash('sha256').update(token).digest('hex');
const passwordValid = (password) => typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password) <= 1024;
const normalizeLogin = (login) => (typeof login === 'string' ? login.trim().toLowerCase() : '');
const validTrace = (traceId) => typeof traceId === 'string' && traceId.length > 0 && traceId.length <= 200;

export async function setCredential(poolOrClient, { userId, login, password }) {
  const name = normalizeLogin(login);
  if (!loginPattern.test(name) || !passwordValid(password)) throw new Error('Invalid credential');
  const salt = randomBytes(saltBytes), hash = scryptSync(password, salt, hashBytes);

  return withTransaction(poolOrClient, async (client) => {
    const { rows: userRows } = await client.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    if (userRows.length === 0) throw new Error('Unknown user');

    await client.query(
      `INSERT INTO credentials (user_id, login, password_salt, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         login = EXCLUDED.login,
         password_salt = EXCLUDED.password_salt,
         password_hash = EXCLUDED.password_hash,
         failed_attempts = 0,
         locked_until = NULL`,
      [userId, name, salt.toString('hex'), hash.toString('hex')]
    );
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  });
}

export async function login(poolOrClient, { login: name, password, now = new Date(), ttlMs = 8 * 60 * 60 * 1000 }) {
  const time = iso(now), normalized = normalizeLogin(name);
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 60000 || ttlMs > 86400000) throw new Error('Invalid session lifetime');

  return withTransaction(poolOrClient, async (client) => {
    let row;
    if (loginPattern.test(normalized)) {
      const { rows } = await client.query('SELECT * FROM credentials WHERE login = $1', [normalized]);
      row = rows[0];
    }

    const salt = row ? Buffer.from(row.password_salt, 'hex') : fakeSalt;
    const expected = row ? Buffer.from(row.password_hash, 'hex') : fakeHash;
    const supplied = typeof password === 'string' && Buffer.byteLength(password) <= 1024 ? password : '';
    const actual = scryptSync(supplied, salt, hashBytes);
    const matched = expected.length === actual.length && timingSafeEqual(actual, expected);

    if (!row) return null;

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

    const { rows: currentRows } = await client.query('SELECT * FROM credentials WHERE user_id = $1', [row.user_id]);
    const current = currentRows[0];
    if (!current || current.login !== row.login || current.password_hash !== row.password_hash || current.password_salt !== row.password_salt) {
      return null;
    }

    if (!matched || (current.locked_until && current.locked_until > time)) {
      if (!current.locked_until || current.locked_until <= time) {
        const attempts = current.failed_attempts + 1;
        const lockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
        await client.query(
          'UPDATE credentials SET failed_attempts = $1, locked_until = $2 WHERE user_id = $3',
          [lockedUntil ? 0 : attempts, lockedUntil, current.user_id]
        );
      }
      return null;
    }

    await client.query('UPDATE credentials SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1', [row.user_id]);
    await client.query('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)', [
      tokenDigest(token),
      row.user_id,
      expiresAt,
      time,
    ]);
    await client.query(
      'INSERT INTO audit_events (id, actor_id, action, object_id, outcome, trace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [randomUUID(), row.user_id, 'session.create', row.user_id, 'success', randomUUID(), time]
    );

    return { token, expiresAt };
  });
}

export async function authenticate(poolOrClient, token, now = new Date()) {
  const time = iso(now);
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const { rows } = await poolOrClient.query(
    `SELECT users.id, users.role
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > $2`,
    [tokenDigest(token), time]
  );
  return rows[0] || null;
}

export async function logout(poolOrClient, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const result = await poolOrClient.query('DELETE FROM sessions WHERE token_hash = $1', [tokenDigest(token)]);
  return result.rowCount > 0;
}

export async function bootstrapAdmin(poolOrClient, { login: name, password, now = new Date() }) {
  const time = iso(now);
  return withTransaction(poolOrClient, async (client) => {
    const { rows: adminRows } = await client.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (adminRows.length > 0) throw new Error('An administrator already exists');

    const id = randomUUID();
    await client.query('INSERT INTO users (id, role, created_at) VALUES ($1, $2, $3)', [id, 'admin', time]);
    await setCredential(client, { userId: id, login: name, password });
    await client.query(
      'INSERT INTO audit_events (id, actor_id, action, object_id, outcome, trace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [randomUUID(), id, 'admin.bootstrap', id, 'success', randomUUID(), time]
    );
    return id;
  });
}

async function requireAdminSession(client, token, now) {
  const session = await authenticate(client, token, now);
  if (!session || session.role !== 'admin') throw new Error('Forbidden');
  return session;
}

export async function provisionUser(poolOrClient, { sessionToken, login: name, password, role, traceId, now }) {
  const currentTime = () => now ?? new Date();
  const normalized = normalizeLogin(name);
  if (!['user', 'reviewer'].includes(role) || !loginPattern.test(normalized) || !passwordValid(password) || !validTrace(traceId)) {
    throw new Error('Invalid input');
  }

  const salt = randomBytes(saltBytes), hash = scryptSync(password, salt, hashBytes), id = randomUUID();

  return withTransaction(poolOrClient, async (client) => {
    const checkedAt = currentTime(), time = iso(checkedAt);
    const admin = await requireAdminSession(client, sessionToken, checkedAt);

    await client.query('INSERT INTO users (id, role, created_at) VALUES ($1, $2, $3)', [id, role, time]);
    await client.query(
      'INSERT INTO credentials (user_id, login, password_salt, password_hash) VALUES ($1, $2, $3, $4)',
      [id, normalized, salt.toString('hex'), hash.toString('hex')]
    );
    await client.query(
      'INSERT INTO audit_events (id, actor_id, action, object_id, outcome, trace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [randomUUID(), admin.id, 'user.provision', id, 'success', traceId, time]
    );
    return id;
  });
}

export async function changeAreaAccess(poolOrClient, { sessionToken, userId, areaId, grant, traceId, now = new Date() }) {
  const time = iso(now);
  if (typeof userId !== 'string' || !userId || typeof areaId !== 'string' || !areaId || typeof grant !== 'boolean' || !validTrace(traceId)) {
    throw new Error('Invalid input');
  }

  return withTransaction(poolOrClient, async (client) => {
    const admin = await requireAdminSession(client, sessionToken, now);
    const { rows: targetRows } = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
    const target = targetRows[0];
    if (!target || target.role === 'admin') throw new Error('Invalid target');

    const { rows: areaRows } = await client.query('SELECT 1 FROM areas WHERE id = $1', [areaId]);
    if (areaRows.length === 0) throw new Error('Invalid target');

    const result = grant
      ? await client.query('INSERT INTO area_access (user_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, areaId])
      : await client.query('DELETE FROM area_access WHERE user_id = $1 AND area_id = $2', [userId, areaId]);

    if (result.rowCount === 1) {
      const eventId = randomUUID();
      await client.query(
        'INSERT INTO audit_events (id, actor_id, action, object_id, outcome, trace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [eventId, admin.id, grant ? 'area_access.grant' : 'area_access.revoke', userId, 'success', traceId, time]
      );
      await client.query('INSERT INTO area_access_audit (event_id, area_id) VALUES ($1, $2)', [eventId, areaId]);
    }
    return result.rowCount === 1;
  });
}
