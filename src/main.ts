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

const app = new WatercolorScene(canvas, preset)
app.init().catch((error) => {
  console.error(error)
})
