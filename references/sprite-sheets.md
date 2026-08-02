# Sprite-sheet extraction and stabilization

## Diagnose before adjusting CSS

Determine which failure is visible:

- **Neighbor bleed:** pixels from the cell above or left appear in the crop.
- **Truncation:** an extremity is cut off because the crop rectangle is too small or misplaced.
- **Geometric jitter:** cell sizes vary or fractional boundaries are sampled inconsistently.
- **Visual jitter:** crop rectangles are correct, but the subject occupies a different position in each cell.
- **Loop discontinuity:** the last authored pose jumps directly to an incompatible first pose.

Do not fix all five by adding one global `translate()`. Source geometry and display anchoring require different data.

## Calculate integer cell boundaries

If a sheet dimension is not divisible by its column or row count, never repeat a fractional cell size. Build cumulative integer edges:

```ts
const makeEdges = (size: number, count: number) =>
  Array.from({length: count + 1}, (_, index) =>
    Math.round((index * size) / count),
  );

const xEdges = makeEdges(sheetWidth, columns);
const yEdges = makeEdges(sheetHeight, rows);

const rect = {
  x: xEdges[column],
  y: yEdges[row],
  w: xEdges[column + 1] - xEdges[column],
  h: yEdges[row + 1] - yEdges[row],
};
```

This distributes remainder pixels while guaranteeing that adjacent rectangles share the same integer boundary and the final edge equals the source dimension.

If the sheet has gutters, padding, trimmed frames, or exporter metadata, use those exact rectangles instead of assuming a regular grid.

If visible artwork genuinely crosses its true cell boundary, re-export the sheet with sufficient padding or extrude settings. Do not widen the runtime crop into a neighboring cell; that trades truncation for frame bleed.

## Measure the sheet before authoring the timeline

Record the source width, height, row and column count, exact cell edges, alpha bounds, and empty cells before building scenes. Distinguish these quantities:

- total grid cells;
- non-empty detected cells;
- enabled playback frames;
- authored playback-sequence length after repeats or ping-pong steps.

Do not label all grid cells as enabled frames when leading or trailing cells are empty. A small local analysis script using Sharp or Canvas is appropriate when it reports geometry and alpha bounds without modifying the source asset.

## Crop with two nested windows

Use a fixed outer viewport and an inner exact crop. Render the complete sheet with Remotion's `Img` component inside the crop:

```tsx
<div style={{position: 'relative', width: viewportW, height: viewportH, overflow: 'hidden'}}>
  <div
    style={{
      position: 'absolute',
      left: anchorOffsetX,
      top: anchorOffsetY,
      width: rect.w * scale,
      height: rect.h * scale,
      overflow: 'hidden',
    }}
  >
    <Img
      src={staticFile(sheetPath)}
      style={{
        position: 'absolute',
        left: -rect.x * scale,
        top: -rect.y * scale,
        width: sheetWidth * scale,
        height: sheetHeight * scale,
        maxWidth: 'none',
      }}
    />
  </div>
</div>
```

Keep crop coordinates integral in source pixels. Apply the same scale to sheet size, crop size, and negative sheet offset. Avoid `background-size: cover`, implicit image sizing, or independent transforms that change the coordinate system.

## Center visible content, not cells

Store a visible-content box relative to each frame rectangle:

```ts
type FrameGeometry = {
  x: number;
  y: number;
  w: number;
  h: number;
  contentBox?: {x: number; y: number; w: number; h: number};
};
```

Compute its visual center and offset it into a fixed viewport:

```ts
const centerX = contentBox ? contentBox.x + contentBox.w / 2 : rect.w / 2;
const centerY = contentBox ? contentBox.y + contentBox.h / 2 : rect.h / 2;

const anchorOffsetX = (viewportW / 2 - centerX) * scale;
const anchorOffsetY = (viewportH / 2 - centerY) * scale;
```

When ground contact matters more than geometric center, store a per-frame anchor such as the midpoint between the feet. Align every anchor to a common viewport point. Choose one anchoring model per animation; do not mix arbitrary CSS corrections with metadata anchors.

Include soft shadows and intentional motion trails in the content box when cutting them would be noticeable. Exclude isolated noise pixels that would pull the subject away from its stable center.

## Author the playback sequence

The sheet order is source data, not necessarily the best animation order. Build an explicit playback sequence that may:

- repeat neutral frames to slow the animation;
- hold a blink or emphasis pose;
- ping-pong through directional motion;
- return through intermediate poses before looping.

Example:

```ts
const playback = [0, 0, 0, 1, 1, 0, 4, 5, 6, 7, 6, 5, 4, 0, 0];
```

Start around 4–8 sprite FPS for readable character motion, then tune by viewing the loop. Composition FPS and sprite FPS are separate controls.

## Keep diagnostics live

Derive the crop, highlighted cell, frame label, and coordinate JSON from one current-frame calculation. Never place initial coordinates in static markup if the scene demonstrates animation.

For a filmstrip, derive a contiguous window around the current source index and highlight that exact index. A sparse sample strip with a “nearest” highlighted cell is visually plausible but factually wrong.

When the animation uses a fixed viewport, scale the crop proportionally with one shared scale such as `Math.min(viewportW / rect.w, viewportH / rect.h)`. Do not stretch source cells independently to fill the viewport.

## Visual QA

Inspect at least:

- first and last cells in every row;
- cells touching the top, left, right, and bottom edges;
- frames with the widest or tallest visible content;
- the last-to-first loop boundary;
- the output at its actual display scale.

For large sheets, add a temporary QA composition that lays out the first and last valid frames plus the left and right edge frame of every source row. This makes neighbor bleed and truncated edge content visible in one still.

Reject the result if neighboring pixels appear for even one frame, an extremity is shortened, or the subject center visibly wanders without intentional body motion.
