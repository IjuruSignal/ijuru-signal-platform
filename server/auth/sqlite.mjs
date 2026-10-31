import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';

// Password authentication is deliberately not connected to HTTP yet. An HTTP
// boundary must add CSRF, secure cookies, origin checks and network rate limits.
const saltBytes = 16, hashBytes = 64;
const fakeSalt = Buffer.alloc(saltBytes, 0x61);
const fakeHash = scryptSync('not-a-real-password', fakeSalt, hashBytes);
const loginPattern = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const iso = value => {
 if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error('Invalid time');
 return value.toISOString();
};
const tokenDigest = token => createHash('sha256').update(token).digest('hex');
const passwordValid = password => typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password) <= 1024;
const normalizeLogin = login => typeof login === 'string' ? login.trim().toLowerCase() : '';

// Only trusted offline provisioning or an authorized admin use case may call this.
export function setCredential(db, {userId, login, password}) {
 const name = normalizeLogin(login);
 if (!loginPattern.test(name) || !passwordValid(password)) throw new Error('Invalid credential');
 const salt = randomBytes(saltBytes), hash = scryptSync(password, salt, hashBytes);
 db.exec('BEGIN IMMEDIATE');
 try {
  if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(userId)) throw new Error('Unknown user');
  db.prepare('INSERT INTO credentials (user_id, login, password_salt, password_hash) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET login=excluded.login, password_salt=excluded.password_salt, password_hash=excluded.password_hash, failed_attempts=0, locked_until=NULL').run(userId,name,salt.toString('hex'),hash.toString('hex'));
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
  db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}

// A failed login exposes no information about whether the account exists.
// Per-account lockout supplements, but does not replace, HTTP/IP rate limiting.
export function login(db, {login: name, password, now = new Date(), ttlMs = 8 * 60 * 60 * 1000}) {
 const time = iso(now), normalized = normalizeLogin(name);
 if (!Number.isSafeInteger(ttlMs) || ttlMs < 60000 || ttlMs > 86400000) throw new Error('Invalid session lifetime');
 const row = loginPattern.test(normalized) ? db.prepare('SELECT * FROM credentials WHERE login=?').get(normalized) : undefined;
 const salt = row ? Buffer.from(row.password_salt,'hex') : fakeSalt;
 const expected = row ? Buffer.from(row.password_hash,'hex') : fakeHash;
 // Bound input to avoid an attacker making password hashing arbitrarily costly.
 const supplied = typeof password === 'string' && Buffer.byteLength(password) <= 1024 ? password : '';
 const actual = scryptSync(supplied, salt, hashBytes);
 const matched = expected.length === actual.length && timingSafeEqual(actual, expected);
 if (!row) return null;
 const token = randomBytes(32).toString('base64url');
 const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
 db.exec('BEGIN IMMEDIATE');
 try {
  // Recheck after hashing: credentials or lock status may have changed in a
  // concurrent connection. A password reset must invalidate in-flight logins.
  const current = db.prepare('SELECT * FROM credentials WHERE user_id=?').get(row.user_id);
  if (!current || current.login !== row.login || current.password_hash !== row.password_hash || current.password_salt !== row.password_salt) { db.exec('COMMIT'); return null; }
  if (!matched || (current.locked_until && current.locked_until > time)) {
   if (!current.locked_until || current.locked_until <= time) {
    const attempts = current.failed_attempts + 1;
    const lockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
    db.prepare('UPDATE credentials SET failed_attempts=?, locked_until=? WHERE user_id=?').run(lockedUntil ? 0 : attempts,lockedUntil,current.user_id);
   }
   db.exec('COMMIT'); return null;
  }
  db.prepare('UPDATE credentials SET failed_attempts=0, locked_until=NULL WHERE user_id=?').run(row.user_id);
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(tokenDigest(token),row.user_id,expiresAt,time);
  db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(),row.user_id,'session.create',row.user_id,'success',randomUUID(),time);
  db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
 return {token, expiresAt};
}
export function authenticate(db, token, now = new Date()) {
 const time = iso(now);
 if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
 const row = db.prepare('SELECT users.id, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').get(tokenDigest(token),time);
 return row ? {id:row.id, role:row.role} : null;
}
export function logout(db, token) {
 if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
 return db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenDigest(token)).changes === 1;
}

