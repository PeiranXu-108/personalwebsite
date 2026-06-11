import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const celestialSource = readFileSync(new URL('../src/layers/celestial.ts', import.meta.url), 'utf8')
const sceneSource = readFileSync(new URL('../src/core/WatercolorScene.ts', import.meta.url), 'utf8')

test('celestial layer module defines moon, star, and firefly factories', () => {
  assert.match(celestialSource, /createMoonMaterial/)
  assert.match(celestialSource, /createStarsMaterial/)
  assert.match(celestialSource, /createFireflyField/)
  assert.match(celestialSource, /uTwinkleStrength/)
  assert.match(celestialSource, /desktopCount/)
})

test('core scene mounts celestial layers before and after the retained cloud and grass layers', () => {
  assert.match(sceneSource, /private addCelestialBackdrop\(\)/)
  assert.match(sceneSource, /private addFireflies\(\)/)
  assert.match(sceneSource, /this\.addCelestialBackdrop\(\)/)
  assert.match(sceneSource, /this\.addCloudLayers\(\)/)
  assert.match(sceneSource, /this\.addFireflies\(\)/)
})
