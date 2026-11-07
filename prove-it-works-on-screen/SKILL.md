---
name: prove-it-works-on-screen
description: Prove a change works with short before/after videos (or screenshots when a video adds nothing), shown to the user in Claude Code. Use after any change with a visible result, e.g. a UI fix, a layout or styling change, a new screen or flow, CLI or TUI output, a rendered chart, or when the user asks for a video, screenshots, a before/after, a GIF, or a demo of the change working.
---

Follow the prove-it-works skill first. This skill adds recordings: what the change looked like before, what it looks like after, and both shown to the user inside Claude Code.

## Plan the shots

- Decide what the user needs to see to believe the change works. Name it in one line, e.g. "the Save button no longer overlaps the footer at 375px".
- Prefer a short video over a screenshot. A video shows the change being reached and used (the page loading, the click, the hover, the resize), which is harder to fake and easier to believe than one frame.
- Use a screenshot only when no recording tool works, or when the change is one static frame and a video would show nothing more, e.g. a copy change.
- Record only an after video for a new feature, since nothing existed before.
- Use the same page, viewport size, data, theme, and steps for both sides, so the only difference is the change.

## Capture the before

- Record the before state before you edit anything. For a bug, the before video is the reproduction.
- If you already made the change, record the before state from the base commit in a separate worktree (`git worktree add /tmp/before HEAD`) and run it on another port. Don't stash or revert the user's working tree to do this.
- Remove the worktree when you are done.

## Capture the after

- Make the change, then record the same steps again.
- Check both sides yourself before showing them. The Read tool can't open a video, so pull frames out with `ffmpeg -i after.mp4 -vf fps=2 /tmp/proof/<slug>/check/%03d.png` and read those. Check that the after video really shows the fix and that nothing else on screen broke. Note the frame on each side that shows the problem or the fix most clearly; its time in seconds is its number minus 1, divided by 2 (frame `007.png` is at 3 seconds).

## How to capture

Save everything under `/tmp/proof/<short-slug>/` with absolute paths: `before.mp4` and `after.mp4` for videos, `before.png` and `after.png` for stills.

- Web app: record a short Playwright script with `recordVideo: { dir, size: { width: 1280, height: 800 } }` on the browser context and a matching viewport. Do the steps that show the change with small waits between them so they can be followed, then close the context to save the video. Playwright writes WebM; convert it with the command under "Keep videos small". If Claude in Chrome is connected, its `gif_creator` can record the flow as a GIF instead.
- Screen recording on macOS: `screencapture -v -V <seconds> out.mov` for the whole screen, or add `-R x,y,w,h` to record a region.
- CLI or TUI: record the steps with `vhs` (a tape file with `Output after.mp4`). If `vhs` isn't installed, render a still with `freeze` (`freeze --execute "<command>" -o after.png`), and if that isn't installed either, show the before and after output as text.
- Stills, when a video adds nothing: `npx -y playwright screenshot --viewport-size=1280,800 <url> after.png` for a web page, `screencapture -x -l <window-id> after.png` for one macOS window. Keep each PNG under 2 MB and at most about 1600px wide: `ffmpeg -y -i in.png -vf "scale='min(1600,iw)':-1" out.png`.

### Keep videos small

- Aim for 3 to 10 seconds that show only the change: start just before it and stop once it has happened. Cut dead time at the start with `-ss` and limit the length with `-t`.
- Convert every recording to a small MP4: at most 1280px wide, 15 fps, no audio, a few MB at most.

  ```sh
  ffmpeg -y -i raw.webm -ss 0.5 -t 10 -vf "scale='min(1280,iw)':-2,fps=15" -c:v libx264 -crf 28 -preset veryfast -pix_fmt yuv420p -an -movflags +faststart after.mp4
  ```

## Show it in Claude Code

- If the `mcp__proof-viewer__show_proof` tool is available, call it with `title` (the one line from "Plan the shots") and `before` and `after` as lists of absolute paths. Each list holds one video or GIF, one PNG, or numbered PNG frames. The proof-viewer mod draws both sides next to each other under that call in the transcript. Each side is one still picture, because the terminal can't play animation without slowing the session down. For a video, pass `before_at` and `after_at`: the time in seconds of the frame you noted while checking. Without them the last frame is shown. A video's picture has a ▶ badge in its center, and clicking the picture opens the video in the default video player (QuickTime), where it plays at full speed outside the session. A GIF or WebM is converted to MP4 first, since QuickTime can't open those. A single PNG is shown as is.
- If the tool is not available, pull a few key frames from each video with ffmpeg (`ffmpeg -i after.mp4 -vf fps=1 frames/%03d.png`), open them with the Read tool so they appear in the conversation, and give the user the video paths. The tool comes from the proof-viewer mod in this skill's own folder, which Claude Code loads when the skill is installed in a skills folder (`~/.claude/skills/<name>` or a project's `.claude/skills/<name>`). If it is missing, tell the user once to restart Claude Code, and if that doesn't help, to install the skill there.
- Give the user the paths of the videos so they can play or share them. To make a shareable GIF from a video: `ffmpeg -y -i after.mp4 -vf "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" after.gif`.

## Report

- Say in one line what the videos show, and give their paths.
- Give the verification script from prove-it-works. Videos and screenshots don't replace it.
- If a recording doesn't match what you expected, treat it as a failed verification: fix the change and record again.
