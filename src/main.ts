import './styles.css'

import { WatercolorScene } from './core/WatercolorScene.ts'
import { getScenePreset } from './presets/sceneRegistry.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')

if (!canvas) {
  throw new Error('Scene canvas not found')
}

const preset = getScenePreset(new URLSearchParams(window.location.search))
document.title = preset.metadata.title
document.querySelector('main')?.setAttribute('aria-label', preset.metadata.mainAriaLabel)
canvas.setAttribute('aria-label', preset.metadata.canvasAriaLabel)
document.documentElement.style.setProperty('--scene-background', preset.clearColor)
document.body.style.background = preset.cssBackground
setupSoftCursor()

const app = new WatercolorScene(canvas, preset)
app.init().catch((error) => {
  console.error(error)
})

function setupSoftCursor() {
  const coarsePointer = window.matchMedia('(pointer: coarse)')
  if (coarsePointer.matches) return

  const softCursor = document.createElement('div')
  softCursor.className = 'soft-cursor'
  softCursor.setAttribute('aria-hidden', 'true')
  document.body.append(softCursor)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let targetX = window.innerWidth / 2
  let targetY = window.innerHeight / 2
  let currentX = targetX
  let currentY = targetY
  let hasPointer = false

  const showAtPointer = (event: PointerEvent) => {
    targetX = event.clientX
    targetY = event.clientY

    if (!hasPointer) {
      currentX = targetX
      currentY = targetY
      hasPointer = true
      softCursor.classList.add('is-visible')
      softCursor.style.opacity = '1'
    }
  }

  const hideSoftCursor = () => {
    hasPointer = false
    softCursor.classList.remove('is-visible')
    softCursor.style.opacity = '0'
  }

  const hideWhenLeavingWindow = (event: PointerEvent) => {
    if (!event.relatedTarget) hideSoftCursor()
  }

  const renderSoftCursor = () => {
    const followEase = reducedMotion.matches ? 1 : 0.18
    currentX += (targetX - currentX) * followEase
    currentY += (targetY - currentY) * followEase

    softCursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`
    scheduleSoftCursorFrame()
  }

  const scheduleSoftCursorFrame = () => {
    window.setTimeout(renderSoftCursor, 16)
  }

  window.addEventListener('pointermove', showAtPointer, { passive: true })
  window.addEventListener('pointerout', hideWhenLeavingWindow, { passive: true })
  window.addEventListener('blur', hideSoftCursor)
  scheduleSoftCursorFrame()
}
