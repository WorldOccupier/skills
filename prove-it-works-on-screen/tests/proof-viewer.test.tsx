import { expect, test } from 'claude-code/testing'

const TOOL = 'mcp__proof-viewer__show_proof'
// The first bytes of an 800x500 PNG: enough for the size the mod reads.
const PNG_800x500 = 'iVBORw0KGgoAAAANSUhEUgAAAyAAAAH0CAIAAABKIt4vAAAACXBIWXMAAAABAAAAAQBPJcTWAAAJKUlEQVR4nO3YoXFCARBFUTJDV5hYBOa3QF1pISYCi6ERBFVEpALczez/cE4D++Sd/bj/PnYAAHT20wMAAF6NwAIAiAksAICYwAIAiAksAICYwAIAiAksAICYwAIA'

const ROW = {
  plugin: 'proof-viewer',
  component: 'ToolUse',
  requestId: 'toolu_1',
  surface: 'terminal',
  viewport: { columns: 120, rows: 40 },
  props: {
    tool_use_id: 'toolu_1',
    tool: TOOL,
    input: { title: 'Button moved above the footer', before: ['/tmp/b.png'], after: ['/tmp/a.png'] },
    isRunning: false,
    isErrored: false,
    isInterrupted: false,
  },
} as const

test('a call naming a missing file is refused', async ($, on) => {
  on('fs.stat', () => { throw new Error('ENOENT') })

  const ran = await $.tool.call({ tool: TOOL, after: ['/tmp/missing.png'] } as never)

  expect(ran.deny).toBe('/tmp/missing.png: no such file.')
})

test('a call with PNGs that exist is answered', async ($, on) => {
  on('fs.stat', () => ({ value: { kind: 'file', size: 1000, mtimeMs: 0, isSymlink: false } }))

  const ran = await $.tool.call({ tool: TOOL, before: ['/tmp/b.png'], after: ['/tmp/a.png'] } as never)

  expect(ran.result).toBe('Showing before (/tmp/b.png) and after (/tmp/a.png) to the user under this call.')
})

// A fake disk: stat answers for the sources and for what ffmpeg wrote.
function fakeDisk(on: (event: never, hook: never) => unknown) {
  const ran: string[][] = []
  const made = new Set<string>()
  const hook = (fn: unknown) => fn as never
  on('fs.stat' as never, hook((_: unknown, e: { path: string }) => {
    if (e.path.startsWith('/tmp/proof-viewer/') && !made.has(e.path)) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 1000, mtimeMs: 7, isSymlink: false } }
  }))
  on('fs.write' as never, hook(() => ({ value: {} })))
  on('process.run' as never, hook((_: unknown, e: { argv: string[] }) => {
    ran.push([...e.argv])
    made.add(e.argv[e.argv.length - 1]!)
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  }))
  return ran
}

test('a GIF becomes its last frame with a play badge, made once', async ($, on) => {
  const ran = fakeDisk(on as never)

  const first = await $.tool.call({ tool: TOOL, after: ['/tmp/flow.gif'] } as never)
  await $.tool.call({ tool: TOOL, after: ['/tmp/flow.gif'] } as never)

  expect(first.result).toMatch(/^Showing after \(the last frame, \/tmp\/proof-viewer\/[0-9a-f]{16}\/frame\.png\) to the user/)
  // One grab and one badge; the second call reuses the frame.
  expect(ran.length).toBe(2)
  expect(ran[0]).toContain('/tmp/flow.gif')
  expect(ran[0]).toContain('-update')
  expect(ran[0]).not.toContain('-ss')
  expect(ran[1]?.join(' ')).toContain('overlay=(W-w)/2:(H-h)/2')
})

test('after_at picks the frame at that time', async ($, on) => {
  const ran = fakeDisk(on as never)

  const shown = await $.tool.call({ tool: TOOL, after: ['/tmp/flow.mp4'], after_at: 6.5 } as never)

  expect(shown.result).toMatch(/^Showing after \(the frame at 6\.5s, /)
  expect(ran[0]?.slice(ran[0].indexOf('-ss'), ran[0].indexOf('-ss') + 4)).toEqual(['-ss', '6.5', '-i', '/tmp/flow.mp4'])
  expect(ran[0]).toContain('-frames:v')
})

test('a time past the end of the video is refused', async ($, on) => {
  on('fs.stat', (_, e) => {
    if ((e as { path: string }).path.startsWith('/tmp/proof-viewer/')) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 1000, mtimeMs: 7, isSymlink: false } }
  })
  on('fs.write', () => ({ value: {} }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }))

  const shown = await $.tool.call({ tool: TOOL, after: ['/tmp/flow.mp4'], after_at: 99 } as never)

  expect(shown.deny).toBe('/tmp/flow.mp4: no frame at 99s; the video is shorter than that.')
})

test('numbered frames show the last one', async ($, on) => {
  on('fs.stat', () => ({ value: { kind: 'file', size: 1000, mtimeMs: 0, isSymlink: false } }))

  const shown = await $.tool.call({ tool: TOOL, after: ['/tmp/f/001.png', '/tmp/f/002.png', '/tmp/f/003.png'] } as never)

  expect(shown.result).toBe('Showing after (the last of 3 frames, /tmp/f/003.png) to the user under this call.')
})

test('a GIF ffmpeg cannot read is refused with its error', async ($, on) => {
  on('fs.stat', (_, e) => {
    if ((e as { path: string }).path.startsWith('/tmp/proof-viewer/')) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 1000, mtimeMs: 7, isSymlink: false } }
  })
  on('fs.write', () => ({ value: {} }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'Invalid data found\n' } }))

  const ran = await $.tool.call({ tool: TOOL, after: ['/tmp/broken.gif'] } as never)

  expect(ran.deny).toContain('ffmpeg failed')
  expect(ran.deny).toContain('Invalid data found')
})

