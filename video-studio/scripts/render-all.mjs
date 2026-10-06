import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const jobs = [
  ['CreviceBrushPremium', '3-in-1-crevice-cleaning-brush-premium.mp4'],
  ['GarmentSteamerPremium', 'portable-garment-steamer-premium.mp4'],
  ['SpinScrubberPremium', '5-in-1-electric-spin-scrubber-premium.mp4'],
];

fs.mkdirSync('out', {recursive: true});
for (const [composition, file] of jobs) {
  const result = spawnSync(
    'npx',
    ['remotion', 'render', 'src/index.tsx', composition, `out/${file}`, '--codec=h264', '--crf=18', '--audio-codec=aac', '--pixel-format=yuv420p'],
    {stdio: 'inherit'}
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