// Offline bootstrap is atomic and succeeds only when no administrator exists.
// The caller must protect access to the database and to the password input.
export function bootstrapAdmin(db, {login, password, now = new Date()}) {
 const name = normalizeLogin(login), time = iso(now);
 if (!loginPattern.test(name) || !passwordValid(password)) throw new Error('Invalid credential');
 const salt = randomBytes(saltBytes), hash = scryptSync(password, salt, hashBytes), id = randomUUID();
 db.exec('BEGIN IMMEDIATE');
 try {
  if (db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get()) throw new Error('Administrator already exists');
  db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(id,'admin',time);
  db.prepare('INSERT INTO credentials (user_id, login, password_salt, password_hash) VALUES (?, ?, ?, ?)').run(id,name,salt.toString('hex'),hash.toString('hex'));
  db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(),id,'admin.bootstrap',id,'success',randomUUID(),time);
  db.exec('COMMIT');
  return id;
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}

function requireAdminSession(db, token, now) {
 const session = authenticate(db, token, now);
 if (!session || session.role !== 'admin') throw new Error('Forbidden');
 return session;
}
function validTrace(traceId) { return typeof traceId === 'string' && traceId.length > 0 && traceId.length <= 200; }

// Administrative mutations accept a session token, not a caller-supplied role
// or user ID. The session is checked again inside the write transaction.
export function provisionUser(db, {sessionToken, login: name, password, role, traceId, now}) {
 const currentTime = () => now ?? new Date();
 const normalized = normalizeLogin(name);
 if (!['user','reviewer'].includes(role) || !loginPattern.test(normalized) || !passwordValid(password) || !validTrace(traceId)) throw new Error('Invalid input');
 requireAdminSession(db,sessionToken,currentTime());
 const salt = randomBytes(saltBytes), hash = scryptSync(password,salt,hashBytes), id = randomUUID();
 db.exec('BEGIN IMMEDIATE');
 try {
  const checkedAt = currentTime(), time = iso(checkedAt);
  const admin = requireAdminSession(db,sessionToken,checkedAt);
  db.prepare('INSERT INTO users VALUES (?,?,?)').run(id,role,time);
  db.prepare('INSERT INTO credentials (user_id,login,password_salt,password_hash) VALUES (?,?,?,?)').run(id,normalized,salt.toString('hex'),hash.toString('hex'));
  db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)').run(randomUUID(),admin.id,'user.provision',id,'success',traceId,time);
  db.exec('COMMIT'); return id;
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function changeAreaAccess(db, {sessionToken, userId, areaId, grant, traceId, now = new Date()}) {
 const time = iso(now);
 if (typeof userId !== 'string' || !userId || typeof areaId !== 'string' || !areaId || typeof grant !== 'boolean' || !validTrace(traceId)) throw new Error('Invalid input');
 db.exec('BEGIN IMMEDIATE');
 try {
  const admin = requireAdminSession(db,sessionToken,now);
  const target = db.prepare('SELECT role FROM users WHERE id=?').get(userId);
  if (!target || target.role === 'admin' || !db.prepare('SELECT 1 FROM areas WHERE id=?').get(areaId)) throw new Error('Invalid target');
  const result = grant ? db.prepare('INSERT INTO area_access VALUES (?,?) ON CONFLICT DO NOTHING').run(userId,areaId) : db.prepare('DELETE FROM area_access WHERE user_id=? AND area_id=?').run(userId,areaId);
  if (result.changes === 1) {
   const eventId = randomUUID();
   db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)').run(eventId,admin.id,grant ? 'area_access.grant' : 'area_access.revoke',userId,'success',traceId,time);
   db.prepare('INSERT INTO area_access_audit VALUES (?,?)').run(eventId,areaId);
  }
  db.exec('COMMIT'); return result.changes === 1;
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}
