# Rendering, asset loading, and audio

## Contents

- [Load assets with Remotion components](#load-assets-with-remotion-components)
- [Avoid leaked delayRender handles](#avoid-leaked-delayrender-handles)
- [Cover the complete timeline with audio](#cover-the-complete-timeline-with-audio)
- [Select an excerpt from a long track](#select-an-excerpt-from-a-long-track)
- [Classify render failures correctly](#classify-render-failures-correctly)
- [Verify the final container](#verify-the-final-container)

## Load assets with Remotion components

Place local assets in `public/` and reference them with `staticFile()`. Use Remotion's `Img` for images and the media components available in the installed version for audio and video. These components participate in Remotion's render lifecycle and prevent blank or flickering exports.

Do not manually preload an ordinary image with `new Image()` when `Img` solves the requirement.

## Avoid leaked delayRender handles

Never write this pattern:

```tsx
const handleRef = useRef(delayRender('asset'));
```

Function arguments are evaluated on every render, so repeated renders can create handles that are never cleared even though `useRef` keeps only the first value. Prefer `Img` or the appropriate media component.

If custom asynchronous work genuinely requires a render handle, create it once per mount and call `continueRender(handle)` on every success and error path. Include cancellation handling for unmounts. Diagnose an uncleared handle before increasing the timeout.

## Cover the complete timeline with audio

Use an audio track whose duration reaches the end, loop intentionally, or trim intentionally. Create a gentle volume envelope:

```tsx
const volume = (audioFrame: number) =>
  interpolate(
    audioFrame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, bedVolume, bedVolume, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
```

The frame supplied to an audio volume callback is local to the audio element. Keep background music conservative when speech is present. Listen to the rendered output because preview playback and server-side media behavior can differ.

## Select an excerpt from a long track

Do not copy an entire user-provided song into the project when the composition needs only a short background bed. Keep project assets small and make the selected interval explicit.

Use system `ffmpeg` and `ffprobe` when available. Some newer Remotion CLIs expose equivalent `npx remotion ffmpeg` and `npx remotion ffprobe` wrappers, but older releases do not; inspect `npx remotion --help` before relying on wrappers.

1. Inspect duration, codec, sample rate, and channels:

```bash
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,sample_rate,channels \
  -of default=noprint_wrappers=1 input.mp3
```

2. Measure loudness in JSON mode, then use its `input_thresh` value to detect leading or trailing silence:

```bash
ffmpeg -i input.mp3 -map 0:a \
  -af loudnorm=print_format=json -f null -

ffmpeg -i input.mp3 -map 0:a \
  -af "silencedetect=noise=<input_thresh>dB:d=0.5" -f null -
```

3. Compare candidate windows with `-ss <start> -t <duration>` and loudness measurement. Prefer the beginning when it has no leading silence and is already stable. Otherwise preview candidate boundaries and choose the start of a phrase, section, or beat. Silence and loudness analysis cannot identify musical structure by itself.

4. Re-encode only the selected interval for accurate compressed-audio boundaries, strip inherited metadata, and save it under `public/audio/`:

```bash
ffmpeg -i input.mp3 -ss <start-seconds> -t <duration-seconds> \
  -map_metadata -1 -c:a libmp3lame -b:a 192k \
  public/audio/background-excerpt.mp3
```

Use a filesystem-safe generic filename. Do not add the source track, a specific copyrighted song, or machine-local paths to a reusable skill repository. Treat the user-provided file as input only.

Keep fades in one layer. Prefer Remotion's frame-based volume envelope when the excerpt is used only by the composition; do not also bake equivalent fades into the MP3. A practical initial background level is often `0.15`–`0.30`, but mix by listening and reduce it further under narration.

## Classify render failures correctly

- **`delayRender` timeout:** find the named handle and prove every path clears it. Do not assume the media file is corrupt.
- **Blank or flickering image:** replace native image loading with `Img`, verify `staticFile()` paths, and render a still.
- **Chrome out of memory or disk:** lower `--concurrency`; do not rewrite correct animation code first.
- **Failure only near a late scene:** inspect resources mounted by that scene and any handles created during rerenders.
- **An output file exists after failure:** treat it as incomplete until a successful process exit and media inspection.

Start a memory-constrained retry with:

```bash
npx remotion render src/index.tsx CompositionId out/video.mp4 --concurrency=2
```

If needed, lower concurrency to `1`. Persist the stable value in the project's build script when users will rerun the same command.

## Verify the final container

Run the bundled verifier. State the expected geometry and audio intent explicitly:

```bash
node /path/to/remotion-production/scripts/verify-render.mjs out/video.mp4 \
  --expect-duration 35 --tolerance 0.25 \
  --expect-width 1920 --expect-height 1080 \
  --expect-video-codec h264 --require-audible-audio
```

Alternatively inspect the container directly with FFprobe:

```bash
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,codec_type \
  -of default=noprint_wrappers=1 out/video.mp4
```

Require a successful render exit, expected duration, expected dimensions and codec, at least one video stream, and an audio stream whenever audio is part of the request.

Confirm that the stream contains audible samples rather than silence:

```bash
ffmpeg -i out/video.mp4 -map 0:a:0 \
  -af volumedetect -f null -
```

Reject the result when `mean_volume` is `-inf`, the decoded sample count is zero, or the measured level is inconsistent with the intended background mix.

Some render pipelines create an AAC stream containing digital silence even when the composition has no requested music. Do not infer that a video is audible from stream presence alone. Use `--expect-silent` when silence is intentional; it accepts either no audio stream or a stream whose measured maximum stays at or below the verifier's silence threshold.
