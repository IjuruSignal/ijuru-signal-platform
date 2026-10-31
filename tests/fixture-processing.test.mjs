import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { aggregateVegetationFixture, compareRainfallFixture } from '../features/observations/domain/fixture-processing.mjs';

test('illustrative NDVI excludes cloud, shadow, nonvegetation, no data and zero denominator', () => {
 const result = aggregateVegetationFixture({fixture:true,pixels:[{scl:4,red:0.2,nir:0.6},{scl:4,red:0,nir:0},{scl:4,red:null,nir:0.2},{scl:3},{scl:8},{scl:5}]});
 assert.ok(Math.abs(result.mean - 0.5) < 1e-12);
 assert.equal(result.validPixels,1); assert.equal(result.totalPixels,6); assert.equal(result.validFraction,1/6);
 assert.equal(aggregateVegetationFixture({fixture:true,pixels:[{scl:8}]}).mean,null);
 assert.throws(()=>aggregateVegetationFixture({fixture:false,pixels:[{scl:4,red:0.2,nir:0.6}]}),/fixture/);
 assert.throws(()=>aggregateVegetationFixture({fixture:true,pixels:[{scl:4,red:-1,nir:0.6}]}),/reflectance/);
});

test('rainfall fixture compares matching months only when each input is complete', () => {
 const request = {fixture:true,targetMonth:'2025-03',baselineYears:[2021,2020],months:[{month:'2025-03',mm:60,coverage:1},{month:'2020-03',mm:40,coverage:1},{month:'2021-03',mm:80,coverage:1},{month:'2021-04',mm:999,coverage:1}]};
 const result = compareRainfallFixture(request);
 assert.equal(result.status,'available'); assert.equal(result.baselineMeanMm,60); assert.equal(result.differenceMm,0); assert.deepEqual(result.baselineYears,[2020,2021]);
 const incomplete = compareRainfallFixture({...request,months:request.months.filter(m=>m.month !== '2020-03')});
 assert.equal(incomplete.status,'unavailable'); assert.deepEqual(incomplete.missingMonths,['2020-03']); assert.equal('targetMm' in incomplete,false);
 assert.equal(compareRainfallFixture({...request,months:request.months.map(m=>m.month==='2020-03'?{...m,coverage:0.9}:m)}).status,'unavailable');
 assert.throws(()=>compareRainfallFixture({...request,baselineYears:[2020,2020]}),/baseline/);
 assert.throws(()=>compareRainfallFixture({...request,fixture:false}),/fixture/);
});
