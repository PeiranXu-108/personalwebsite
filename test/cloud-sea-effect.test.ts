import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')

test('scene configures a slow volumetric low cloud sea', () => {
  assert.match(source, /billowDepth: 0\.42/)
  assert.match(source, /rollStrength: 0\.34/)
  assert.match(source, /horizonWeight: 0\.92/)
  assert.match(source, /uBillowDepth/)
  assert.match(source, /uRollStrength/)
  assert.match(source, /uHorizonWeight/)
  assert.match(source, /uMotionScale/)
  assert.match(source, /slowRoll/)
  assert.match(source, /backLight/)
  assert.match(source, /material\.uniforms\.uMotionScale\.value = reduceMotion \? 0\.34 : 1/)
})
