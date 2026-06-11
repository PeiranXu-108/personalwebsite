import test from 'node:test'
import assert from 'node:assert/strict'

import { nightPreset } from '../src/presets/night.ts'

test('night preset removes clouds while keeping grass and celestial layers', () => {
  assert.equal(nightPreset.id, 'night')
  assert.equal(nightPreset.cloudVisualLayers.length, 0)
  assert.ok(nightPreset.grass)
  assert.ok(nightPreset.celestial.moon.enabled)
  assert.ok(nightPreset.celestial.stars.enabled)
  assert.ok(nightPreset.celestial.fireflies.enabled)
})

test('night preset uses a darker firefly-led palette', () => {
  assert.equal(nightPreset.celestial.stars.density, 0.82)
  assert.equal(nightPreset.celestial.fireflies.desktopCount, 118)
  assert.match(nightPreset.clearColor, /^#101b3e$/)
  assert.match(nightPreset.cssBackground, /rgba\(199, 219, 255, 0\.16\).*transparent 18%/)
  assert.equal(nightPreset.sky.upperColor, '#1a2a50')
  assert.equal(nightPreset.sky.horizonColor, '#5f78a8')
  assert.equal(nightPreset.sky.warmColor, '#9fb9e8')
  assert.equal(nightPreset.sky.warmStrength, 0.04)
  assert.equal(nightPreset.grass.bladeHighlightColor, '#84a98d')
  assert.equal(nightPreset.grass.baseGlowColor, '#405f4c')
  assert.equal(nightPreset.celestial.moon.haloRadius, 0.24)
  assert.equal(nightPreset.celestial.moon.haloColor, '#8faee5')
  assert.equal(nightPreset.celestial.moon.haloStrength, 0.22)
  assert.equal(nightPreset.celestial.moon.opacity, 0.94)
  assert.equal(nightPreset.celestial.fireflies.mobileCount, 56)
  assert.equal(nightPreset.celestial.fireflies.color, '#fff7b8')
  assert.equal(nightPreset.celestial.fireflies.glowColor, '#ffc85f')
  assert.equal(nightPreset.celestial.fireflies.opacity, 1)
  assert.equal(nightPreset.celestial.fireflies.grassLightColor, '#ffd16a')
  assert.equal(nightPreset.celestial.fireflies.grassLightOpacity, 0.38)
  assert.equal(nightPreset.celestial.fireflies.grassLightScale, 3.15)
})

test('night preset does not add an in-canvas scene switcher', () => {
  assert.equal(nightPreset.switcher, undefined)
})
