import type { ClientModule } from 'claude-code'

// An empty region laid over a recording's picture: it draws nothing, so the
// picture shows through, and a left click on it asks the hooks module to play.
const PlayArea: ClientModule<{ path: string }> = (props, surface) => {
  surface.onPointer(event => {
    if (event.type === 'up' && event.button === 'left') surface.post({ play: props.path })
  })
  const { Box } = surface.elements
  return <Box />
}

export default PlayArea
