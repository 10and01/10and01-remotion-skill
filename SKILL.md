---
name: remotion-production
description: Build, refine, debug, verify, and package polished Remotion videos in React, especially explainer videos, scene-based tutorials, sprite-sheet animations, and asset-driven compositions. Use when Codex needs to plan a Remotion timeline, implement deterministic frame-based motion, crop and stabilize irregular sprite frames, synchronize on-screen diagnostics, design an actual opening cover or branded ending, export standalone cover artwork, add transitions, select background-music excerpts, fix render failures, validate exported media, or provide cover-image generation prompts and short-video descriptions based on the finished composition.
---

# Remotion Production

Build Remotion videos as deterministic frame renderers. Treat asset geometry, visual anchoring, timeline timing, and final media verification as separate concerns.

## Route the task

- For sprite-sheet extraction, frame bleed, off-center subjects, truncated artwork, or unnatural loops, read [references/sprite-sheets.md](references/sprite-sheets.md).
- For composition structure, scene timing, live coordinate panels, or transition design, read [references/scene-architecture.md](references/scene-architecture.md).
- For an in-video opening cover, standalone thumbnail composition, branded ending, or final hold, read [references/covers-and-endings.md](references/covers-and-endings.md).
- For asset loading, audio, `delayRender` failures, out-of-memory renders, or export verification, read [references/rendering-and-audio.md](references/rendering-and-audio.md).
- For cover-image prompts, thumbnail direction, short-video descriptions, or publishing hashtags, read [references/publishing-copy.md](references/publishing-copy.md).

Read only the references relevant to the request. Inspect the installed Remotion version before choosing imports because older projects may expose media components from `remotion`, while current projects use `@remotion/media`.

## Production workflow

### 1. Establish the render contract

Inspect the existing project before editing. Record:

- composition ID, width, height, FPS, and duration;
- scene boundaries and whether frames are global or local to a `Sequence`;
- source asset dimensions, transparency, frame metadata, and audio duration;
- required output codec, destination, and available render resources;
- whether the deliverables include an opening cover scene, standalone cover image, ending card, audible audio, intentional silence, or publishing copy.

Preserve unrelated working-tree changes. Prefer a small targeted change over restructuring a working project.

### 2. Model time explicitly

Define scene durations and cut frames as named constants or data. Derive animation state from `useCurrentFrame()` and `useVideoConfig()`.

```tsx
const spriteIndex =
  Math.floor((frame * spriteFps) / compositionFps) % sequence.length;
```

Use `interpolate()` with clamped ranges for continuous motion. Do not use CSS transitions, CSS keyframes, wall-clock timers, random values, or mutable playback state for rendered animation.

### 3. Separate source geometry from presentation

Keep crop rectangles, animation order, content bounds, and visual anchors in typed data. Make render components consume that data rather than duplicating coordinates in CSS or labels.

Use the same computed current-frame object for:

- the visible crop;
- frame counters and highlighted cells;
- JSON/coordinate panels;
- captions that describe the active frame.

This prevents a correct animation with stale explanatory UI.

When showing a filmstrip, generate a window that contains the exact current frame. Do not highlight the nearest sampled frame while rendering a different crop.

### 4. Stabilize the main subject

Use a fixed viewport for the animation. Crop the exact source rectangle first, then translate that cropped frame inside the viewport using a per-frame visual anchor or visible-content box. Do not center only the raw cell rectangle when the artwork shifts inside cells.

For sprite sheets, verify every edge frame and any frame containing long extremities such as tails, hair, shadows, or motion trails. Follow the detailed workflow in [references/sprite-sheets.md](references/sprite-sheets.md).

### 5. Build scene continuity

Give the composition a persistent opaque base background outside all scene sequences. Scene backgrounds may remain opaque as well. Apply transitions as frame-driven overlays above the scenes and below any final vignette or safety overlay.

Keep decorative effects subordinate to the explanation. A transition should conceal a cut, not reveal transparency, checkerboards, neighboring sprite cells, or unmounted content.

When the request includes a cover or ending, implement them as first-class scenes and render a standalone cover composition when useful. Follow [references/covers-and-endings.md](references/covers-and-endings.md). Do not substitute a cover-generation prompt for an actual Remotion cover unless the user asked only for a prompt.

### 6. Add and mix audio

Reference local audio with `staticFile()`. Cover the full composition by choosing a long-enough track, looping intentionally, or trimming intentionally. For a user-provided long track, inspect its duration, silence, and loudness, then place only the required excerpt in `public/audio/`. Choose a musically natural boundary rather than relying on loudness alone.

Use a frame-based volume callback for fades and keep background music low enough for narration or instructional text. Avoid baking fades into the excerpt when Remotion already owns the volume envelope.

Do not declare audio complete from Studio preview alone. Verify the exported file contains a measurably non-silent audio stream.

### 7. Validate in increasing scope

Run checks in this order:

1. Type-check the project.
2. Render stills at the cover, both sides of each cut, representative sprite frames, the ending entrance, and the final hold.
3. Render the full composition.
4. If Chrome exhausts RAM or temporary disk, reduce render concurrency before changing application code.
5. Inspect the final container for duration, video stream, and required audio stream.

Use the bundled verifier after export:

```bash
node /path/to/remotion-production/scripts/verify-render.mjs out/video.mp4 --expect-duration 35 --expect-width 1920 --expect-height 1080 --expect-video-codec h264 --require-audible-audio
```

Treat a partial or failed output as invalid even if a file exists at the destination.

### 8. Prepare publishing copy when requested

Base cover prompts and video descriptions on the final composition, verified subject, teaching points, visual style, duration, and audience. Output these deliverables directly in the user conversation. Do not create prompt or description files, call an image-generation tool, or generate a cover image unless the user explicitly asks for those actions.

Follow [references/publishing-copy.md](references/publishing-copy.md). Make the result ready to copy, concise for the target platform, and written in the user's language.

## Completion standard

Do not claim completion until:

- animation is derived deterministically from frames;
- subject bounds remain complete and visually stable across the loop;
- explanatory coordinates update with the rendered sprite frame;
- scene cuts never expose transparent or checkerboard artifacts;
- media assets load without leaked render handles;
- a full render succeeds at a stable concurrency;
- the exported file has the expected duration, required audio/video streams, and non-silent audio when music is requested.
- requested cover and ending scenes are visually checked at full state, transition boundaries, and the final frame;
- standalone cover artwork includes its own opaque background and matches the video hierarchy;
- requested cover prompts and publishing descriptions accurately reflect the final video and are delivered directly in the conversation.

Report the output path, render command, verification result, and any intentionally reduced concurrency.
