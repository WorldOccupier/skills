---
name: explainer-video
description: Make a short motion-graphics explainer video in code with fframes (Rust). Use when the user asks for an explainer, product walkthrough, feature announcement, or "how it works" video, e.g. "make a video explaining X", "turn this changelog into a video", or "animate these steps".
---

Make a step-by-step explainer. It is all motion graphics with no screen recordings. Simplified UI mockups react to a voiceover, elements move on springs, and captions sit at the bottom. Build it in code with fframes so every frame is exact and easy to change.

## Gather the facts

- Get the topic, the source material (docs, changelog, post, numbers), and the audience.
- Every claim and number on screen must come from a real source. Never invent figures.
- Ask only for what is missing:
  - Aspect ratio. Default 16:9 at 1920x1080. Use 4:5 at 1080x1350 or 9:16 at 1080x1920 for phone feeds.
  - Target length.
  - Brand, logo, and accent colour.
  - Voice preference.
  - Whether to add a handle watermark.

## Write the script

- Structure: intro (one line on what this is), 3–6 steps, outro (one takeaway or call to action).
- Speak about 150 words per minute. A 60 second video is about 150 words.
- Give each step one idea and one visual. If a step needs two visuals, split it.
- Show the script to the user before building.

## Visual system

- Solid white background. Black text. Mid or light grey for secondary text and borders. One bright accent (default `#E83D15`) for checks, active states, highlights, and badges.
- Font: Inter, or SF Pro or Helvetica. Titles large and bold. Descriptions regular and grey. Overlines tiny, bold, all caps, letter-spaced, in accent or grey.
- Layout: centre the intro and outro. Split step scenes into static text on the left (about 35%) and an animated stage on the right (about 65%).
- Mockups are abstract UI drawn from shapes, never real screenshots: a macOS-style browser window with traffic lights, buttons, input fields, cards, progress bars, horizontal node timelines, checklists, a social post card.
- Reusable motifs:
  - A large black cursor glides with easing, and the button it clicks squashes slightly.
  - Text types in character by character.
  - A progress bar fills or drains while its label changes.
  - A timeline line draws from node to node, turning each node the accent colour.
  - Checklist items appear with accent checks.
  - Pills and badges pop in. X pills mark exclusions.
- Optional faint grey handle watermark in the bottom-right corner.

## Motion

- Animate almost everything with a spring that overshoots slightly (damping about 12–14, mass about 0.6–0.8). Pop-ins scale from 0 to 1. Slides travel 20–40px.
- No hard cuts. Between scenes, the current scene slides up and fades out while the next slides up from below and fades in, over about 0.4–0.6s. Always move upward.
- Stagger list items 6–10 frames apart.
- Render at 30 or 60fps.
- No sound effects. Time visual events to the VO word timestamps.

## Captions

- Bottom centre. White regular text on a solid black rounded rectangle that resizes to fit the phrase.
- Show 3–7 words at a time, grouped from the word timestamps.

## Music

- Optional. A quiet lo-fi or synth bed under the VO, around -24 to -20 LUFS (about 15–20 dB below the voice), faded in and out.
- Use only royalty-free tracks with a clear licence. Otherwise skip music.

## Build and render

- Build the video with fframes, the Rust library for rendering video from code.
- Keep scene timings, colours, and spring settings in one place so tweaks are one-line changes.
- Render, then watch the full video before handing it over. Check that visuals land on the right words, captions match the audio, and nothing overflows the frame.
