import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate } from '../server/db/sqlite.mjs';
import { validateEvidence, evidenceState } from '../features/evidence/domain/record.mjs';
import { insertEvidence, getEvidenceBrief } from '../features/evidence/repositories/sqlite.mjs';

const fixture = {id:'fixture-1',areaId:'area',boundaryVersion:'v1',kind:'satellite',source:{id:'illustration',name:'Illustrative source',version:'1',url:'https://example.com/',license:'Test fixture'},observedAt:'2026-01-01T00:00:00.000Z',validUntil:'2026-01-03T00:00:00.000Z',coverage:{scope:'Illustrative district',fraction:0.65},quality:{description:'Illustrative cloud mask'},processingVersion:'test-v1',scale:'Illustrative district aggregate',summary:'Illustrative observation only.',fixture:true};

test('evidence requires source, dates, quality, coverage, scale and explicit fixture status', () => {
 assert.equal(validateEvidence({...fixture, extra:'discarded'}).extra,undefined);
 for (const record of [
  {...fixture,fixture:undefined}, {...fixture,source:{...fixture.source,license:''}},
  {...fixture,source:{...fixture.source,url:'http://example.com/'}},
  {...fixture,source:{...fixture.source,url:'https://user:pass@example.com/'}},
  {...fixture,observedAt:'2026-01-01'}, {...fixture,validUntil:fixture.observedAt},
  {...fixture,coverage:{...fixture.coverage,fraction:1.1}}, {...fixture,scale:''},
 ]) assert.throws(()=>validateEvidence(record),/Invalid/);
 assert.equal(evidenceState(fixture,new Date('2025-12-31T00:00:00Z')),'not_yet_available');
 assert.equal(evidenceState(fixture,new Date('2026-01-02T00:00:00Z')),'available');
 assert.equal(evidenceState(fixture,new Date('2026-01-03T00:00:00Z')),'stale');
});

test('SQLite evidence retains provenance and clearly returns missing and stale sources', () => {
 const dir = mkdtempSync(join(tmpdir(),'ijuru-evidence-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db); const now = new Date('2026-01-04T00:00:00Z');
  db.prepare('INSERT INTO areas (id,name,created_at) VALUES (?,?,?)').run('area','Area',now.toISOString());
  db.prepare('INSERT INTO area_boundaries VALUES (?,?,?,?,?)').run('area','v1','{}',JSON.stringify({version:'v1',fixture:true,sourceName:'Test'}),now.toISOString());
  assert.equal(getEvidenceBrief(db,'unknown',now),null);
  assert.equal(getEvidenceBrief(db,'area',now).satellite.status,'unavailable');
  insertEvidence(db,fixture,now); insertEvidence(db,fixture,now);
  assert.throws(()=>insertEvidence(db,{...fixture,summary:'changed'},now),/conflict/);
  const brief = getEvidenceBrief(db,'area',now);
  assert.equal(brief.satellite.status,'stale');
  assert.deepEqual(brief.satellite.record,fixture);
  assert.equal(brief.forecast.status,'unavailable');
  assert.equal(brief.rainfall_history.status,'unavailable');
  assert.throws(()=>insertEvidence(db,{...fixture,id:'another',areaId:'unknown'},now),/Boundary not found/);
  assert.throws(()=>insertEvidence(db,{...fixture,id:'another',fixture:false},now),/Invalid boundary provenance/);
  assert.equal(brief.satellite.boundary.version,'v1');
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('legacy records without a boundary are retained but cannot be used as evidence', () => {
 const dir = mkdtempSync(join(tmpdir(),'ijuru-legacy-evidence-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db); const now = '2026-01-04T00:00:00.000Z';
  db.prepare('INSERT INTO areas (id,name,created_at) VALUES (?,?,?)').run('area','Area',now);
  const legacy = {...fixture}; delete legacy.boundaryVersion;
  db.prepare('INSERT INTO evidence_records VALUES (?,?,?,?,?,?,?,?,?,?)').run(legacy.id,legacy.areaId,legacy.kind,legacy.source.id,legacy.source.version,legacy.observedAt,legacy.validUntil,1,JSON.stringify(legacy),now);
  assert.deepEqual(getEvidenceBrief(db,'area',new Date(now)).satellite,{status:'provenance_missing',record:null});
  assert.equal(db.prepare('SELECT count(*) AS n FROM evidence_records').get().n,1);
  assert.throws(()=>insertEvidence(db,{...fixture,id:'new'},new Date(now)),/Boundary not found/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM evidence_records').get().n,1);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