test('a file that is neither PNG nor video is refused', async ($, on) => {
  const ran = await $.tool.call({ tool: TOOL, after: ['/tmp/shot.jpg'] } as never)

  expect(ran.deny).toBe('/tmp/shot.jpg: pass a PNG, a GIF or a video (mp4, mov, webm).')
})

test('the row draws only the title and a Before and an After image beside each other', async ($, on) => {
  on('fs.read', () => ({ value: { base64: PNG_800x500 } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })

  const ui = await $.ui.mount(ROW as never)

  expect((await ui.find({ type: 'Text', text: /^Before/ }))?.text).toBe('Before')
  expect((await ui.find({ type: 'Text', text: /^After/ }))?.text).toBe('After')
  expect(await ui.find({ type: 'Text', text: /row/ })).toBeUndefined()
  const title = await ui.find({ type: 'Text', text: 'Button moved above the footer' })
  expect(title).toBeDefined()
  // 120 columns hold two panels of 55, 2 + 55 + 4 + 55 = 116 with 4 to spare; 800x500 at half-height cells is 18 rows.
  const image = await ui.find({ type: 'Image', alt: /^After/ } as never)
  expect(image?.props).toMatchObject({ columns: 55, rows: 17 })
  await ui.unmount()
})

test('clicking a recording\'s picture opens the original in the default player', async ($, on) => {
  const ran: string[][] = []
  on('fs.stat', () => ({ value: { kind: 'file', size: 1000, mtimeMs: 7, isSymlink: false } }))
  on('fs.read', (_, e) => {
    const path = (e as { path: string }).path
    return { value: { base64: PNG_800x500 } }
  })
  on('process.run', (_, e) => {
    ran.push([...(e as { argv: string[] }).argv])
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })

  const ui = await $.ui.mount({
    ...ROW,
    props: { ...ROW.props, input: { title: 'Flow', before: ['/tmp/b.png'], after: ['/tmp/flow.mp4'] } },
  } as never)

  expect((await ui.find({ type: 'Text', text: /^After/ }))?.text).toBe('After')
  expect(await ui.find({ type: 'Client', key: 'play-Before' } as never)).toBeUndefined()
  // The click region covers the whole 55x17 picture.
  expect((await ui.find({ type: 'Client', key: 'play-After' } as never))?.props).toMatchObject({ width: 55, height: 17 })
  // A right click or a press without a release plays nothing.
  await ui.pointer({ type: 'up', button: 'right', x: 28, y: 9, in: 'play-After' } as never)
  await ui.pointer({ type: 'down', button: 'left', x: 28, y: 9, in: 'play-After' } as never)
  expect(ran).toEqual([])
  await ui.pointer({ type: 'up', button: 'left', x: 28, y: 9, in: 'play-After' } as never)
  expect(ran).toEqual([['open', '/tmp/flow.mp4']])
  await ui.unmount()
})

test('Play converts a GIF to an MP4 before opening it', async ($, on) => {
  const ran: string[][] = []
  const made = new Set<string>()
  on('fs.stat', (_, e) => {
    const path = (e as { path: string }).path
    if (path.endsWith('/play.mp4') && !made.has(path)) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 1000, mtimeMs: 7, isSymlink: false } }
  })
  on('fs.read', (_, e) => {
    const path = (e as { path: string }).path
    return { value: { base64: PNG_800x500 } }
  })
  on('fs.write', () => ({ value: {} }))
  on('process.run', (_, e) => {
    const argv = [...(e as { argv: string[] }).argv]
    ran.push(argv)
    if (argv[0] === 'ffmpeg') made.add(argv[argv.length - 1]!)
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })

  const ui = await $.ui.mount({ ...ROW, props: { ...ROW.props, input: { after: ['/tmp/flow.gif'] } } } as never)
  await ui.pointer({ type: 'up', button: 'left', x: 1, y: 1, in: 'play-After' } as never)
  await ui.pointer({ type: 'up', button: 'left', x: 40, y: 12, in: 'play-After' } as never)

  const opens = ran.filter(argv => argv[0] === 'open')
  expect(ran.filter(argv => argv[0] === 'ffmpeg').length).toBe(1)
  expect(opens.length).toBe(2)
  expect(opens[0]?.[1]).toMatch(/^\/tmp\/proof-viewer\/[0-9a-f]{16}\/play\.mp4$/)
  await ui.unmount()
})

test('the full transcript keeps the call\'s own row', async ($, on) => {
  on('fs.read', () => ({ value: { base64: PNG_800x500 } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })

  const ui = await $.ui.mount({ ...ROW, props: { ...ROW.props, isExpanded: true } } as never)

  expect((await ui.find({ type: 'Text', text: /row/ }))?.text).toBe('row')
  expect(await ui.find({ type: 'Text', text: /^After/ })).toBeDefined()
  await ui.unmount()
})

test('the result line under the pictures is hidden outside the full transcript', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>Showing after to the user under this call.</Text>
  })
  const result = {
    plugin: 'proof-viewer',
    component: 'ToolResult',
    requestId: 'toolu_1',
    surface: 'terminal',
    props: { tool_use_id: 'toolu_1', tool: TOOL, output: 'Showing after to the user under this call.', isErrored: false },
  }

  const hidden = await $.ui.mount(result as never)
  expect(await hidden.find({ type: 'Text', text: /Showing/ })).toBeUndefined()
  await hidden.unmount()

  const shown = await $.ui.mount({ ...result, props: { ...result.props, isExpanded: true } } as never)
  expect(await shown.find({ type: 'Text', text: /Showing/ })).toBeDefined()
  await shown.unmount()
})
