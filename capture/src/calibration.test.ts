import { expect, test } from 'vitest';
import { createCalibration } from './calibration.js';
import type { Landmark } from './classifier.js';

function frame(wristY = 0.65, tilt = 0, width = 0.18): Landmark[] {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.1, z: 0, visibility: 1 }));
  landmarks[11] = { x: 0.5 - width / 2, y: 0.4 + tilt * width / 2, z: 0, visibility: 1 };
  landmarks[12] = { x: 0.5 + width / 2, y: 0.4 - tilt * width / 2, z: 0, visibility: 1 };
  landmarks[15] = { ...landmarks[11]!, y: wristY };
  landmarks[16] = { ...landmarks[12]!, y: wristY };
  return landmarks;
}

test('calibrates two 3-second holds, midpoint guard, and both sustained leans', () => {
  const calibration = createCalibration();
  calibration.start('standing', 0);
  for (let at = 0; at <= 3000; at += 100) calibration.update(frame(), at);
  expect(calibration.snapshot.stage).toBe('guard');
  for (let at = 3100; at <= 6100; at += 100) calibration.update(frame(0.25), at);
  expect(calibration.snapshot.guardThreshold).toBeCloseTo(((0.4 - 0.65) / 0.18 + (0.4 - 0.25) / 0.18) / 2);
  expect(calibration.snapshot.stage).toBe('lean-left');
  calibration.update(frame(0.35, 0.6), 6200);
  calibration.update(frame(0.35, 0.6), 6300);
  expect(calibration.snapshot.ready).toBe(false);
  calibration.update(frame(0.35, 0.6), 6400);
  expect(calibration.snapshot.stage).toBe('lean-right');
  for (let at = 6500; at <= 6700; at += 100) calibration.update(frame(0.35, -0.6), at);
  expect(calibration.snapshot.ready).toBe(true);
});

test('seated calibration rejects close framing and resets thresholds for a new posture', () => {
  const calibration = createCalibration();
  calibration.start('seated', 0);
  for (let at = 0; at <= 4000; at += 100) calibration.update(frame(0.65, 0, 0.25), at);
  expect(calibration.snapshot.stage).toBe('neutral');
  expect(calibration.snapshot.message).toContain('20%');
  expect(calibration.snapshot.progress).toBe(0);
  calibration.start('standing', 5000);
  expect(calibration.snapshot.guardThreshold).toBeNull();
  expect(calibration.snapshot.ready).toBe(false);
});

test('missing head or a paused camera cannot complete a hold', () => {
  const calibration = createCalibration();
  calibration.start('standing', 0);
  calibration.update(frame(), 0);
  calibration.update(frame(), 3000);
  expect(calibration.snapshot.stage).toBe('neutral');
  expect(calibration.snapshot.progress).toBe(0);
  const hiddenHead = frame(); hiddenHead[0]!.visibility = 0;
  calibration.update(hiddenHead, 3100);
  expect(calibration.snapshot.message).toContain('head');
  expect(calibration.snapshot.progress).toBe(0);
});

test('lean confirmation uses the same raised-arm gate as runtime and accepts relaxed hanging arms', () => {
  const calibration=createCalibration();
  calibration.start('standing',0);
  for(let at=0;at<=3000;at+=100)calibration.update(frame(),at);
  for(let at=3100;at<=6100;at+=100)calibration.update(frame(.25),at);
  expect(calibration.snapshot.stage).toBe('lean-left');
  for(let at=6200;at<=6400;at+=100)calibration.update(frame(.85,.7),at);
  expect(calibration.snapshot.stage).toBe('lean-right');
  for(let at=6500;at<=6700;at+=100)calibration.update(frame(.85,-.7),at);
  expect(calibration.snapshot.ready).toBe(true);
});
