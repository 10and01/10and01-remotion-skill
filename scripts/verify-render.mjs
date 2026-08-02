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
  fail('Usage: verify-render.mjs <media-file> [--require-audio|--require-audible-audio|--expect-silent] [--expect-duration <seconds>] [--tolerance <seconds>] [--expect-width <pixels>] [--expect-height <pixels>] [--expect-video-codec <codec>]');
}

const readNumberOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value < 0) fail(`${name} must be a non-negative number`);
  return value;
};

const readPositiveNumberOption = (name, fallback) => {
  const value = readNumberOption(name, fallback);
  if (value !== fallback && value <= 0) fail(`${name} must be greater than zero`);
  return value;
};

const readStringOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) fail(`${name} requires a value`);
  return value;
};

const requireAudio = args.includes('--require-audio');
const requireAudibleAudio = args.includes('--require-audible-audio');
const expectSilent = args.includes('--expect-silent');
const expectedDuration = readNumberOption('--expect-duration', null);
const tolerance = readNumberOption('--tolerance', 0.25);
const expectedWidth = readPositiveNumberOption('--expect-width', null);
const expectedHeight = readPositiveNumberOption('--expect-height', null);
const expectedVideoCodec = readStringOption('--expect-video-codec', null);
const absolutePath = resolve(mediaPath);
const silenceThresholdDb = -60;

if (requireAudibleAudio && expectSilent) {
  fail('--require-audible-audio and --expect-silent cannot be used together');
}

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
if ((requireAudio || requireAudibleAudio) && audioStreams.length === 0) fail('No audio stream found');
if (!Number.isFinite(duration) || duration <= 0) fail('Container duration is missing or invalid');

const hasExpectedVideoStream = videoStreams.some((stream) =>
  (expectedWidth === null || Number(stream.width) === expectedWidth) &&
  (expectedHeight === null || Number(stream.height) === expectedHeight) &&
  (expectedVideoCodec === null || stream.codec_name === expectedVideoCodec));

if (!hasExpectedVideoStream) {
  const expectedContract = [
    expectedVideoCodec ? `codec=${expectedVideoCodec}` : null,
    expectedWidth !== null ? `width=${expectedWidth}` : null,
    expectedHeight !== null ? `height=${expectedHeight}` : null,
  ].filter(Boolean).join(', ');
  fail(`No video stream matches the expected contract: ${expectedContract}`);
}

if (expectedDuration !== null && Math.abs(duration - expectedDuration) > tolerance) {
  fail(`Duration ${duration.toFixed(3)}s differs from expected ${expectedDuration.toFixed(3)}s by more than ${tolerance.toFixed(3)}s`);
}

let audioAnalysis = null;

if (expectSilent && audioStreams.length === 0) {
  audioAnalysis = {expectation: 'silent', streamPresent: false};
}

if ((requireAudibleAudio || expectSilent) && audioStreams.length > 0) {
  const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const ffmpegArgs = [
    '-hide_banner', '-nostats',
    '-i', absolutePath,
    '-map', '0:a:0',
    '-af', 'volumedetect',
    '-f', 'null',
    nullOutput,
  ];

  let volumeResult = run('ffmpeg', ffmpegArgs);

  if (volumeResult.error?.code === 'ENOENT') {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    volumeResult = run(npx, ['remotion', 'ffmpeg', ...ffmpegArgs]);
  }

  if (volumeResult.error) fail(volumeResult.error.message);
  if (volumeResult.status !== 0) fail((volumeResult.stderr || volumeResult.stdout || 'ffmpeg failed').trim());

  const volumeOutput = `${volumeResult.stdout}\n${volumeResult.stderr}`;
  const maxVolumeMatch = volumeOutput.match(/max_volume:\s*(-?inf|[-+]?\d+(?:\.\d+)?)\s*dB/i);
  if (!maxVolumeMatch) fail('Unable to measure audio max_volume');

  const maxVolumeDb = maxVolumeMatch[1].toLowerCase() === '-inf'
    ? Number.NEGATIVE_INFINITY
    : Number(maxVolumeMatch[1]);

  if (requireAudibleAudio && maxVolumeDb <= silenceThresholdDb) {
    fail(`Audio max_volume ${maxVolumeMatch[1]} dB is not above the audible threshold ${silenceThresholdDb} dB`);
  }

  if (expectSilent && maxVolumeDb > silenceThresholdDb) {
    fail(`Audio max_volume ${maxVolumeDb.toFixed(1)} dB exceeds the silence threshold ${silenceThresholdDb} dB`);
  }

  audioAnalysis = {
    expectation: requireAudibleAudio ? 'audible' : 'silent',
    streamPresent: true,
    maxVolumeDb: Number.isFinite(maxVolumeDb) ? maxVolumeDb : '-inf',
    thresholdDb: silenceThresholdDb,
  };
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
  ...(audioAnalysis ? {audioAnalysis} : {}),
};

console.log(JSON.stringify(summary, null, 2));
console.log('OK: render matches the requested media contract.');
