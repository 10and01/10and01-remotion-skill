# Opening covers, standalone thumbnails, and endings

## Distinguish the deliverables

Treat these as separate outputs:

- **Opening cover scene:** the first 2–4 seconds inside the video.
- **Standalone cover artwork:** a one-frame Remotion composition rendered to PNG or JPEG.
- **Cover-generation prompt:** publishing copy returned in the conversation.
- **Ending scene:** a branded final section with a deliberate last-frame state.

Confirm which outputs the user requested. When they ask to add a cover or ending to the video, implement real Remotion scenes. Do not answer only with an image-generation prompt.

## Build a reusable cover composition

Use one visual hierarchy for the animated opening and standalone artwork:

1. project or product identity;
2. one clear title and concise promise;
3. one primary subject or mechanism visual;
4. restrained supporting labels;
5. safe margins and mobile-thumbnail legibility.

Share a cover-art component or expose a deterministic `staticFrame`/progress prop. Always call hooks unconditionally, then override their values for the still variant.

The standalone composition must render its own opaque background and global treatment. A scene that assumes the parent composition provides the background may export as black, transparent, or visually incomplete when rendered alone.

Hide global timeline footers and instructional chrome on standalone cover artwork unless they are intentional parts of the thumbnail.

## Animate the opening

Introduce identity and title first, then the subject visual and supporting labels. Keep motion frame-driven and allow enough hold time to read the title before the first teaching scene.

At the handoff, inspect:

- the last full cover frame;
- the cut or transition overlay;
- the first readable frame of the next scene;
- the first frame where the next scene's main panel appears.

Avoid double fading both scenes into a dark gap. Also avoid a long muddy overlap between two large titles. A short scan-line cut, wipe, or one-sided fade is often clearer than two independent fades.

## Design the ending

Use the final 2–4 seconds to close the argument, not merely stop the animation. Include only the elements appropriate to the project:

- brand or project name;
- concise outcome statement;
- two to four capability labels;
- repository URL, product URL, or call to action;
- local-first, privacy, or export claim only when verified.

Keep the final information on screen. Freeze decorative or character motion for roughly the last 0.5–1.5 seconds so the ending has a stable final frame and platform players can display a clean last image. Do not fade all useful information to black unless the user requests a cinematic fade-out.

## Visual QA

Render and inspect at least:

- the standalone cover image;
- a fully established animated-cover frame;
- cover-to-content boundary frames;
- the ending entrance;
- the first frozen final-hold frame;
- the last composition frame.

Check text wrapping, subject clipping, background ownership, footer visibility, URL legibility, and whether the final frame matches the intended brand state.
