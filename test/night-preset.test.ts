import test from 'node:test'
import assert from 'node:assert/strict'

import { nightPreset } from '../src/presets/night.ts'

test('night preset keeps clouds and grass while enabling celestial layers', () => {
  assert.equal(nightPreset.id, 'night')
  assert.equal(nightPreset.cloudVisualLayers.length, 4)
  assert.ok(nightPreset.grass)
  assert.ok(nightPreset.celestial.moon.enabled)
  assert.ok(nightPreset.celestial.stars.enabled)
  assert.ok(nightPreset.celestial.fireflies.enabled)
})

test('night preset uses a brighter dreamy moonlit palette', () => {
  assert.equal(nightPreset.celestial.stars.density, 0.82)
  assert.equal(nightPreset.celestial.fireflies.desktopCount, 170)
  assert.match(nightPreset.clearColor, /^#101b3e$/)
  assert.match(nightPreset.cssBackground, /radial-gradient/)
})

test('night preset does not add an in-canvas scene switcher', () => {
  assert.equal(nightPreset.switcher, undefined)
})
