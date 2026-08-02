# Cover prompts and short-video descriptions

## Output contract

Treat cover prompts and publishing descriptions as conversation deliverables. Return them directly in the final response so the user can copy them.

If the user asks to design or add a cover inside the Remotion project, this reference is not sufficient. Follow [covers-and-endings.md](covers-and-endings.md) and implement the composition. Use this reference only when they request a prompt, thumbnail direction, description, or hashtags.

- Do not create `.txt`, Markdown, JSON, or project files for this copy unless the user asks.
- Do not call image generation merely because the user requests a prompt.
- Do not claim a cover was generated when only a prompt was written.
- Match the user's language and requested platform.
- Derive claims from the final composition or inspected project; do not invent features, results, or assets.
- If the video is still changing, state that the copy reflects the current version.

## Write a cover-image generation prompt

Inspect the composition title, central subject, visual metaphor, palette, teaching points, and recurring effects. Produce one copy-ready prompt adapted to the named image model, such as ChatImage-2. If no model is named, use clear natural-language instructions without model-specific parameters.

Include:

1. **Format:** target aspect ratio and resolution, usually `16:9, 1920×1080` for a landscape video cover.
2. **Primary subject:** one unmistakable focal subject from the video, complete and visually centered.
3. **Story:** a visual relationship that communicates the video's mechanism or result rather than a generic decorative scene.
4. **Art direction:** palette, lighting, illustration or photographic style, and energy consistent with the video.
5. **Thumbnail composition:** strong hierarchy, mobile-size legibility, safe margins, and deliberate empty space for a title when needed.
6. **Exact text:** title and subtitle in quotes when the model should render them. Ask for readable typography and preserve the literal wording.
7. **Negative constraints:** exclude unrelated subjects, clipping, duplicated limbs or objects, neighboring sprite fragments, transparent checkerboards, unwanted grid artifacts, malformed text, logos, and watermarks when relevant.

Keep the prompt internally consistent. Do not ask for a centered subject and reserve the same center area for a large title. For animation tutorials, show one main character plus a restrained progression of frames, timeline, crop window, or code motif; avoid repeating multiple equally prominent characters.

When reliable Chinese typography is uncertain, add one sentence after the prompt: recommend removing generated text, reserving title space, and adding the title later in Remotion or a design editor. Do not hide this fallback inside the prompt.

Default response shape:

```text
封面生成提示词

<one fenced, copy-ready prompt>

<optional one-sentence typography fallback>
```

## Write a short-video description

Write one ready-to-publish paragraph with this sequence:

1. Open with a concrete question, contrast, or result that matches the first seconds of the video.
2. State what the viewer will see or understand.
3. Mention the main method or tool only when it improves discovery or credibility.
4. Identify the likely audience without overclaiming mastery.

Prefer roughly 50–140 Chinese characters for a general short-video description. Use plain language instead of internal component names or debugging history. Mention duration only when brevity is a selling point. Do not use claims such as "fully master," "zero effort," or "guaranteed" unless the video supports them.

Optionally provide one shorter alternative and 4–7 focused hashtags. Avoid keyword stuffing and unrelated trending tags.

Default response shape:

```text
视频简介

> <ready-to-publish paragraph>

更短版本：<optional compact alternative>

标签：#Topic #Tool #Audience
```

## Handle combined requests

When the user asks for both deliverables, output the cover prompt first and the description second. Keep each self-contained. Do not narrate the internal analysis or write files as a side effect.
