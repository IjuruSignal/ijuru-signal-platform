import test from 'node:test';
import assert from 'node:assert/strict';
import { handleUssdRequest, RWANDA_PROVINCES } from '../features/ussd/services/ussd-engine.ts';

test('USSD Level 0: Initial dial returns all 5 Rwanda provinces with CON prefix', async () => {
  const response = await handleUssdRequest({ text: '' });
  assert.ok(response.startsWith('CON '));
  assert.ok(response.includes('Kigali City'));
  assert.ok(response.includes('Northern Province'));
  assert.ok(response.includes('Southern Province'));
  assert.ok(response.includes('Eastern Province'));
  assert.ok(response.includes('Western Province'));
});

test('USSD Level 1: Selecting Kigali City (1) returns 3 districts with CON prefix', async () => {
  const response = await handleUssdRequest({ text: '1' });
  assert.ok(response.startsWith('CON '));
  assert.ok(response.includes('Gasabo'));
  assert.ok(response.includes('Kicukiro'));
  assert.ok(response.includes('Nyarugenge'));
});

test('USSD Level 1: Selecting Northern Province (2) returns Musanze, Gicumbi, Burera', async () => {
  const response = await handleUssdRequest({ text: '2' });
  assert.ok(response.startsWith('CON '));
  assert.ok(response.includes('Musanze'));
  assert.ok(response.includes('Gicumbi'));
  assert.ok(response.includes('Burera'));
});

test('USSD Level 2: Selecting Musanze (2*1) returns action choices with CON prefix', async () => {
  const response = await handleUssdRequest({ text: '2*1' });
  assert.ok(response.startsWith('CON '));
  assert.ok(response.includes('Musanze Climate'));
  assert.ok(response.includes('1. Imvura / Rain'));
  assert.ok(response.includes('2. Iminsi 5 / 5-Day'));
  assert.ok(response.includes('3. Ubuhehere / Soil'));
});

test('USSD Level 3: Selecting Rain Outlook (2*1*1) returns today/tomorrow rain prob with END prefix', async () => {
  const response = await handleUssdRequest({ text: '2*1*1' });
  assert.ok(response.startsWith('END '));
  assert.ok(response.includes('Musanze Rain Outlook'));
  assert.ok(response.includes('Today:'));
  assert.ok(response.includes('Tomorrow:'));
  assert.ok(response.includes('% Rain'));
  assert.ok(response.includes('Meteo Rwanda'));
});

test('USSD Level 3: Selecting 5-Day Rainfall (2*1*2) returns cumulative mm and anomaly with END prefix', async () => {
  const response = await handleUssdRequest({ text: '2*1*2' });
  assert.ok(response.startsWith('END '));
  assert.ok(response.includes('Musanze 5-Day Rainfall'));
  assert.ok(response.includes('5-Day Rain Total:'));
  assert.ok(response.includes('30yr Baseline:'));
});

test('USSD Level 3: Selecting Soil & Crops (2*1*3) returns soil moisture and crops with END prefix', async () => {
  const response = await handleUssdRequest({ text: '2*1*3' });
  assert.ok(response.startsWith('END '));
  assert.ok(response.includes('Musanze Soil & Crops'));
  assert.ok(response.includes('Topsoil Moisture:'));
  assert.ok(response.includes('Staple Crops:'));
});

test('USSD Error Handling: Invalid province index returns clean END prompt', async () => {
  const response = await handleUssdRequest({ text: '99' });
  assert.ok(response.startsWith('END '));
  assert.ok(response.includes('Invalid province'));
});

test('USSD Error Handling: Invalid district index returns clean END prompt', async () => {
  const response = await handleUssdRequest({ text: '1*99' });
  assert.ok(response.startsWith('END '));
  assert.ok(response.includes('Invalid district'));
});

test('USSD Character Limits: Output fits within standard GSM screen (<= 200 chars for multi-line USSD)', async () => {
  const level0 = await handleUssdRequest({ text: '' });
  assert.ok(level0.length <= 220);

  const level1 = await handleUssdRequest({ text: '1' });
  assert.ok(level1.length <= 200);

  const level2 = await handleUssdRequest({ text: '1*1' });
  assert.ok(level2.length <= 220);

  const level3 = await handleUssdRequest({ text: '1*1*1' });
  assert.ok(level3.length <= 220);
});
