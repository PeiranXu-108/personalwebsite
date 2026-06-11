import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const presetSource = readFileSync(new URL('../src/presets/sunrise.ts', import.meta.url), 'utf8')
const layerSource = readFileSync(new URL('../src/layers/clouds.ts', import.meta.url), 'utf8')

test('scene configures a slow volumetric low cloud sea', () => {
  assert.match(presetSource, /billowDepth: 0\.42/)
  assert.match(presetSource, /rollStrength: 0\.34/)
  assert.match(presetSource, /horizonWeight: 0\.92/)
  assert.match(layerSource, /uBillowDepth/)
  assert.match(layerSource, /uRollStrength/)
  assert.match(layerSource, /uHorizonWeight/)
  assert.match(layerSource, /uMotionScale/)
  assert.match(layerSource, /slowRoll/)
  assert.match(layerSource, /backLight/)
  assert.match(layerSource, /uMotionScale: \{ value: reduceMotion \? 0\.34 : 1 \}/)
})
