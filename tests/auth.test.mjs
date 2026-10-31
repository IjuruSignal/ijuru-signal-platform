import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate } from '../server/db/sqlite.mjs';
import { setCredential, login, authenticate, logout } from '../server/auth/sqlite.mjs';

test('password sessions are hashed, expire, revoke and lock after repeated failures', () => {
 const dir = mkdtempSync(join(tmpdir(),'ijuru-auth-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db);
  const now = new Date('2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO users VALUES (?, ?, ?)').run('u','reviewer',now.toISOString());
  assert.throws(()=>setCredential(db,{userId:'u',login:'reviewer',password:'short'}),/Invalid/);
  setCredential(db,{userId:'u',login:'Reviewer',password:'a long passphrase'});
  assert.equal(login(db,{login:'missing',password:'a long passphrase',now}),null);
  for (let i=0;i<5;i++) assert.equal(login(db,{login:'reviewer',password:'wrong',now}),null);
  assert.equal(login(db,{login:'reviewer',password:'a long passphrase',now}),null);
  const later = new Date('2026-01-01T00:16:00.000Z');
  const session = login(db,{login:'REVIEWER',password:'a long passphrase',now:later,ttlMs:60000});
  assert.deepEqual(authenticate(db,session.token,later),{id:'u',role:'reviewer'});
  assert.notEqual(db.prepare('SELECT token_hash FROM sessions').get().token_hash,session.token);
  assert.equal(authenticate(db,session.token,new Date('2026-01-01T00:17:00.000Z')),null);
  assert.equal(logout(db,session.token),true);
  assert.equal(authenticate(db,session.token,later),null);
  const another = login(db,{login:'reviewer',password:'a long passphrase',now:later});
  setCredential(db,{userId:'u',login:'reviewer',password:'another secure passphrase'});
  assert.equal(authenticate(db,another.token,later),null);
  assert.equal(login(db,{login:'reviewer',password:'a long passphrase',now:later}),null);
  assert.ok(login(db,{login:'reviewer',password:'another secure passphrase',now:later}));
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events WHERE action=?').get('session.create').n,3);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('administrator bootstrap is atomic and cannot replace an existing admin', async () => {
 const { bootstrapAdmin } = await import('../server/auth/sqlite.mjs');
 const dir = mkdtempSync(join(tmpdir(),'ijuru-bootstrap-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db); const now = new Date('2026-01-01T00:00:00.000Z');
  assert.throws(()=>bootstrapAdmin(db,{login:'admin',password:'short',now}),/Invalid/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,0);
  const id = bootstrapAdmin(db,{login:'admin',password:'a strong passphrase',now});
  const session = login(db,{login:'admin',password:'a strong passphrase',now});
  assert.deepEqual(authenticate(db,session.token,now),{id,role:'admin'});
  assert.throws(()=>bootstrapAdmin(db,{login:'other',password:'another passphrase',now}),/already exists/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM audit_events WHERE action='admin.bootstrap'").get().n,1);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('bootstrap command reads stdin, does not expose password and refuses a second admin', async () => {
 const { spawnSync } = await import('node:child_process');
 const dir = mkdtempSync(join(tmpdir(),'ijuru-cli-')); const path = join(dir,'db.sqlite');
 const db = openDatabase(path); migrate(db); db.close();
 try {
  const secret = 'a private test phrase';
  const invoke = () => spawnSync(process.execPath,['scripts/bootstrap-admin.mjs','first-admin'],{cwd:process.cwd(),env:{...process.env,DB_PROVIDER:'sqlite',SQLITE_PATH:path},input:secret+'\n',encoding:'utf8'});
  const first = invoke();
  assert.equal(first.status,0,first.stderr);
  assert.doesNotMatch(first.stdout + first.stderr,/a private test phrase/);
  const second = invoke();
  assert.notEqual(second.status,0);
  assert.doesNotMatch(second.stdout + second.stderr,/a private test phrase/);
  const check = openDatabase(path);
  try { assert.equal(check.prepare("SELECT count(*) AS n FROM users WHERE role='admin'").get().n,1); }
  finally { check.close(); }
 } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('admin sessions provision scoped users and revocation removes their area access', async () => {
 const { bootstrapAdmin, provisionUser, changeAreaAccess } = await import('../server/auth/sqlite.mjs');
 const { selectArea, selectedArea } = await import('../features/locations/repositories/sqlite.mjs');
 const dir = mkdtempSync(join(tmpdir(),'ijuru-provision-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db); const now = new Date('2026-01-01T00:00:00.000Z');
  const adminId = bootstrapAdmin(db,{login:'admin',password:'admin passphrase',now});
  const session = login(db,{login:'admin',password:'admin passphrase',now});
  db.prepare('INSERT INTO areas (id,name,created_at) VALUES (?,?,?)').run('area','Area',now.toISOString());
  const options = {sessionToken:session.token,login:'reviewer',password:'reviewer passphrase',role:'reviewer',traceId:'trace',now};
  assert.throws(()=>provisionUser(db,{...options,sessionToken:'invalid'}),/Forbidden/);
  assert.throws(()=>provisionUser(db,{...options,role:'admin'}),/Invalid/);
  const userId = provisionUser(db,options);
  assert.throws(()=>provisionUser(db,options));
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,2);
  const userSession = login(db,{login:'reviewer',password:'reviewer passphrase',now});
  assert.deepEqual(authenticate(db,userSession.token,now),{id:userId,role:'reviewer'});
  assert.throws(()=>changeAreaAccess(db,{sessionToken:userSession.token,userId,areaId:'area',grant:true,traceId:'trace',now}),/Forbidden/);
  assert.throws(()=>changeAreaAccess(db,{sessionToken:session.token,userId:adminId,areaId:'area',grant:true,traceId:'trace',now}),/Invalid target/);
  const access = {sessionToken:session.token,userId,areaId:'area',traceId:'trace',now};
  assert.equal(changeAreaAccess(db,{...access,grant:true}),true);
  assert.equal(changeAreaAccess(db,{...access,grant:true}),false);
  selectArea(db,{actorId:userId,areaId:'area'});
  assert.equal(selectedArea(db,userId).id,'area');
  assert.equal(changeAreaAccess(db,{...access,grant:false}),true);
  assert.equal(selectedArea(db,userId),null);
  logout(db,session.token);
  assert.throws(()=>changeAreaAccess(db,{...access,grant:true}),/Forbidden/);
  assert.equal(db.prepare("SELECT count(*) AS n FROM audit_events WHERE action IN ('user.provision','area_access.grant','area_access.revoke')").get().n,3);
  assert.equal(db.prepare('SELECT count(*) AS n FROM area_access_audit WHERE area_id=?').get('area').n,2);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
