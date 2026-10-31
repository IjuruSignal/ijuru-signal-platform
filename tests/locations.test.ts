import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate } from '../server/db/sqlite.ts';
import { validateBoundary } from '../features/locations/domain/boundary.ts';
import { createArea, addBoundary, selectArea, selectedArea, listAreas } from '../features/locations/repositories/sqlite.ts';
const boundary = {version:'test-1',fixture:true,sourceName:'Illustrative',sourceUrl:'https://example.com/',license:'Test only',acquiredAt:'2026-01-01T00:00:00.000Z',geometry:{type:'Polygon',coordinates:[[[30,-2],[31,-2],[31,-1],[30,-2]]]}};
test('boundary validation rejects missing provenance and malformed coordinates', () => {
 assert.deepEqual(validateBoundary(boundary),boundary);
 for (const value of [
  {...boundary,fixture:undefined}, {...boundary,license:''}, {...boundary,sourceUrl:'http://example.com/'},
  {...boundary,geometry:{type:'Polygon',coordinates:[[[30,-2],[31,-2],[31,-1],[30,-1]]]}},
  {...boundary,geometry:{type:'Polygon',coordinates:[[[181,-2],[31,-2],[31,-1],[181,-2]]]}},
  {...boundary,geometry:{type:'Point',coordinates:[30,-2]}},
 ]) assert.throws(()=>validateBoundary(value),/Invalid/);
});
test('area selection follows grants and boundary writes require administrator', () => {
 const dir = mkdtempSync(join(tmpdir(),'ijuru-area-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db); const now = '2026-01-01T00:00:00.000Z';
  for (const [id,role] of [['admin','admin'],['user','user'],['other','user']]) db.prepare('INSERT INTO users VALUES (?,?,?)').run(id,role,now);
  assert.throws(()=>createArea(db,{actorId:'user',id:'a',name:'Area',traceId:'t'}),/Forbidden/);
  createArea(db,{actorId:'admin',id:'a',name:'Area',traceId:'t'});
  assert.throws(()=>addBoundary(db,{actorId:'user',areaId:'a',boundary,traceId:'t'}),/Forbidden/);
  addBoundary(db,{actorId:'admin',areaId:'a',boundary,traceId:'t'});
  assert.throws(()=>addBoundary(db,{actorId:'admin',areaId:'a',boundary,traceId:'t'}));
  assert.deepEqual(JSON.parse(db.prepare('SELECT provenance_json FROM area_boundaries').get().provenance_json).fixture,true);
  assert.throws(()=>selectArea(db,{actorId:'user',areaId:'a'}),/Forbidden/);
  db.prepare('INSERT INTO area_access VALUES (?,?)').run('user','a');
  selectArea(db,{actorId:'user',areaId:'a'});
  assert.deepEqual(selectedArea(db,'user'),{id:'a',name:'Area'});
  assert.equal(listAreas(db,'user').length,1);
  assert.equal(listAreas(db,'other').length,0);
  db.prepare('DELETE FROM area_access WHERE user_id=? AND area_id=?').run('user','a');
  assert.equal(selectedArea(db,'user'),null);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n,2);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
