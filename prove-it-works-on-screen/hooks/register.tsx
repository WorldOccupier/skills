import type { EngineInterface, Register } from 'claude-code'

const TOOL_NAME = 'show_proof'
const TOOL = 'mcp__proof-viewer__show_proof'
const MAX_PNG_BYTES = 2 * 1024 * 1024
const MAX_ROWS = 36
// A recording is shown as one still frame, scaled to this width so the play
// badge is the same size on every frame.
const FRAME_WIDTH = 1280
const WORK_ROOT = '/tmp/proof-viewer'
// Columns between the Before and After pictures.
const PANEL_GAP = 4
// Columns left free at the right edge: a row that fills the reported width gets
// its last picture cut off in the terminal.
const EDGE_SPARE = 4
const FRAME_VERSION = 'v5-center-badge'
// A recording's frame gets a play badge in its center, drawn by ffmpeg in a
// 200px square: a dark circle with a white ring, so it shows on dark frames
// too, and a white triangle in it.
const IN_CIRCLE = 'lte(hypot(X-100,Y-100),94)'
const WHITE = `(${IN_CIRCLE}*gte(X,75)*lte(abs(Y-100),(150-X)*45/75)+${IN_CIRCLE}*gte(hypot(X-100,Y-100),84))`
const PLAY_BADGE =
  `color=c=black@0:s=200x200,format=rgba,` +
  `geq=r='if(${WHITE},255,15)':g='if(${WHITE},255,15)':b='if(${WHITE},255,15)':a='if(${IN_CIRCLE},210,0)'`
const VIDEO = /\.(gif|mp4|mov|webm|m4v|mkv)$/i
const PLAYABLE = /\.(mp4|mov|m4v)$/i

type Picture = { png: string; width: number; height: number }
type Prepared = { path: string }
// `recording` is the GIF or video a side came from, which the Play button opens.
type Side = { label: string; picture: Picture; recording?: string }
type ProofInput = { title?: string; before?: string[]; after?: string[]; before_at?: number; after_at?: number }

