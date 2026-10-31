import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateBrief } from '../server/ai/validate-brief.ts';
test('brief rejects unknown citations, stale evidence and unsupported numbers', () => {
 const evidence = [{id:'s1',text:'Rainfall was 12 mm.',reviewed:true,validUntil:'2027-01-01T00:00:00Z'}];
 const now = new Date('2026-01-01T00:00:00Z');
 assert.equal(validateBrief({statements:[{text:'Rainfall was 12 mm.',sourceIds:['s1']}]},evidence,now).status,'needs_review');
 for (const statement of [{text:'Rainfall was 13 mm.',sourceIds:['s1']},{text:'Rainfall was 12 mm.',sourceIds:['unknown']}]) assert.equal(validateBrief({statements:[statement]},evidence,now).status,'abstained');
 assert.equal(validateBrief({statements:[{text:'Rainfall was 12 mm.',sourceIds:['s1']}]},evidence,new Date('2028-01-01')).status,'abstained');
});

test('brief suppresses the entire batch on invalid statements and rejects ambiguous evidence', () => {
 const now = new Date('2026-01-01T00:00:00Z');
 const evidence = [{id:'s',text:'Temperature was -12.5 degrees.',reviewed:true,validUntil:'2027-01-01T00:00:00Z'}];
 const good = {text:'Temperature was -12.5 degrees.',sourceIds:['s']};
 for (const bad of [
  {text:'Temperature was 12.5 degrees.',sourceIds:['s']},
  {text:'Temperature was -12 degrees.',sourceIds:['s']},
  {text:'Temperature was -12.5 degrees.',sourceIds:['missing']},
 ]) assert.deepEqual(validateBrief({statements:[good,bad]},evidence,now),{status:'abstained',statements:[]});
 assert.deepEqual(validateBrief({statements:[good]},[...evidence,evidence[0]],now),{status:'abstained',statements:[]});
 assert.deepEqual(validateBrief({statements:[good]},evidence,new Date('invalid')),{status:'abstained',statements:[]});
 assert.equal(validateBrief({statements:[good]},evidence,now).status,'needs_review');
});
