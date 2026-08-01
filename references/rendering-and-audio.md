# Rendering, asset loading, and audio

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

Run the bundled verifier:

```bash
node /path/to/remotion-production/scripts/verify-render.mjs out/video.mp4 --require-audio --expect-duration 35 --tolerance 0.25
```

Alternatively use Remotion's FFprobe wrapper:

```bash
npx remotion ffprobe -v error \
  -show_entries format=duration:stream=codec_name,codec_type \
  -of default=noprint_wrappers=1 out/video.mp4
```

Require a successful render exit, expected duration, at least one video stream, and an audio stream whenever audio is part of the request.