// Module state starts over on reload, which is fine: it is a cache.
const picturesByPath = new Map<string, Picture>()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: TOOL_NAME,
      description:
        'Show before/after pictures inline in the transcript under this call. ' +
        'Pass absolute paths to one PNG, PNG frames, or one GIF or video (mp4, mov, webm) per side. ' +
        'Each side is shown as one picture: a PNG as is, numbered frames as the last one, ' +
        'a GIF or video as one frame (the last, or the one at `before_at`/`after_at` seconds), ' +
        'with a play badge the user can click to watch the whole video. ' +
        'Omit `before` to show only the result of a new feature.',
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'What the images prove, e.g. "Login button no longer overlaps the footer"' },
          before: { type: 'array', items: { type: 'string' }, description: 'Absolute paths of the state before the change: one PNG, PNG frames, or one GIF/video' },
          after: { type: 'array', items: { type: 'string' }, description: 'Absolute paths of the state after the change: one PNG, PNG frames, or one GIF/video' },
          before_at: { type: 'number', minimum: 0, description: 'Seconds into the before video of the frame that best shows the problem. Default: the last frame.' },
          after_at: { type: 'number', minimum: 0, description: 'Seconds into the after video of the frame that best shows the fix. Default: the last frame.' },
        },
        required: ['after'],
      },
    })

    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as ProofInput
    if ((input.after ?? []).length === 0) return { deny: '`after` needs at least one path.' }

    const shown: string[] = []
    for (const [label, paths, at] of [['before', input.before ?? [], input.before_at], ['after', input.after ?? [], input.after_at]] as const) {
      if (paths.length === 0) continue
      for (const path of paths) {
        const problem = await checkSource($, path)
        if (problem) return { deny: problem }
      }
      if (at !== undefined && (typeof at !== 'number' || !(at >= 0))) return { deny: `${label}_at: pass seconds, 0 or more.` }
      const prepared = await prepare($, paths, at)
      if ('deny' in prepared) return prepared
      const problem = await checkPng($, prepared.path)
      if (problem) return { deny: problem }
      shown.push(prepared.path === paths[0] ? `${label} (${prepared.path})` : `${label} (${describeFrame(paths, at)}, ${prepared.path})`)
    }

    return { result: `Showing ${shown.join(' and ')} to the user under this call.` }
  }).catch(() => ({ deny: 'proof-viewer failed to prepare the images.' }))

  // A click on a recording's picture, posted by play-area.tsx.
  on('ui.message', { module: 'hooks/play-area.tsx' }, async ($, e, next) => {
    const path = (e.data as { play?: unknown } | null)?.play
    if (typeof path === 'string' && path.startsWith('/') && VIDEO.test(path)) {
      await play($, path).catch(() => $.ui.toast(`Could not play ${path}`))
    }
    return next(e)
  })

  // Under the pictures, the tool's result line is for the model; the person
  // sees it in the full transcript (ctrl+o) alone.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (e.props.tool !== TOOL || e.props.isErrored || e.props.isExpanded || e.surface !== 'terminal') return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.props.tool !== TOOL || e.props.isRunning || e.props.isErrored) return next(e)
    // Image is a terminal-only element for now.
    if (e.surface !== 'terminal') return next(e)

    const { Box, Text, Image, Client } = $.ui.resolve(e)
    // The call's own row (tool name and paths) shows in the full transcript alone.
    const row = e.props.isExpanded ? await next(e) : undefined
    const sides = await loadSides($, e.props.input as ProofInput)
    if (sides.length === 0) return row ?? next(e)

    const totalColumns = e.viewport?.columns ?? 100
    const panelColumns = Math.min(90, Math.floor((totalColumns - 2 - EDGE_SPARE - PANEL_GAP * (sides.length - 1)) / sides.length))
    const title = (e.props.input as ProofInput).title

    return (
      <Box flexDirection="column" paddingLeft={2} marginTop={1} rowGap={1}>
        {row}
        {title && <Text bold>{title}</Text>}
        <Box flexDirection="row" columnGap={PANEL_GAP}>
          {sides.map(side => {
            const size = fitCells(side.picture.width, side.picture.height, panelColumns)
            return (
              <Box flexDirection="column" rowGap={1}>
                {/* Centered by hand: the label's own width is known, the terminal's flex centering is not reliable here. */}
                <Box paddingLeft={Math.max(0, Math.floor((size.columns - side.label.length) / 2))}>
                  <Text bold color={side.label === 'Before' ? 'red' : 'green'}>
                    {side.label}
                  </Text>
                </Box>
                <Box>
                  <Image
                    source={{ png: side.picture.png }}
                    columns={size.columns}
                    rows={size.rows}
                    alt={`${side.label} screenshot (this terminal cannot draw images)`}
                  />
                  {side.recording && (
                    // An Image takes no clicks, and text drawn over it blanks it.
                    // An empty Client draws no text but does get the pointer, so it
                    // makes the picture (and the ▶ badge in it) clickable.
                    <Box position="absolute" top={0} left={0}>
                      <Client
                        key={`play-${side.label}`}
                        module="./play-area.tsx"
                        props={{ path: side.recording }}
                        width={size.columns}
                        height={size.rows}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })
}

// The terminal draws stills only, so a recording plays in the default video
// player (QuickTime), outside the session. QuickTime can't open a GIF or WebM,
// so those are converted to an MP4 once. Quick Look (qlmanage -p) crashes in
// AVKit when previewing video, so it is not used.
async function play($: EngineInterface, path: string): Promise<void> {
  let target = path
  if (!PLAYABLE.test(path)) {
    const { mtimeMs } = await $.fs.stat(path)
    const dir = `${WORK_ROOT}/${await shortHash(`play:${path}@${mtimeMs}`)}`
    target = `${dir}/play.mp4`
    const made = await $.fs.stat(target).catch(() => undefined)
    if (!made) {
      await $.fs.write(`${dir}/sources.txt`, path)
      const failed = await ffmpeg($, path, [
        '-i', path, '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', target,
      ])
      if (failed) return void $.ui.toast(failed.deny)
    }
  }
  const opened = await $.process.run(['open', target], { timeoutMs: 10_000 })
  if (opened.exitCode !== 0) $.ui.toast(`Could not open ${target}: ${opened.stderr.trim()}`)
}

async function checkSource($: EngineInterface, path: string): Promise<string | undefined> {
  if (!path.startsWith('/')) return `${path}: pass an absolute path.`
  if (!path.toLowerCase().endsWith('.png') && !VIDEO.test(path)) return `${path}: pass a PNG, a GIF or a video (mp4, mov, webm).`
  const stat = await $.fs.stat(path).catch(() => undefined)
  if (!stat || stat.kind !== 'file') return `${path}: no such file.`
  return undefined
}

async function checkPng($: EngineInterface, path: string): Promise<string | undefined> {
  const stat = await $.fs.stat(path).catch(() => undefined)
  if (!stat || stat.kind !== 'file') return `${path}: no such file.`
  if (stat.size > MAX_PNG_BYTES) return `${path}: ${stat.size} bytes is over the 2 MiB limit; downscale it first.`
  return undefined
}

// One side becomes one PNG: a single PNG as is, numbered frames as the last
// one, a GIF or video as one frame with a play badge, made once into a folder
// named after the input, its mtime and the time asked for.
async function prepare($: EngineInterface, paths: string[], at?: number): Promise<Prepared | { deny: string }> {
  const only = paths[0]!
  if (!VIDEO.test(only)) return { path: paths[paths.length - 1]! }

  const { mtimeMs } = await $.fs.stat(only)
  const dir = `${WORK_ROOT}/${await shortHash(`${FRAME_VERSION}|${only}@${mtimeMs}|${at ?? 'end'}`)}`
  const frame = `${dir}/frame.png`
  if (await $.fs.stat(frame).then(() => true, () => false)) return { path: frame }

  // Writing a file creates the folder ffmpeg writes into.
  await $.fs.write(`${dir}/sources.txt`, only)
  const raw = `${dir}/raw.png`
  // `-update 1` keeps overwriting one file, so without a time the last frame is left.
  const grabbed = await ffmpeg($, only, [
    ...(at === undefined ? [] : ['-ss', String(at)]),
    '-i', only,
    ...(at === undefined ? ['-update', '1'] : ['-frames:v', '1']),
    raw,
  ])
  if (grabbed) return grabbed
  if (!(await $.fs.stat(raw).then(() => true, () => false))) {
    return { deny: `${only}: no frame at ${at}s; the video is shorter than that.` }
  }
  const badged = await ffmpeg($, only, [
    '-i', raw, '-f', 'lavfi', '-i', PLAY_BADGE,
    '-filter_complex', `[0]scale=${FRAME_WIDTH}:-2[f];[f][1]overlay=(W-w)/2:(H-h)/2`,
    '-frames:v', '1', frame,
  ])
  if (badged) return badged
  return { path: frame }
}

function describeFrame(paths: string[], at: number | undefined): string {
  if (!VIDEO.test(paths[0]!)) return `the last of ${paths.length} frames`
  return at === undefined ? 'the last frame' : `the frame at ${at}s`
}

async function ffmpeg($: EngineInterface, source: string, args: string[]): Promise<{ deny: string } | undefined> {
  const ran = await $.process
    .run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', ...args], { timeoutMs: 120_000 })
    .catch(error => ({ exitCode: 127, stderr: String(error) }))
  if (ran.exitCode === 0) return undefined
  return { deny: `${source}: ffmpeg failed (is ffmpeg installed?): ${ran.stderr.trim().slice(0, 500)}` }
}

async function shortHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].slice(0, 8).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function loadSides($: EngineInterface, input: ProofInput): Promise<Side[]> {
  const sides: Side[] = []
  for (const [label, paths, at] of [['Before', input.before, input.before_at], ['After', input.after, input.after_at]] as const) {
    if (!paths?.length) continue
    const prepared = await prepare($, paths, at).catch(() => undefined)
    if (!prepared || 'deny' in prepared) continue
    const picture = await loadPicture($, prepared.path)
    const recording = paths.length === 1 && VIDEO.test(paths[0]!) ? paths[0] : undefined
    if (picture) sides.push({ label, picture, recording })
  }
  return sides
}

async function loadPicture($: EngineInterface, path: string): Promise<Picture | undefined> {
  const cached = picturesByPath.get(path)
  if (cached) return cached
  const bytes = await $.fs.read(path, { as: 'bytes' }).catch(() => undefined)
  if (!bytes) return undefined
  const size = pngSize(bytes.base64)
  if (!size) return undefined
  const picture = { png: bytes.base64, ...size }
  picturesByPath.set(path, picture)
  return picture
}

// Width and height live in the IHDR chunk at bytes 16-23 of every PNG.
function pngSize(base64: string): { width: number; height: number } | undefined {
  const head = atob(base64.slice(0, 32))
  if (head.charCodeAt(1) !== 0x50 || head.charCodeAt(2) !== 0x4e || head.charCodeAt(3) !== 0x47) return undefined
  const u32 = (at: number) =>
    ((head.charCodeAt(at) << 24) | (head.charCodeAt(at + 1) << 16) | (head.charCodeAt(at + 2) << 8) | head.charCodeAt(at + 3)) >>> 0
  return { width: u32(16), height: u32(20) }
}

// A terminal cell is about twice as tall as it is wide.
function fitCells(width: number, height: number, maxColumns: number): { columns: number; rows: number } {
  let columns = Math.max(1, Math.min(255, maxColumns))
  let rows = Math.round((columns * height) / width / 2)
  if (rows > MAX_ROWS) {
    rows = MAX_ROWS
    columns = Math.max(1, Math.round((rows * 2 * width) / height))
  }
  return { columns, rows: Math.max(1, Math.min(255, rows)) }
}
