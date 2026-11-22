import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNews2 } from '../lib/news2Engine.js';

const base = { resp_rate: 16, spo2: 97, on_oxygen: false, systolic_bp: 120, heart_rate: 70, temp: 37.0, consciousness: 'A' };
const n = (o, s = 1) => computeNews2({ ...base, ...o }, s);

test('normal vitals -> 0, Low', () => {
  const a = n({});
  assert.equal(a.totalScore, 0); assert.equal(a.riskLevel, 'Low'); assert.equal(a.monitoringFreq, 'Minimum every 12 hours');
});
test('theoretical maximum is 20', () => {
  const a = n({ resp_rate: 30, spo2: 85, on_oxygen: true, systolic_bp: 80, heart_rate: 140, temp: 34, consciousness: 'U' });
  assert.equal(a.totalScore, 20); assert.equal(a.riskLevel, 'High');
});
test('single +3 red flag with low total -> Medium label, low_medium tier', () => {
  const a = n({ resp_rate: 8 });
  assert.equal(a.totalScore, 3); assert.equal(a.singleRedFlag, true);
  assert.equal(a.riskTier, 'low_medium'); assert.equal(a.riskLevel, 'Medium'); assert.deepEqual(a.redFlags, ['resp_rate']);
});
test('boundaries: total 4 low, 5 medium, 7 high', () => {
  assert.equal(n({ resp_rate: 22, systolic_bp: 105, heart_rate: 95, temp: 38.5 }).totalScore, 5); // 2+1+1+1
  assert.equal(n({ resp_rate: 22, systolic_bp: 105, heart_rate: 95, temp: 38.5 }).riskLevel, 'Medium');
  assert.equal(n({ resp_rate: 22, systolic_bp: 105, heart_rate: 95 }).riskLevel, 'Low');
  assert.equal(n({ resp_rate: 22, systolic_bp: 105, heart_rate: 95, temp: 38.5, on_oxygen: true, spo2: 94 }).riskTier, 'high'); // 2+1+1+1+2+1=8
});
test('each parameter band edges', () => {
  assert.equal(n({ resp_rate: 11 }).breakdown.resp_rate, 1);
  assert.equal(n({ resp_rate: 12 }).breakdown.resp_rate, 0);
  assert.equal(n({ resp_rate: 21 }).breakdown.resp_rate, 2);
  assert.equal(n({ resp_rate: 25 }).breakdown.resp_rate, 3);
  assert.equal(n({ systolic_bp: 220 }).breakdown.systolic_bp, 3);
  assert.equal(n({ systolic_bp: 111 }).breakdown.systolic_bp, 0);
  assert.equal(n({ heart_rate: 50 }).breakdown.heart_rate, 1);
  assert.equal(n({ heart_rate: 131 }).breakdown.heart_rate, 3);
  assert.equal(n({ temp: 35.1 }).breakdown.temp, 1);
  assert.equal(n({ temp: 39.1 }).breakdown.temp, 2);
  assert.equal(n({ consciousness: 'C' }).breakdown.consciousness, 3);
});
test('SpO2 Scale 1 vs Scale 2', () => {
  assert.equal(n({ spo2: 91 }).breakdown.spo2, 3);
  assert.equal(n({ spo2: 94 }).breakdown.spo2, 1);
  assert.equal(n({ spo2: 90 }, 2).breakdown.spo2, 0);           // 88-92 = 0
  assert.equal(n({ spo2: 95, on_oxygen: false }, 2).breakdown.spo2, 0); // >=93 on air
  assert.equal(n({ spo2: 93, on_oxygen: true }, 2).breakdown.spo2, 1);
  assert.equal(n({ spo2: 95, on_oxygen: true }, 2).breakdown.spo2, 2);
  assert.equal(n({ spo2: 97, on_oxygen: true }, 2).breakdown.spo2, 3);
  assert.equal(n({ spo2: 86 }, 2).breakdown.spo2, 1);
  assert.equal(n({ spo2: 83 }, 2).breakdown.spo2, 3);
});
test('qSOFA needs >=2 criteria', () => {
  assert.equal(n({ resp_rate: 22, systolic_bp: 100 }).sepsisAlert, true);
  assert.equal(n({ resp_rate: 21, systolic_bp: 101 }).sepsisAlert, false);
  assert.equal(n({ consciousness: 'V', systolic_bp: 95 }).qsofaScore, 2);
  assert.equal(n({ resp_rate: 22 }).sepsisAlert, false);
});
