import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const seconds = 15;
const channels = 2;
const frames = sampleRate * seconds;
const samples = new Int16Array(frames * channels);

const clamp = (v) => Math.max(-1, Math.min(1, v));
const env = (t, start, length) => {
  if (t < start || t > start + length) return 0;
  const x = (t - start) / length;
  return Math.sin(Math.PI * x) ** 2;
};

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  let value = 0;
  value += Math.sin(2 * Math.PI * 55 * t) * 0.045 * (0.65 + 0.35 * Math.sin(2 * Math.PI * 0.125 * t));
  value += Math.sin(2 * Math.PI * 110 * t) * 0.018;
  for (const beat of [0.35,1.6,2.85,4.1,5.35,6.6,7.85,9.1,10.35,11.6,12.85,14.1]) {
    const e = env(t, beat, 0.24);
    value += e * (Math.sin(2 * Math.PI * 520 * t) + 0.45 * Math.sin(2 * Math.PI * 780 * t)) * 0.05;
  }
  for (const swell of [0,5,10]) {
    const e = env(t, swell, 4.7);
    value += e * Math.sin(2 * Math.PI * 220 * t) * 0.012;
  }
  const fade = Math.min(1, t / 0.35, (seconds - t) / 0.6);
  const s = Math.round(clamp(value * Math.max(0, fade)) * 32767);
  samples[i * 2] = s;
  samples[i * 2 + 1] = s;
}

const dataSize = samples.byteLength;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * 2, 28);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);
for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(samples[i], 44 + i * 2);

const out = path.resolve('public/prismbay-original.wav');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, buffer);
console.log(out);
