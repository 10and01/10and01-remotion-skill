# Scene architecture and transitions

## Keep timeline data explicit

Represent scenes as data or named constants. Check that their durations sum to the composition duration. Remember that `useCurrentFrame()` inside a `Sequence` is local to that sequence.

Premount sequences when supported by the installed Remotion version, especially scenes with fonts or media. Use `Series` for contiguous scenes and `Sequence` when explicit placement or overlap is clearer.

## Drive all rendered state from frames

Use frame-derived values for opacity, position, scale, highlighted code, counters, coordinate panels, and effects. Clamp interpolations unless extrapolation is intentional.

Avoid:

- CSS `transition` or `animation` declarations;
- `setTimeout`, `setInterval`, `Date.now()`, or wall-clock media state;
- nondeterministic random values without seeded randomness;
- React state that advances independently of `useCurrentFrame()`.

## Preserve a background through cuts

Place an opaque `AbsoluteFill` at the composition root. Do not rely on adjacent scenes overlapping perfectly. During fades or cut overlays, a transparent root can reveal the browser's checkerboard or an encoder background.

Recommended layer order:

1. persistent opaque background;
2. subtle global background treatment;
3. scenes;
4. transition overlays;
5. vignette, grain, or safety treatment.

## Design overlays around cut frames

For a lightweight custom overlay, find whether the global frame is near a cut and derive an intensity from the distance:

```tsx
const nearestCut = cutFrames.find((cut) => Math.abs(frame - cut) <= radius);
if (nearestCut === undefined) return null;

const intensity = interpolate(
  Math.abs(frame - nearestCut),
  [0, radius],
  [1, 0],
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
);
```

Use this intensity for a darkening layer, a restrained light sweep, or a thin scan line. Keep `pointerEvents: 'none'`, set an intentional `zIndex`, and clip the overlay to the composition.

Use `TransitionSeries` when the project already includes `@remotion/transitions` and overlapping scene timing is desired. Recalculate total duration because transitions overlap adjacent scenes; overlays do not shorten the timeline.

## Make explanation scenes truthful

If a scene teaches changing frame coordinates, calculate the active frame once and pass or reuse it everywhere. A viewer should see the crop, highlighted cell, index, and JSON values change together on the same rendered frame.

Keep one visual subject throughout a short tutorial unless comparison is the lesson. Reusing the same asset reduces cognitive load and exposes alignment defects that unrelated examples can hide.
