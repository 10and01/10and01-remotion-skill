#!/usr/bin/env node

import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const args = process.argv.slice(2);
const mediaPath = args[0];

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

if (!mediaPath || mediaPath.startsWith('--')) {
  fail('Usage: verify-render.mjs <media-file> [--require-audio] [--expect-duration <seconds>] [--tolerance <seconds>]');
}

const readNumberOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value < 0) fail(`${name} must be a non-negative number`);
  return value;
};

const requireAudio = args.includes('--require-audio');
const expectedDuration = readNumberOption('--expect-duration', null);
const tolerance = readNumberOption('--tolerance', 0.25);
const absolutePath = resolve(mediaPath);

if (!existsSync(absolutePath)) fail(`File not found: ${absolutePath}`);

const ffprobeArgs = [
  '-v', 'error',
  '-show_entries', 'format=duration,size:stream=index,codec_name,codec_type,width,height,sample_rate,channels',
  '-of', 'json',
  absolutePath,
];

const run = (command, commandArgs) =>
  spawnSync(command, commandArgs, {encoding: 'utf8', windowsHide: true});

let result = run('ffprobe', ffprobeArgs);

if (result.error?.code === 'ENOENT') {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  result = run(npx, ['remotion', 'ffprobe', ...ffprobeArgs]);
}

if (result.error) fail(result.error.message);
if (result.status !== 0) fail((result.stderr || result.stdout || 'ffprobe failed').trim());

let probe;
try {
  probe = JSON.parse(result.stdout);
} catch {
  fail('ffprobe returned invalid JSON');
}

const streams = Array.isArray(probe.streams) ? probe.streams : [];
const videoStreams = streams.filter((stream) => stream.codec_type === 'video');
const audioStreams = streams.filter((stream) => stream.codec_type === 'audio');
const duration = Number(probe.format?.duration);

if (videoStreams.length === 0) fail('No video stream found');
if (requireAudio && audioStreams.length === 0) fail('No audio stream found');
if (!Number.isFinite(duration) || duration <= 0) fail('Container duration is missing or invalid');

if (expectedDuration !== null && Math.abs(duration - expectedDuration) > tolerance) {
  fail(`Duration ${duration.toFixed(3)}s differs from expected ${expectedDuration.toFixed(3)}s by more than ${tolerance.toFixed(3)}s`);
}

const summary = {
  file: absolutePath,
  durationSeconds: duration,
  sizeBytes: Number(probe.format?.size),
  video: videoStreams.map(({codec_name, width, height}) => ({codec: codec_name, width, height})),
  audio: audioStreams.map(({codec_name, sample_rate, channels}) => ({
    codec: codec_name,
    sampleRate: Number(sample_rate),
    channels,
  })),
};

console.log(JSON.stringify(summary, null, 2));
console.log('OK: render contains the required streams and duration.');
